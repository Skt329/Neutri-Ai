import { NextResponse } from "next/server"
import { generateText, Output } from "ai"
import { z } from "zod"
import { azureChatModel } from "@/lib/ai/azure-provider"
import { nimEmbedBatch } from "@/lib/ai/nim-provider"
import { createAdminClient } from "@/lib/supabase/admin"
import { logger } from "@/lib/logger"

export const runtime = "nodejs"
export const maxDuration = 300 // 5 min max for cron jobs

const INACTIVITY_HOURS = 3
const BATCH_LIMIT = 10 // conversations per cron run
const CRON_SECRET = process.env.CRON_SECRET

/**
 * Zod schema for structured memory extraction.
 *
 * GPT-4.1 returns a validated object conforming to this schema via
 * Output.object — no manual JSON parsing or fallback strategies needed.
 */
const MemoryExtractionSchema = z.object({
  memories: z
    .array(
      z
        .string()
        .min(1)
        .describe("A single durable fact about the user, written as a complete standalone sentence."),
    )
    .describe(
      "Array of stable, long-term facts about the user. " +
      "Include allergies, conditions, preferences, goals, dislikes, dietary restrictions, " +
      "routine patterns, family info, cooking habits. " +
      "Exclude ephemeral content (today's meals, mood, one-off questions, small talk). " +
      "Return an empty array if nothing durable was discussed.",
    ),
})

/**
 * POST /api/cron/extract-memories
 *
 * Deferred memory extraction — runs every 30 min via pg_cron or manual trigger.
 * Finds conversations inactive for 3+ hours, extracts durable facts from the
 * FULL conversation using GPT-4.1 structured output, batch-embeds all memories
 * in 1 API call, and stores them with semantic dedup.
 *
 * Auth: Bearer token matching CRON_SECRET env var.
 */
export async function POST(req: Request) {
  // ── Auth: layered verification ──────────────────────────────────────────
  // 1. Vercel Cron signature (automatic when using vercel.json cron config)
  // 2. Bearer token matching CRON_SECRET
  // At least one must pass.

  const isVercelCron = req.headers.get("x-vercel-cron") === "1"
  const auth = req.headers.get("authorization")
  const hasBearerToken = CRON_SECRET && auth === `Bearer ${CRON_SECRET}`

  if (!isVercelCron && !hasBearerToken) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  // Timestamp validation — reject requests older than 5 minutes
  // (prevents replay attacks with a leaked CRON_SECRET)
  const timestampHeader = req.headers.get("x-cron-timestamp")
  if (timestampHeader) {
    const requestTime = parseInt(timestampHeader, 10)
    const now = Date.now()
    const MAX_AGE_MS = 5 * 60 * 1000 // 5 minutes
    if (isNaN(requestTime) || Math.abs(now - requestTime) > MAX_AGE_MS) {
      return NextResponse.json({ error: "Request expired" }, { status: 401 })
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom RPCs not in generated types
  const admin = createAdminClient() as any

  try {
    // 1. Find conversations needing extraction
    const { data: staleConvos, error: queryErr } = await admin.rpc(
      "get_conversations_needing_extraction",
      { inactivity_hours: INACTIVITY_HOURS, batch_limit: BATCH_LIMIT },
    )

    if (queryErr) {
      logger.error("cron/extract-memories", "Query failed", { error: queryErr.message })
      return NextResponse.json({ error: queryErr.message }, { status: 500 })
    }

    if (!staleConvos || staleConvos.length === 0) {
      return NextResponse.json({ processed: 0, message: "No conversations need extraction" })
    }

    logger.info("cron/extract-memories", `Processing ${staleConvos.length} conversations`)

    let totalMemories = 0
    const results: Array<{ conversationId: string; memories: number; error?: string }> = []

    for (const convo of staleConvos) {
      try {
        const count = await processConversation(admin, convo.conversation_id, convo.user_id)
        totalMemories += count
        results.push({ conversationId: convo.conversation_id, memories: count })
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Unknown error"
        logger.error("cron/extract-memories", `Failed for ${convo.conversation_id}`, { error: msg })
        results.push({ conversationId: convo.conversation_id, memories: 0, error: msg })
      }
    }

    return NextResponse.json({
      processed: staleConvos.length,
      totalMemories,
      results,
    })
  } catch (err) {
    logger.error("cron/extract-memories", "Cron failed", { error: err instanceof Error ? err.message : String(err) })
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
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom RPCs not in generated types
  admin: any,
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

  // 2. Extract durable facts with GPT-4.1 structured output (Zod-enforced)
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

  const checkResults = await Promise.all(
    memories.map(async (content, i) => {
      const embedding = embeddings[i]
      const { data: matches } = await admin.rpc("match_memories_for_user", {
        p_user_id: userId,
        query_embedding: JSON.stringify(embedding),
        match_count: 1,
        similarity_threshold: SIMILARITY_THRESHOLD,
      })
      return { content, embedding, duplicate: matches && matches.length > 0, match: matches?.[0] }
    })
  )

  for (const res of checkResults) {
    if (res.duplicate && res.match) {
      // A semantically similar memory already exists — skip
      logger.debug("cron/extract-memories", "Skipping semantic duplicate", {
        content: res.content.slice(0, 60),
        similarTo: res.match.content.slice(0, 60),
        score: res.match.similarity.toFixed(3),
      })
      continue
    }

    dedupedMemories.push({ content: res.content, embedding: res.embedding })
  }

  if (dedupedMemories.length === 0) {
    logger.info("cron/extract-memories", `${conversationId}: all ${memories.length} memories were semantic duplicates`)
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
    logger.error("cron/extract-memories", `Insert failed for ${conversationId}`, { error: insertErr.message })
    throw new Error(insertErr.message)
  }

  // 6. Mark conversation as extracted
  await admin.rpc("mark_conversation_extracted", { p_conversation_id: conversationId })

  logger.info("cron/extract-memories", `${conversationId}: extracted ${dedupedMemories.length} new memories`, {
    duplicatesSkipped: memories.length - dedupedMemories.length,
  })
  return dedupedMemories.length
}

/**
 * Extract durable facts from a full conversation using GPT-4.1 structured output.
 *
 * Uses Output.object with a Zod schema to guarantee the model returns a validated
 * { memories: string[] } object. No manual JSON parsing or fallback strategies needed.
 */
async function extractFactsFromConversation(conversationText: string): Promise<string[]> {
  // Truncate very long conversations to avoid token limits
  const truncated = conversationText.slice(0, 12000)

  try {
    const { output } = await generateText({
      model: azureChatModel,
      system: `You extract stable, long-term facts about the USER from a full conversation with an AI dietitian.

Rules:
- Only extract DURABLE facts (allergies, conditions, preferences, goals, dislikes, dietary restrictions, routine patterns, family info, cooking habits).
- Ignore ephemeral content (today's meals, mood, one-off questions, small talk).
- Do NOT extract facts about the assistant.
- Each fact must be a complete, standalone sentence.
- Deduplicate — don't repeat the same fact in different words.
- If nothing durable was discussed, return an empty memories array.`,
      prompt: truncated,
      output: Output.object({ schema: MemoryExtractionSchema }),
    })

    return output?.memories ?? []
  } catch (err) {
    logger.error("cron/extract-memories", "Structured extraction failed", {
      error: err instanceof Error ? err.message : String(err),
    })
    return []
  }
}

