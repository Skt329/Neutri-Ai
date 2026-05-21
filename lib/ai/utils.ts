/**
 * Shared AI utilities — extracted to avoid duplication across
 * the chat route and chat-persistence modules.
 */
import type { UIMessage } from "ai"

/**
 * Extract plain text from a UIMessage's parts array.
 * Returns an empty string if the message has no text parts.
 */
export function messageToText(m: UIMessage): string {
  if (!m.parts || !Array.isArray(m.parts)) return ""
  return m.parts
    .filter((p): p is { type: "text"; text: string } => p.type === "text")
    .map((p) => p.text)
    .join("\n")
    .trim()
}
