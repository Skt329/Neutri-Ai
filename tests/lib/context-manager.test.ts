import { describe, it, expect } from "vitest"
import { truncateMessages } from "@/lib/ai/context-manager"
import type { UIMessage } from "ai"

function makeMsg(
  role: "user" | "assistant",
  text: string,
  id?: string,
): UIMessage {
  return {
    role,
    parts: [{ type: "text" as const, text }],
    id: id ?? Math.random().toString(),
  }
}

describe("truncateMessages", () => {
  it("returns all messages when under budget", () => {
    const msgs = [makeMsg("user", "Hi"), makeMsg("assistant", "Hello!")]
    expect(truncateMessages(msgs, 10_000)).toHaveLength(2)
  })

  it("returns messages unchanged when exactly 6", () => {
    const msgs = Array.from({ length: 6 }, (_, i) =>
      makeMsg(i % 2 === 0 ? "user" : "assistant", "x".repeat(10_000)),
    )
    // Even if over budget, ≤6 messages are never truncated
    expect(truncateMessages(msgs, 100)).toHaveLength(6)
  })

  it("always preserves first message", () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg(
        i % 2 === 0 ? "user" : "assistant",
        "x".repeat(5000),
        `msg-${i}`,
      ),
    )
    const result = truncateMessages(msgs, 8000)
    expect(result[0].id).toBe("msg-0")
  })

  it("always preserves last 4 messages", () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg(
        i % 2 === 0 ? "user" : "assistant",
        "x".repeat(5000),
        `msg-${i}`,
      ),
    )
    const result = truncateMessages(msgs, 8000)
    const lastIds = result.slice(-4).map((m) => m.id)
    expect(lastIds).toContain("msg-19")
    expect(lastIds).toContain("msg-18")
    expect(lastIds).toContain("msg-17")
    expect(lastIds).toContain("msg-16")
  })

  it("inserts truncation marker", () => {
    const msgs = Array.from({ length: 20 }, (_, i) =>
      makeMsg(
        i % 2 === 0 ? "user" : "assistant",
        "x".repeat(5000),
        `msg-${i}`,
      ),
    )
    const result = truncateMessages(msgs, 8000)
    expect(result.some((m) => m.id === "truncation-marker")).toBe(true)
  })

  it("result is smaller than input when budget is tight", () => {
    const msgs = Array.from({ length: 30 }, (_, i) =>
      makeMsg(i % 2 === 0 ? "user" : "assistant", "x".repeat(3000)),
    )
    const result = truncateMessages(msgs, 5000)
    expect(result.length).toBeLessThan(msgs.length)
  })

  it("handles empty messages gracefully", () => {
    expect(truncateMessages([], 10_000)).toHaveLength(0)
  })

  it("handles single message", () => {
    const msgs = [makeMsg("user", "Hello")]
    expect(truncateMessages(msgs, 10_000)).toHaveLength(1)
  })
})
