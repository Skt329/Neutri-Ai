import { describe, it, expect } from "vitest"
import { computeStreakInfo } from "@/lib/streaks"

// Helper: generate an ISO timestamp N days ago from now
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

describe("computeStreakInfo", () => {
  it("returns all zeros for empty timestamps", () => {
    const s = computeStreakInfo([], "UTC")
    expect(s.currentStreak).toBe(0)
    expect(s.longestStreak).toBe(0)
    expect(s.weeklyConsistency).toBe(0)
    expect(s.loggedToday).toBe(false)
    expect(s.last7Days).toHaveLength(7)
    expect(s.last7Days.every((d) => d === false)).toBe(true)
  })

  it("counts a single meal today as streak of 1", () => {
    const s = computeStreakInfo([new Date().toISOString()], "UTC")
    expect(s.currentStreak).toBe(1)
    expect(s.loggedToday).toBe(true)
    expect(s.longestStreak).toBe(1)
  })

  it("counts consecutive days ending today", () => {
    const timestamps = [daysAgo(0), daysAgo(1), daysAgo(2)]
    const s = computeStreakInfo(timestamps, "UTC")
    expect(s.currentStreak).toBe(3)
    expect(s.longestStreak).toBe(3)
    expect(s.loggedToday).toBe(true)
  })

  it("counts consecutive days ending yesterday (no meal today)", () => {
    const timestamps = [daysAgo(1), daysAgo(2), daysAgo(3)]
    const s = computeStreakInfo(timestamps, "UTC")
    expect(s.currentStreak).toBe(3)
    expect(s.loggedToday).toBe(false)
  })

  it("breaks streak on gap", () => {
    // Logged today, yesterday, then skip a day, then 2 days ago
    const timestamps = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)]
    const s = computeStreakInfo(timestamps, "UTC")
    expect(s.currentStreak).toBe(2) // today + yesterday
    expect(s.longestStreak).toBe(2)
  })

  it("skips invalid timestamps", () => {
    const timestamps = ["not-a-date", "invalid", new Date().toISOString()]
    const s = computeStreakInfo(timestamps, "UTC")
    expect(s.currentStreak).toBe(1)
    expect(s.loggedToday).toBe(true)
  })

  it("calculates weeklyConsistency correctly", () => {
    // Logged 4 of the last 7 days
    const timestamps = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(5)]
    const s = computeStreakInfo(timestamps, "UTC")
    expect(s.weeklyConsistency).toBe(4)
  })

  it("handles multiple meals on the same day", () => {
    const today = new Date()
    const morning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0).toISOString()
    const evening = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0).toISOString()
    const s = computeStreakInfo([morning, evening], "UTC")
    expect(s.currentStreak).toBe(1) // same day counts once
    expect(s.loggedToday).toBe(true)
  })
})
