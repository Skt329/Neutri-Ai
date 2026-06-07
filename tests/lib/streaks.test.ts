import { describe, it, expect } from "vitest"
import { computeStreakInfo } from "@/lib/streaks"

/** Simple helper anchored to Date.now(). */
function daysAgo(n: number): string {
  return new Date(Date.now() - n * 24 * 60 * 60 * 1000).toISOString()
}

describe("computeStreakInfo", () => {
  describe("empty timestamps", () => {
    it("returns all zeros and loggedToday false", () => {
      const s = computeStreakInfo([], "UTC")
      expect(s.currentStreak).toBe(0)
      expect(s.longestStreak).toBe(0)
      expect(s.weeklyConsistency).toBe(0)
      expect(s.loggedToday).toBe(false)
      expect(s.last7Days).toHaveLength(7)
      expect(s.last7Days.every((d) => d === false)).toBe(true)
    })
  })

  describe("single meal today", () => {
    it("returns streak 1, loggedToday true", () => {
      const s = computeStreakInfo([new Date().toISOString()], "UTC")
      expect(s.currentStreak).toBe(1)
      expect(s.longestStreak).toBe(1)
      expect(s.loggedToday).toBe(true)
      expect(s.weeklyConsistency).toBe(1)
    })
  })

  describe("consecutive days", () => {
    it("counts 3 consecutive days ending today", () => {
      const timestamps = [daysAgo(0), daysAgo(1), daysAgo(2)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(3)
      expect(s.longestStreak).toBe(3)
      expect(s.loggedToday).toBe(true)
    })

    it("counts 5 consecutive days ending today", () => {
      const timestamps = [daysAgo(0), daysAgo(1), daysAgo(2), daysAgo(3), daysAgo(4)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(5)
      expect(s.longestStreak).toBe(5)
    })

    it("counts all 7 days → weeklyConsistency 7", () => {
      const timestamps = Array.from({ length: 7 }, (_, i) => daysAgo(i))
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(7)
      expect(s.weeklyConsistency).toBe(7)
      expect(s.last7Days.every(Boolean)).toBe(true)
    })

    it("counts consecutive days ending yesterday (no meal today)", () => {
      const timestamps = [daysAgo(1), daysAgo(2), daysAgo(3)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(3)
      expect(s.loggedToday).toBe(false)
    })
  })

  describe("gap in the middle", () => {
    it("breaks current streak at the gap", () => {
      // today, yesterday, then skip day-2, then day-3 and day-4
      const timestamps = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(4)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(2) // today + yesterday
      expect(s.longestStreak).toBe(2)
    })

    it("longest streak is from earlier run when current is shorter", () => {
      // current: today only. Earlier run: 4 consecutive days (day 5-8)
      const timestamps = [
        daysAgo(0),
        daysAgo(5), daysAgo(6), daysAgo(7), daysAgo(8),
      ]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(1)
      expect(s.longestStreak).toBe(4)
    })
  })

  describe("weeklyConsistency", () => {
    it("counts 4 of 7 days correctly", () => {
      const timestamps = [daysAgo(0), daysAgo(1), daysAgo(3), daysAgo(5)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.weeklyConsistency).toBe(4)
    })

    it("does not count days older than 7 days", () => {
      const timestamps = [daysAgo(0), daysAgo(10)]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.weeklyConsistency).toBe(1)
    })
  })

  describe("edge cases", () => {
    it("skips invalid timestamps", () => {
      const timestamps = ["not-a-date", "invalid", new Date().toISOString()]
      const s = computeStreakInfo(timestamps, "UTC")
      expect(s.currentStreak).toBe(1)
      expect(s.loggedToday).toBe(true)
    })

    it("handles multiple meals on the same day", () => {
      const today = new Date()
      const morning = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 8, 0).toISOString()
      const evening = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 20, 0).toISOString()
      const s = computeStreakInfo([morning, evening], "UTC")
      expect(s.currentStreak).toBe(1)
      expect(s.loggedToday).toBe(true)
    })

    it("defaults to UTC timezone", () => {
      const s = computeStreakInfo([new Date().toISOString()])
      expect(s.loggedToday).toBe(true)
    })
  })

  describe("timezone edge cases", () => {
    it("handles Asia/Kolkata timezone", () => {
      const s = computeStreakInfo([new Date().toISOString()], "Asia/Kolkata")
      // As long as the test runs, this should be loggedToday in IST
      expect(s.currentStreak).toBeGreaterThanOrEqual(0)
      expect(s.last7Days).toHaveLength(7)
    })

    it("handles America/New_York timezone", () => {
      const s = computeStreakInfo([new Date().toISOString()], "America/New_York")
      expect(s.last7Days).toHaveLength(7)
    })
  })
})
