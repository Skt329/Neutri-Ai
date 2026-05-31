import { nimEmbed } from "@/lib/ai/nim-provider"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Memory module — retrieval only.
 *
 * Extraction is handled by the deferred cron job (POST /api/cron/extract-memories).
 * This module provides real-time memory retrieval for the chat system prompt.
 */

/**
 * Retrieve top-K relevant memories for the current user using cosine similarity
 * over the user's text. Returns content strings formatted for injection into
 * the assistant's system prompt.
 */
export async function retrieveMemories(params: {
  userId: string
  query: string
  limit?: number
}): Promise<string[]> {
  const { query, limit = 5 } = params
  if (!query.trim()) return []

  try {
    // Embed as "query" (for retrieval). NeMo Retriever is asymmetric.
    const embedding = await nimEmbed(query, "query")

    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- custom RPCs not in generated types
    const admin = createAdminClient() as any

    const { data, error } = await admin.rpc("match_memories_for_user", {
      p_user_id: params.userId,
      query_embedding: embedding,
      match_count: limit,
      similarity_threshold: 0.5,
    })

    if (error) {
      // RPC may not exist if user skipped the admin variant — silently fall back.
      return []
    }
    return (data ?? []).map((r: { content: string }) => r.content)
  } catch {
    return []
  }
}
