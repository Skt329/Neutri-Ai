import type { UIMessage } from "ai"

/**
 * Token budget for conversation context (excluding system prompt and tool descriptions).
 *
 * GPT-4.1 mini context: 128K. We reserve:
 *   - ~10K for system prompt
 *   - ~5K for tool schemas
 *   - ~2K for output
 *   - Remaining: ~111K, but we cap at 10K for latency and cost control.
 */
const MAX_CONTEXT_TOKENS = 10_000

/** Rough token estimation: 1 token ≈ 4 characters for English text */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4)
}

function messageTokens(msg: UIMessage): number {
  if (!msg.parts || !Array.isArray(msg.parts)) return 10
  let tokens = 4 // role overhead
  for (const part of msg.parts) {
    if ("text" in part && typeof part.text === "string") {
      tokens += estimateTokens(part.text)
    } else {
      // Tool invocations, results, etc. — estimate from JSON
      tokens += estimateTokens(JSON.stringify(part))
    }
  }
  return tokens
}

/**
 * Truncate messages to fit within the token budget.
 *
 * Strategy:
 *   1. Always keep the FIRST user message (establishes context)
 *   2. Always keep the LAST 4 messages (current exchange)
 *   3. Fill remaining budget from most recent → oldest
 *   4. Insert a "[earlier messages truncated]" marker at the cut point
 *
 * The `onFinish` callback still receives the full `messages` array for
 * persistence — the truncation is only applied to the LLM input.
 */
export function truncateMessages(
  messages: UIMessage[],
  maxTokens: number = MAX_CONTEXT_TOKENS,
): UIMessage[] {
  // Small conversations — no truncation needed
  if (messages.length <= 6) return messages

  const totalTokens = messages.reduce((sum, m) => sum + messageTokens(m), 0)
  if (totalTokens <= maxTokens) return messages // Fits within budget

  // Always keep first message + last 4
  const first = messages[0]
  const last4 = messages.slice(-4)
  const middle = messages.slice(1, -4)

  let budget =
    maxTokens -
    messageTokens(first) -
    last4.reduce((s, m) => s + messageTokens(m), 0)

  // Fill from most recent middle messages backwards
  const kept: UIMessage[] = []
  for (let i = middle.length - 1; i >= 0; i--) {
    const cost = messageTokens(middle[i])
    if (budget - cost < 0) break
    budget -= cost
    kept.unshift(middle[i])
  }

  const truncated = messages.length - 1 - kept.length - last4.length
  console.log(
    `[context-manager] Truncated ${truncated} messages from context (${totalTokens} → ~${maxTokens} tokens)`,
  )

  // Insert truncation marker
  const truncationMsg: UIMessage = {
    role: "system" as const,
    parts: [
      {
        type: "text" as const,
        text: `[${truncated} earlier messages in this conversation were omitted to save context. The full history is stored in the database.]`,
      },
    ],
    id: "truncation-marker",
  }

  return [first, truncationMsg, ...kept, ...last4]
}
