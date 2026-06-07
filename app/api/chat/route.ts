import { convertToModelMessages, hasToolCall, stepCountIs, streamText, type UIMessage } from "ai"
import { azureChatModel } from "@/lib/ai/azure-provider"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildTools, buildSwiggySmartTools } from "@/lib/ai/tools"
import { CLIENT_TOOL_NAMES } from "@/lib/ai/tools/client-tool-names"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { getValidToken, getSwiggyConnectionStatus } from "@/lib/swiggy/mcp/token-manager"
import { getSwiggyMCPTools } from "@/lib/swiggy/mcp/client"
import { limitChat, trackTokenUsage } from "@/lib/redis"
import { ChatRequestSchema } from "@/lib/validation/api-schemas"
import { parseBody, apiError } from "@/lib/validation/with-validation"
import { truncateMessages } from "@/lib/ai/context-manager"
import { createRequestLogger } from "@/lib/logger"
import { loadChatContext } from "@/lib/ai/chat-context"
import { persistMessages } from "@/lib/ai/chat-persistence"
import { messageToText } from "@/lib/ai/utils"
import { invalidateMealCache, invalidateProfileCache, invalidateTargetsCache } from "@/lib/ai/context-cache"
import type { ToolSet } from "ai"

export const runtime = "nodejs"
export const maxDuration = 60

// ── Helpers ──────────────────────────────────────────────────────────────────

/** Authenticate with a fast retry (300ms instead of 1s). */
async function authenticateUser(
  supabase: Awaited<ReturnType<typeof createClient>>,
  log: ReturnType<typeof createRequestLogger>,
) {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await supabase.auth.getUser()
      return data.user
    } catch (err) {
      log.warn("chat", `auth.getUser() attempt ${attempt + 1} failed`, {
        error: err instanceof Error ? err.message : String(err),
      })
      if (attempt === 1) return null
      await new Promise((r) => setTimeout(r, 300))
    }
  }
  return null
}

// ── Swiggy MCP setup ─────────────────────────────────────────────────────────

/** Load Swiggy tools with a tight 3s timeout to avoid blocking the request. */
async function loadSwiggyTools(
  supabase: Awaited<ReturnType<typeof createClient>>,
  userId: string,
  log: ReturnType<typeof createRequestLogger>,
) {
  let swiggyTools: ToolSet = {}
  let swiggyConnected = false
  let swiggyExpiringSoon = false
  let swiggyCleanup: (() => Promise<void>) | null = null

  try {
    const swiggyToken = await getValidToken(supabase, userId)
    if (swiggyToken) {
      swiggyConnected = true
      // Run status + MCP discovery in parallel
      const [swiggyStatus, mcpResult] = await Promise.all([
        getSwiggyConnectionStatus(supabase, userId),
        Promise.race([
          getSwiggyMCPTools(swiggyToken),
          new Promise<never>((_, reject) =>
            setTimeout(() => reject(new Error("MCP discovery timeout (3s)")), 3000),
          ),
        ]),
      ])
      swiggyExpiringSoon = swiggyStatus.expiringSoon
      swiggyTools = mcpResult.tools
      swiggyCleanup = mcpResult.cleanup
      log.info("chat", `Swiggy MCP: ${Object.keys(mcpResult.tools).length} tools loaded`)
      if (mcpResult.errors.length > 0) {
        log.warn("chat", "Swiggy MCP partial failures", { errors: mcpResult.errors })
      }
    }
  } catch (err) {
    log.warn("chat", "Swiggy MCP init failed (non-blocking)", {
      error: err instanceof Error ? err.message : String(err),
    })
  }

  return { swiggyTools, swiggyConnected, swiggyExpiringSoon, swiggyCleanup }
}

