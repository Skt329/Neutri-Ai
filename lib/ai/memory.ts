import { generateText, embed, Output } from "ai"
import { google } from "@ai-sdk/google"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"

const MemorySchema = z.object({
  memories: z.array(
    z.object({
      content: z
        .string()
        .describe("A concise, first-person-about-the-user fact. E.g. 'User is allergic to peanuts.'"),
    }),
  ),
})

/**
 * Extract stable, long-term facts about the user from a chat exchange
 * and store them with vector embeddings for future retrieval.
 *
 * Runs async / fire-and-forget — callers should NOT await this in a way
 * that blocks user-visible responses.
 */
export async function extractAndStoreMemories(params: {
  userId: string
  userText: string
  assistantText: string
}) {
  const { userId, userText, assistantText } = params
  if (!userText.trim() && !assistantText.trim()) return

  try {
    const { experimental_output } = await generateText({
      model: google("gemini-2.5-flash"),
      experimental_output: Output.object({ schema: MemorySchema }),
      system: `You extract stable, long-term facts about the USER from a chat exchange with an AI dietitian.
Rules:
- Only extract durable facts (allergies, conditions, persistent preferences, goals, dislikes, dietary restrictions, routine patterns).
- Ignore ephemeral content (what they ate today, today's mood, one-off questions).
- Do NOT extract facts about the assistant.
- Each memory must be a complete, standalone sentence (understandable without context).
- If nothing is worth remembering, return an empty array.`,
      prompt: `USER: ${userText}\n\nASSISTANT: ${assistantText}`,
    })

    const memories = experimental_output?.memories ?? []
    if (memories.length === 0) return

    const admin = createAdminClient()

    // Embed each memory in parallel. Gemini text-embedding-004 returns 768-dim vectors.
    const embeddings = await Promise.all(
      memories.map((m) =>
        embed({
          model: google.textEmbedding("text-embedding-004"),
          value: m.content,
        }),
      ),
    )

    const rows = memories.map((m, i) => ({
      user_id: userId,
      source: "chat" as const,
      content: m.content,
      embedding: embeddings[i].embedding as unknown as number[],
    }))

    const { error } = await admin.from("memories").insert(rows)
    if (error) console.error("[memory] insert failed:", error.message)
  } catch (err) {
    // Never let memory extraction break chat.
    console.error("[memory] extraction failed:", err)
  }
}

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
    const { embedding } = await embed({
      model: google.textEmbedding("text-embedding-004"),
      value: query,
    })

    const admin = createAdminClient()

    const { data, error } = await admin.rpc("match_memories_for_user", {
      p_user_id: params.userId,
      query_embedding: embedding as unknown as number[],
      match_count: limit,
      similarity_threshold: 0.3,
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
