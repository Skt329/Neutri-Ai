import { convertToModelMessages, generateText, hasToolCall, stepCountIs, streamText, type UIMessage } from "ai"
import { azureChatModel } from "@/lib/ai/azure-provider"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildTools, buildSwiggySmartTools, CLIENT_TOOL_NAMES } from "@/lib/ai/tools"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { retrieveMemories } from "@/lib/ai/memory"
import type { NutritionTargets, Profile } from "@/lib/types"
import { sumTotals } from "@/lib/nutrition"
import { computeStreakInfo } from "@/lib/streaks"
import { computeMealGap } from "@/lib/meal-gaps"
import { getValidToken, getSwiggyConnectionStatus } from "@/lib/swiggy/mcp/token-manager"
import { getSwiggyMCPTools } from "@/lib/swiggy/mcp/client"

// Use Node.js runtime for more reliable Supabase connectivity.
// Edge runtime has stricter fetch timeout behavior that causes
// ConnectTimeoutError on slow/intermittent connections.
export const runtime = "nodejs"

// ── Rate limiting (in-memory sliding window for serverless) ──────────
// Keyed by userId → array of timestamps. Cleaned up per-request.
const rateLimitMap = new Map<string, number[]>()
const RATE_LIMIT_WINDOW_MS = 60_000 // 1 minute
const RATE_LIMIT_MAX = 20 // max 20 requests per minute per user

function checkRateLimit(userId: string): boolean {
  const now = Date.now()
  const timestamps = rateLimitMap.get(userId) ?? []
  // Remove entries older than the window
  const valid = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (valid.length >= RATE_LIMIT_MAX) {
    rateLimitMap.set(userId, valid)
    return false // rate limited
  }
  valid.push(now)
  rateLimitMap.set(userId, valid)
  return true
}

async function generateConversationTitle(userText: string, assistantText: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: azureChatModel,
      maxOutputTokens: 32,
      prompt:
        "Create a short, specific chat title (3 to 6 words, no quotes, no punctuation at the end, Title Case). " +
        "Base it on the user's intent from this exchange.\n\n" +
        `User: ${userText.slice(0, 500)}\n` +
        `Assistant: ${assistantText.slice(0, 500)}`,
    })
    const clean = text.replace(/["'`]/g, "").replace(/[.!?,:;\s]+$/g, "").trim()
    return clean ? clean.slice(0, 60) : null
  } catch {
    return null
  }
}

function messageToText(m: UIMessage): string {
  if (!m.parts || !Array.isArray(m.parts)) return ""
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim()
}

export const maxDuration = 60

