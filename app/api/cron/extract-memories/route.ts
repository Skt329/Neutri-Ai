import { NextResponse } from "next/server"
import { generateText } from "ai"
import { nimChatModel, nimEmbedBatch } from "@/lib/ai/nim-provider"
import { createAdminClient } from "@/lib/supabase/admin"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 min max for cron jobs

const INACTIVITY_HOURS = 3
const BATCH_LIMIT = 10 // conversations per cron run
const CRON_SECRET = process.env.CRON_SECRET

/**
 * POST /api/cron/extract-memories
 *
 * Deferred memory extraction — runs every 30 min via pg_cron or manual trigger.
 * Finds conversations inactive for 3+ hours, extracts durable facts from the
 * FULL conversation, batch-embeds all memories in 1 API call, and stores them.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 */
export async function POST(req: Request) {
  // Verify cron secret
  const auth = req.headers.get("authorization")
  if (!CRON_SECRET || auth !== `Bearer ${CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const admin = createAdminClient()

  try {
    // 1. Find conversations needing extraction
    const { data: staleConvos, error: queryErr } = await admin.rpc(
      "get_conversations_needing_extraction",
      { inactivity_hours: INACTIVITY_HOURS, batch_limit: BATCH_LIMIT },
    )

    if (queryErr) {
      console.error("[cron/extract-memories] Query failed:", queryErr.message)
      return NextResponse.json({ error: queryErr.message }, { status: 500 })
    }

    if (!staleConvos || staleConvos.length === 0) {
      return NextResponse.json({ processed: 0, message: "No conversations need extraction" })
    }

    console.log(`[cron/extract-memories] Processing ${staleConvos.length} conversations`)

    let totalMemories = 0
    const results: Array<{ conversationId: string; memories: number; error?: string }> = []

    for (const convo of staleConvos) {
      try {
        const count = await processConversation(admin, convo.conversation_id, convo.user_id)
        totalMemories += count
        results.push({ conversationId: convo.conversation_id, memories: count })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        console.error(`[cron/extract-memories] Failed for ${convo.conversation_id}:`, msg)
        results.push({ conversationId: convo.conversation_id, memories: 0, error: msg })
      }
    }

    return NextResponse.json({
      processed: staleConvos.length,
      totalMemories,
      results,
    })
  } catch (err) {
    console.error("[cron/extract-memories] Cron failed:", err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Internal error" },
      { status: 500 },
    )
  }
}

/**
 * Process a single conversation: extract facts → batch embed → store.
 * Returns the number of new memories stored.
 */
async function processConversation(
  admin: ReturnType<typeof createAdminClient>,
  conversationId: string,
  userId: string,
): Promise<number> {
  // 1. Load full conversation text
  const { data: conversationText, error: textErr } = await admin.rpc(
    "get_conversation_text",
    { p_conversation_id: conversationId },
  )

  if (textErr || !conversationText || typeof conversationText !== "string" || !conversationText.trim()) {
    // Mark as extracted even if empty — don't reprocess
    await admin.rpc("mark_conversation_extracted", { p_conversation_id: conversationId })
    return 0
  }

  // 2. Extract durable facts with 1 LLM call over the FULL conversation
  const memories = await extractFactsFromConversation(conversationText)

  if (memories.length === 0) {
    await admin.rpc("mark_conversation_extracted", { p_conversation_id: conversationId })
    return 0
  }

  // 3. Batch embed ALL extracted memories in 1 API call (we need embeddings
  //    for both dedup and storage, so do this before filtering)
  const embeddings = await nimEmbedBatch(memories, "passage")

  // 4. Semantic dedup — check each new memory's embedding against existing
  //    memories via cosine similarity. Skip if similarity > 0.92 (paraphrases).
  //    This catches "lactose intolerant" vs "cannot digest dairy" that text
  //    matching would miss.
  const SIMILARITY_THRESHOLD = 0.92
  const dedupedMemories: Array<{ content: string; embedding: number[] }> = []

  for (let i = 0; i < memories.length; i++) {
    const embedding = embeddings[i]
    const content = memories[i]

    // Check against existing stored memories using vector similarity
    const { data: matches } = await admin.rpc("match_memories_for_user", {
      p_user_id: userId,
      query_embedding: JSON.stringify(embedding),
      match_count: 1,
      similarity_threshold: SIMILARITY_THRESHOLD,
    })

    if (matches && matches.length > 0) {
      // A semantically similar memory already exists — skip
      console.log(
        `[cron/extract-memories] Skipping semantic duplicate: "${content.slice(0, 60)}..." ` +
        `(similar to: "${matches[0].content.slice(0, 60)}...", score: ${matches[0].similarity.toFixed(3)})`,
      )
      continue
    }

    dedupedMemories.push({ content, embedding })
  }

  if (dedupedMemories.length === 0) {
    console.log(`[cron/extract-memories] ${conversationId}: all ${memories.length} memories were semantic duplicates`)
    await admin.rpc("mark_conversation_extracted", { p_conversation_id: conversationId })
    return 0
  }

  // 5. Bulk insert deduplicated memories with their embeddings
  const rows = dedupedMemories.map(({ content, embedding }) => ({
    user_id: userId,
    source: "chat" as const,
    content,
    embedding,
  }))

  const { error: insertErr } = await admin.from("memories").insert(rows)
  if (insertErr) {
    console.error(`[cron/extract-memories] Insert failed for ${conversationId}:`, insertErr.message)
    throw new Error(insertErr.message)
  }

  // 6. Mark conversation as extracted
  await admin.rpc("mark_conversation_extracted", { p_conversation_id: conversationId })

  console.log(
    `[cron/extract-memories] ${conversationId}: extracted ${dedupedMemories.length} new memories ` +
    `(${memories.length - dedupedMemories.length} semantic duplicates skipped)`,
  )
  return dedupedMemories.length
}

/**
 * Extract durable facts from a full conversation using 1 LLM call.
 * Returns an array of memory strings.
 */
async function extractFactsFromConversation(conversationText: string): Promise<string[]> {
  // Truncate very long conversations to avoid token limits
  const truncated = conversationText.slice(0, 12000)

  const { text } = await generateText({
    model: nimChatModel,
    system: `You extract stable, long-term facts about the USER from a full conversation with an AI dietitian.

Rules:
- Only extract DURABLE facts (allergies, conditions, preferences, goals, dislikes, dietary restrictions, routine patterns, family info, cooking habits).
- Ignore ephemeral content (today's meals, mood, one-off questions, small talk).
- Do NOT extract facts about the assistant.
- Each fact must be a complete, standalone sentence.
- Deduplicate — don't repeat the same fact in different words.
- If nothing durable was discussed, return an empty array.

IMPORTANT: Respond with ONLY a JSON array of strings. No markdown, no explanation.
Example: ["User is lactose intolerant", "User prefers South Indian cuisine", "User works out at 6 AM"]
If nothing worth remembering: []`,
    prompt: truncated,
  })

  return parseMemoryResponse(text)
}

/**
 * Parse LLM response into memory strings. Handles multiple formats robustly.
 */
function parseMemoryResponse(text: string): string[] {
  const strategies = [
    () => tryParse(text.trim()),
    () => tryParse(text.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim()),
    () => { const m = text.match(/\[[\s\S]*\]/); return m ? tryParse(m[0]) : [] },
    () => { const m = text.match(/\{[\s\S]*\}/); return m ? tryParse(m[0]) : [] },
  ]

  for (const strategy of strategies) {
    const result = strategy()
    if (result.length > 0) return result
  }

  console.warn("[cron/extract-memories] Could not parse LLM response:", text.slice(0, 200))
  return []
}

function tryParse(raw: string): string[] {
  try {
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) {
      return parsed.filter((s): s is string => typeof s === "string" && s.trim().length > 0)
    }
    if (typeof parsed === "object" && parsed !== null) {
      const arr = parsed.memories ?? parsed.facts ?? parsed.items ?? parsed.results
      if (Array.isArray(arr)) {
        return arr
          .map((item: unknown) => (typeof item === "string" ? item : (item as any)?.content))
          .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      }
    }
  } catch { /* not valid JSON */ }
  return []
}
