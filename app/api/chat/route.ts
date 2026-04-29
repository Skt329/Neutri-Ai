import { convertToModelMessages, generateText, stepCountIs, streamText, type UIMessage } from "ai"
import { nimChatModel } from "@/lib/ai/nim-provider"
import { NextResponse } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { buildTools } from "@/lib/ai/tools"
import { buildSystemPrompt } from "@/lib/ai/system-prompt"
import { retrieveMemories } from "@/lib/ai/memory"
import type { NutritionTargets, Profile } from "@/lib/types"
import { sumTotals } from "@/lib/nutrition"
import { computeStreakInfo } from "@/lib/streaks"
import { computeMealGap } from "@/lib/meal-gaps"

// Use Node.js runtime for more reliable Supabase connectivity.
// Edge runtime has stricter fetch timeout behavior that causes
// ConnectTimeoutError on slow/intermittent connections.
export const runtime = "nodejs"

async function generateConversationTitle(userText: string, assistantText: string): Promise<string | null> {
  try {
    const { text } = await generateText({
      model: nimChatModel,
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

  const streakSince = new Date(Date.now() - 45 * 24 * 3600 * 1000).toISOString()
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
  const system = buildSystemPrompt({
    profile,
    targets,
    memories,
    dailyTotals: totals,
    currentDateISO: now.toISOString(),
    streak,
    mealGapHours: gap?.hours ?? null,
  })

  const tools = buildTools(supabase, user.id)

  const result = streamText({
    // NVIDIA NIM: Llama 3.3 70B Instruct — native tool calling, fast, reliable.
    model: nimChatModel,
    maxOutputTokens: 4096,
    system,
    messages: await convertToModelMessages(messages),
    tools,
    stopWhen: stepCountIs(12),
    onError: ({ error }) => {
      console.log("[chat] streamText error:", error)
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
      // DEBUG: log what the model produced
      console.log("[chat] onFinish — message count:", finishedMessages.length)
      for (const m of finishedMessages) {
        console.log(`[chat]   role=${m.role}, parts=${m.parts.length}:`, m.parts.map((p: any) => ({
          type: p.type,
          text: p.type === "text" ? p.text?.substring(0, 80) : undefined,
          toolName: p.toolInvocation?.toolName ?? p.toolName,
          state: p.toolInvocation?.state ?? p.state,
        })))
      }
      try {
        // Persist the last user message + all new assistant/tool messages.
        // We rewrite the full conversation messages list for simplicity (small volumes here).
        await supabase.from("messages").delete().eq("conversation_id", conversationId)
        const rows = finishedMessages.map((m) => ({
          conversation_id: conversationId,
          user_id: user.id,
          role: m.role,
          parts: m.parts as unknown,
        }))
        if (rows.length > 0) {
          await supabase.from("messages").insert(rows)
        }
        const assistantText = finishedMessages
          .filter((m) => m.role === "assistant")
          .map((m) => messageToText(m))
          .join("\n")
          .trim()

        // Auto-generate a title on the first successful exchange, like ChatGPT/Claude.
        const convoUpdate: { updated_at: string; title?: string } = {
          updated_at: new Date().toISOString(),
        }
        if (!existingTitle && (lastUserText || assistantText)) {
          const title = await generateConversationTitle(lastUserText, assistantText)
          if (title) convoUpdate.title = title
        }
        await supabase.from("conversations").update(convoUpdate).eq("id", conversationId)

        // Memory extraction is now handled by the deferred cron job
        // (POST /api/cron/extract-memories) — no inline extraction here.
      } catch (e) {
        console.log("[v0] Failed to persist messages", e)
      }
    },
  })
}