export async function POST(req: Request) {
  const supabase = await createClient()

  // Retry auth once if the first attempt times out (transient network issues)
  let user = null
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const { data } = await supabase.auth.getUser()
      user = data.user
      break
    } catch (err) {
      console.warn(`[chat] auth.getUser() attempt ${attempt + 1} failed:`, err instanceof Error ? err.message : err)
      if (attempt === 1) {
        return NextResponse.json(
          { error: "Authentication timed out. Please refresh and try again." },
          { status: 503 },
        )
      }
      // Brief pause before retry
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

  // ── Rate limit check ──
  if (!checkRateLimit(user.id)) {
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment before sending another message." },
      { status: 429 },
    )
  }

  const body = (await req.json()) as { messages: UIMessage[]; conversationId: string }
  const { messages, conversationId } = body
  if (!conversationId) return NextResponse.json({ error: "conversationId required" }, { status: 400 })

  // Verify the conversation belongs to the user (RLS would block inserts otherwise, but fail fast)
  const { data: convo, error: convErr } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", conversationId)
    .eq("user_id", user.id)
    .maybeSingle()
  if (convErr || !convo) return NextResponse.json({ error: "Conversation not found" }, { status: 404 })
  const existingTitle = convo.title as string | null

  // Load context in parallel
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
  const lastUserText = lastUserMessage ? messageToText(lastUserMessage) : ""

  // 8-day window is sufficient for streak computation (consecutive days).
  // The original 45-day scan fetched hundreds of unnecessary rows.
  const streakSince = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()
  const [
    { data: profile },
    { data: targets },
    { data: todayMeals },
    { data: streakMeals },
    vectorMemories,
  ] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle<NutritionTargets>(),
    supabase
      .from("meal_logs")
      .select("logged_at, calories, protein_g, carbs_g, fat_g, fiber_g")
      .eq("user_id", user.id)
      .gte("logged_at", dayStart),
    supabase
      .from("meal_logs")
      .select("logged_at")
      .eq("user_id", user.id)
      .gte("logged_at", streakSince),
    retrieveMemories({ userId: user.id, query: lastUserText, limit: 6 }),
  ])

  // Fallback: if the vector search returned nothing (e.g. no embeddings yet),
  // surface the most recent memories so the assistant still has long-term context.
  let memories: Array<{ content: string }> = vectorMemories.map((content) => ({ content }))
  if (memories.length === 0) {
    const { data: recent } = await supabase
      .from("memories")
      .select("content")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10)
    memories = recent ?? []
  }

  const totals = sumTotals(todayMeals ?? [])
  const streak = computeStreakInfo(
    (streakMeals ?? []).map((m) => m.logged_at),
    profile?.timezone || "UTC",
  )
  const gap = computeMealGap(
    (todayMeals ?? []).map((m) => ({
      id: "",
      user_id: user.id,
      logged_at: m.logged_at,
      meal_type: null,
      description: "",
      calories: m.calories ?? 0,
      protein_g: m.protein_g ?? 0,
      carbs_g: m.carbs_g ?? 0,
      fat_g: m.fat_g ?? 0,
      fiber_g: m.fiber_g ?? 0,
      items: [],
      source: "chat",
      created_at: "",
    })),
    now,
  )
  // ── Swiggy MCP integration (conditional) ──
  let swiggyTools: Record<string, any> = {}
  let swiggyConnected = false
  let swiggyExpiringSoon = false
  let swiggyCleanup: (() => Promise<void>) | null = null
  try {
    const swiggyToken = await getValidToken(supabase, user.id)
    if (swiggyToken) {
      swiggyConnected = true
      const swiggyStatus = await getSwiggyConnectionStatus(supabase, user.id)
      swiggyExpiringSoon = swiggyStatus.expiringSoon
      // MCP discovery with 8s timeout to prevent blocking on slow Swiggy servers
      const mcpResult = await Promise.race([
        getSwiggyMCPTools(swiggyToken),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error("MCP discovery timeout (8s)")), 8000),
        ),
      ])
      swiggyTools = mcpResult.tools
      swiggyCleanup = mcpResult.cleanup
      console.log(`[chat] Swiggy MCP: ${Object.keys(mcpResult.tools).length} tools loaded`)
      if (mcpResult.errors.length > 0) {
        console.warn("[chat] Swiggy MCP partial failures:", mcpResult.errors)
      }
    }
  } catch (err) {
    console.warn("[chat] Swiggy MCP init failed (non-blocking):", err instanceof Error ? err.message : err)
  }

  const system = buildSystemPrompt({
    profile,
    targets,
    memories,
    dailyTotals: totals,
    currentDateISO: now.toISOString(),
    streak,
    mealGapHours: gap?.hours ?? null,
    swiggyConnected,
    swiggyExpiringSoon,
  })

  // Build core tools — when MCP is connected, exclude legacy adapter tools (MCP supersedes them)
  const coreTools = buildTools(supabase, user.id)
  if (swiggyConnected) {
    delete (coreTools as Record<string, unknown>).swiggy_search
    delete (coreTools as Record<string, unknown>).swiggy_get_menu
    delete (coreTools as Record<string, unknown>).swiggy_place_order
  }

  // Pre-loaded dietary context for smart tools (avoids redundant DB queries)
  const preloadedCtx = {
    profile: profile
      ? {
          dietary_preferences: profile.dietary_preferences ?? [],
          allergies: profile.allergies ?? [],
          health_conditions: profile.health_conditions ?? [],
        }
      : null,
    targets: targets
      ? {
          calories: targets.calories,
          protein_g: targets.protein_g,
          carbs_g: targets.carbs_g,
          fat_g: targets.fat_g,
        }
      : null,
    dailyTotals: totals,
  }

  const tools = {
    ...coreTools,
    ...(swiggyConnected ? buildSwiggySmartTools(supabase, user.id, preloadedCtx) : {}),
    ...swiggyTools,
  }

  const result = streamText({
    // Azure OpenAI: GPT-4.1 mini — native tool calling, parallel tool calls, structured output.
    model: azureChatModel,
    maxOutputTokens: 4096,
    system,
    messages: await convertToModelMessages(messages),
    tools,
    // Stop the multi-step loop when a client tool is called (no execute fn)
    // OR after 12 server-side steps (safety limit against infinite loops).
    stopWhen: [...CLIENT_TOOL_NAMES.map((n) => hasToolCall(n)), stepCountIs(12)],
    // Vercel AI SDK built-in telemetry (OpenTelemetry compatible)
    experimental_telemetry: {
      isEnabled: true,
      functionId: "neutri-chat",
      metadata: {
        userId: user.id,
        conversationId,
      },
    },
    onError: ({ error }) => {
      console.error("[chat] streamText error:", error)
    },
    onStepFinish: ({ toolCalls, toolResults, text }) => {
      console.log("[chat] step finished:", {
        textLength: text?.length ?? 0,
        toolCalls: toolCalls?.map((tc: any) => ({ name: tc.toolName, id: tc.toolCallId })),
        toolResults: toolResults?.map((tr: any) => ({ name: tr.toolName, id: tr.toolCallId, hasResult: !!tr.result })),
      })
    },
  })

  return result.toUIMessageStreamResponse({
    originalMessages: messages,
    async onFinish({ messages: finishedMessages }) {
      try {
        const { count, data: ordinalRow } = await supabase
          .from("messages")
          .select("ordinal", { count: "exact", head: false })
          .eq("conversation_id", conversationId)
          .order("ordinal", { ascending: false })
          .limit(1)

        const savedCount = count ?? 0
        const maxOrdinal = ordinalRow?.[0]?.ordinal ?? -1
        const newMessages = finishedMessages.slice(savedCount)

        if (newMessages.length > 0) {
          const rows = newMessages.map((m, i) => ({
            conversation_id: conversationId,
            user_id: user.id,
            role: m.role,
            parts: m.parts as unknown,
            ordinal: maxOrdinal + 1 + i,
          }))
          const { error: insertErr } = await supabase.from("messages").insert(rows)
          if (insertErr) {
            console.error("[chat] Failed to insert new messages:", insertErr.message)
          }
        }

        // Update last pre-existing message if its parts have grown
        // (e.g. tool output + follow-up text added after user confirmation)
        if (savedCount > 0 && finishedMessages.length >= savedCount) {
          const lastPreExisting = finishedMessages[savedCount - 1]
          const hasToolParts = lastPreExisting.parts.some(
            (p) => p.type === "tool-invocation" || (p.type.startsWith("tool-") && p.type !== "tool-invocation"),
          )
          if (hasToolParts) {
            const { error: updateErr } = await supabase
              .from("messages")
              .update({ parts: lastPreExisting.parts as unknown })
              .eq("conversation_id", conversationId)
              .eq("ordinal", maxOrdinal)
            if (updateErr) {
              console.error("[chat] Failed to update existing message parts:", updateErr.message)
            }
          }
        }

        // ── Update conversation timestamp ──
        await supabase
          .from("conversations")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", conversationId)

        // ── Fire-and-forget title generation (non-blocking) ──
        if (!existingTitle) {
          const assistantText = finishedMessages
            .filter((m) => m.role === "assistant")
            .map((m) => messageToText(m))
            .join("\n")
            .trim()

          if (lastUserText || assistantText) {
            // Don't await — let it run in the background
            generateConversationTitle(lastUserText, assistantText).then((title) => {
              if (title) {
                supabase.from("conversations").update({ title }).eq("id", conversationId).then(() => {})
              }
            }).catch(() => {})
          }
        }

        // Memory extraction is handled by the deferred cron job
        // (POST /api/cron/extract-memories) — no inline extraction here.
      } catch (e) {
        console.error("[chat] Failed to persist messages:", e)
      } finally {
        // Release Swiggy MCP connections after stream is done
        if (swiggyCleanup) {
          swiggyCleanup().catch(() => {})
        }
      }
    },
  })
}