// ── Main handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const requestId = crypto.randomUUID().slice(0, 8)
  const log = createRequestLogger(requestId)
  const supabase = await createClient()

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ PHASE 1: Auth + Body parse run in parallel (independent of each other)║
  // ╚════════════════════════════════════════════════════════════════════════╝
  const [user, parsed] = await Promise.all([
    authenticateUser(supabase, log),
    parseBody(req, ChatRequestSchema),
  ])

  if (!user) return apiError("Unauthorized", "UNAUTHORIZED", 401)
  if (parsed instanceof NextResponse) return parsed
  const { messages, conversationId } = parsed as { messages: UIMessage[]; conversationId: string }

  // Extract user text early (needed by context loader, costs nothing)
  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
  const lastUserText = lastUserMessage ? messageToText(lastUserMessage) : ""

  // ╔════════════════════════════════════════════════════════════════════════╗
  // ║ PHASE 2: All independent DB/cache lookups run in parallel             ║
  // ║  - Rate limiting                                                      ║
  // ║  - Conversation ownership check                                       ║
  // ║  - Chat context (profile, targets, totals, streak, memories)          ║
  // ║  - Swiggy MCP discovery                                               ║
  // ╚════════════════════════════════════════════════════════════════════════╝
  const [ratelimit, convoResult, ctx, swiggyResult] = await Promise.all([
    limitChat(user.id),
    supabase
      .from("conversations")
      .select("id, title")
      .eq("id", conversationId)
      .eq("user_id", user.id)
      .maybeSingle(),
    loadChatContext(supabase, user.id, lastUserText),
    loadSwiggyTools(supabase, user.id, log),
  ])

  // ── Validate phase 2 results ──
  if (!ratelimit.success) {
    return apiError("Too many requests. Please wait a moment.", "RATE_LIMITED", 429)
  }

  const { data: convo, error: convErr } = convoResult
  if (convErr || !convo) return apiError("Conversation not found", "NOT_FOUND", 404)
  const existingTitle = convo.title as string | null

  if (ctx.cacheHits > 0) {
    log.debug("chat", `Context cache: ${ctx.cacheHits}/5 hits`)
  }

  const { swiggyTools, swiggyConnected, swiggyExpiringSoon, swiggyCleanup } = swiggyResult

  // ── Build system prompt ──
  const system = buildSystemPrompt({
    profile: ctx.profile,
    targets: ctx.targets,
    memories: ctx.memories,
    dailyTotals: ctx.totals,
    currentDateISO: new Date().toISOString(),
    streak: ctx.streak,
    mealGapHours: ctx.gap?.hours ?? null,
    swiggyConnected,
    swiggyExpiringSoon,
  })

  // ── Build tools ──
  const coreTools = buildTools(supabase, user.id, { timezone: ctx.profile?.timezone })
  if (swiggyConnected) {
    delete (coreTools as Record<string, unknown>).swiggy_search
    delete (coreTools as Record<string, unknown>).swiggy_get_menu
    delete (coreTools as Record<string, unknown>).swiggy_place_order
  }

  const preloadedCtx = {
    profile: ctx.profile
      ? {
          dietary_preferences: ctx.profile.dietary_preferences ?? [],
          allergies: ctx.profile.allergies ?? [],
          health_conditions: ctx.profile.health_conditions ?? [],
        }
      : null,
    targets: ctx.targets
      ? {
          calories: ctx.targets.calories,
          protein_g: ctx.targets.protein_g,
          carbs_g: ctx.targets.carbs_g,
          fat_g: ctx.targets.fat_g,
        }
      : null,
    dailyTotals: ctx.totals,
  }

  const tools = {
    ...coreTools,
    ...(swiggyConnected ? buildSwiggySmartTools(supabase, user.id, preloadedCtx) : {}),
    ...swiggyTools,
  }

  // ── Stream ──
  const result = streamText({
    model: azureChatModel,
    maxOutputTokens: 2048,
    system,
    messages: await convertToModelMessages(truncateMessages(messages)),
    tools,
    stopWhen: [...CLIENT_TOOL_NAMES.map((n) => hasToolCall(n)), stepCountIs(6)],
    experimental_telemetry: {
      isEnabled: true,
      functionId: "neutri-chat",
      metadata: { userId: user.id, conversationId },
    },
    onError: ({ error }) => {
      log.error("chat", "streamText error", { error: error instanceof Error ? error.message : String(error) })
    },
    onStepFinish: ({ toolCalls, toolResults, text }) => {
      log.debug("chat", "step finished", {
        textLength: text?.length ?? 0,
        toolCalls: toolCalls?.map((tc) => ({ name: tc?.toolName, id: tc?.toolCallId })),
        toolResults: toolResults?.map((tr) => ({ name: tr?.toolName, id: tr?.toolCallId, hasResult: tr && 'result' in tr ? !!tr.result : false })),
      })

      if (toolCalls) {
        for (const tc of toolCalls) {
          if (!tc) continue
          if (tc.toolName === "log_meal" || tc.toolName === "delete_meal") {
            invalidateMealCache(user.id).catch((err) =>
              log.warn("chat", "Failed to invalidate meal cache", { error: err instanceof Error ? err.message : String(err) }),
            )
          } else if (tc.toolName === "update_profile") {
            invalidateProfileCache(user.id).catch((err) =>
              log.warn("chat", "Failed to invalidate profile cache", { error: err instanceof Error ? err.message : String(err) }),
            )
          } else if (tc.toolName === "set_targets") {
            invalidateTargetsCache(user.id).catch((err) =>
              log.warn("chat", "Failed to invalidate targets cache", { error: err instanceof Error ? err.message : String(err) }),
            )
          }
        }
      }
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    async onFinish({ messages: finishedMessages }) {
      try {
        // Track token usage (fire-and-forget)
        Promise.resolve(result.totalUsage).then((usage) => {
          if (usage) {
            trackTokenUsage(user.id, {
              promptTokens: usage.inputTokens ?? 0,
              completionTokens: usage.outputTokens ?? 0,
              totalTokens: (usage.inputTokens ?? 0) + (usage.outputTokens ?? 0),
            }).catch((err) =>
              log.warn("chat", "Token tracking failed (non-blocking)", { error: err instanceof Error ? err.message : String(err) }),
            )
          }
        }).catch((err) =>
          log.warn("chat", "Failed to resolve token usage", { error: err instanceof Error ? err.message : String(err) }),
        )

        // Persist messages
        await persistMessages({
          supabase, userId: user.id, conversationId, existingTitle,
          messages, finishedMessages, log,
        })
      } catch (e) {
        log.error("chat", "Failed to persist messages", { error: e instanceof Error ? e.message : String(e) })
      } finally {
        if (swiggyCleanup) {
          swiggyCleanup().catch((err) =>
            log.warn("chat", "Swiggy MCP cleanup failed", { error: err instanceof Error ? err.message : String(err) }),
          )
        }
      }
    },
  })
}
