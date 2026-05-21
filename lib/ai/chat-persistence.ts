/**
 * Chat message persistence — saves new messages and updates existing ones
 * after a stream completes.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { UIMessage } from "ai"
import { generateText } from "ai"
import { azureChatModel } from "@/lib/ai/azure-provider"
import { messageToText } from "@/lib/ai/utils"
import type { Logger } from "@/lib/logger"



/**
 * Generate a short title for a conversation based on the first exchange.
 */
export async function generateConversationTitle(
  userText: string,
  assistantText: string,
): Promise<string | null> {
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

/**
 * Persist messages after a chat stream finishes.
 * Inserts new messages and updates existing ones if their parts have grown.
 */
export async function persistMessages(opts: {
  supabase: SupabaseClient
  userId: string
  conversationId: string
  existingTitle: string | null
  messages: UIMessage[]
  finishedMessages: UIMessage[]
  log: Logger
}): Promise<void> {
  const { supabase, userId, conversationId, existingTitle, messages, finishedMessages, log } = opts

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
      user_id: userId,
      role: m.role,
      parts: m.parts as unknown,
      ordinal: maxOrdinal + 1 + i,
    }))
    const { error: insertErr } = await supabase.from("messages").insert(rows)
    if (insertErr) {
      log.error("chat", "Failed to insert new messages", { error: insertErr.message })
    }
  }

  // Update last pre-existing message if its parts have grown
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
        log.error("chat", "Failed to update existing message parts", { error: updateErr.message })
      }
    }
  }

  // Update conversation timestamp
  await supabase
    .from("conversations")
    .update({ updated_at: new Date().toISOString() })
    .eq("id", conversationId)

  // Fire-and-forget title generation
  if (!existingTitle) {
    const lastUserMessage = [...messages].reverse().find((m) => m.role === "user")
    const lastUserText = lastUserMessage ? messageToText(lastUserMessage) : ""
    const assistantText = finishedMessages
      .filter((m) => m.role === "assistant")
      .map((m) => messageToText(m))
      .join("\n")
      .trim()

    if (lastUserText || assistantText) {
      generateConversationTitle(lastUserText, assistantText).then((title) => {
        if (title) {
          supabase.from("conversations").update({ title }).eq("id", conversationId).then(() => {})
        }
      }).catch((err) => {
        console.warn("[chat-persistence] Title generation failed (non-blocking):", err)
      })
    }
  }
}
