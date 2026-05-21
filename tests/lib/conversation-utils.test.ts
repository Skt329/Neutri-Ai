import { describe, it, expect } from "vitest"
import { groupConversations, formatRelativeTime } from "@/lib/conversation-utils"

describe("groupConversations", () => {
  it("returns empty array for no conversations", () => {
    expect(groupConversations([])).toEqual([])
  })

  it("groups today's conversations", () => {
    const groups = groupConversations([
      { id: "1", title: "Chat", updated_at: new Date().toISOString() },
    ])
    expect(groups).toHaveLength(1)
    expect(groups[0].label).toBe("Today")
    expect(groups[0].items).toHaveLength(1)
  })

  it("groups yesterday's conversations", () => {
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000)
    yesterday.setHours(12, 0, 0, 0) // Midday yesterday to be safe
    const groups = groupConversations([
      { id: "1", title: "Old Chat", updated_at: yesterday.toISOString() },
    ])
    const yesterdayGroup = groups.find((g) => g.label === "Yesterday")
    expect(yesterdayGroup).toBeDefined()
    expect(yesterdayGroup!.items).toHaveLength(1)
  })

  it("filters out empty groups", () => {
    const groups = groupConversations([
      { id: "1", title: "Today", updated_at: new Date().toISOString() },
    ])
    // Should only have "Today", not Yesterday/This Week/Older
    expect(groups).toHaveLength(1)
  })
})

describe("formatRelativeTime", () => {
  it("returns 'Just now' for very recent times", () => {
    const now = new Date().toISOString()
    expect(formatRelativeTime(now)).toBe("Just now")
  })

  it("returns minutes for < 1 hour", () => {
    const thirtyMinsAgo = new Date(Date.now() - 30 * 60 * 1000).toISOString()
    expect(formatRelativeTime(thirtyMinsAgo)).toBe("30m ago")
  })

  it("returns hours for < 1 day", () => {
    const threeHoursAgo = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeHoursAgo)).toBe("3h ago")
  })

  it("returns days for < 1 week", () => {
    const threeDaysAgo = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString()
    expect(formatRelativeTime(threeDaysAgo)).toBe("3d ago")
  })
})
