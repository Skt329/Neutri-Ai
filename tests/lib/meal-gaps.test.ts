import { describe, it, expect } from "vitest"
import { computeMealGap } from "@/lib/meal-gaps"
import type { MealLog } from "@/lib/types"

function makeMeal(logged_at: string, overrides?: Partial<MealLog>): MealLog {
  return {
    id: "test-id",
    user_id: "test-user",
    logged_at,
    meal_type: "lunch",
    description: "test meal",
    calories: 500,
    protein_g: 25,
    carbs_g: 50,
    fat_g: 15,
    fiber_g: 5,
    items: [],
    source: "chat",
    created_at: logged_at,
    ...overrides,
  }
}

describe("computeMealGap", () => {
  describe("no meals", () => {
    it("returns null for empty meals array", () => {
      expect(computeMealGap([])).toBeNull()
    })
  })

  describe("small gap (meals close together)", () => {
    it("calculates 1h gap correctly", () => {
      const now = new Date(2026, 4, 21, 14, 0) // 2pm
      const mealAt = new Date(2026, 4, 21, 13, 0).toISOString() // 1pm
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap).not.toBeNull()
      expect(gap!.hours).toBe(1)
      expect(gap!.warn).toBe(false)
      expect(gap!.lastMealAt).toBe(mealAt)
    })

    it("shows 'Last meal X ago' for gap < 2h", () => {
      const now = new Date(2026, 4, 21, 13, 30) // 1:30pm
      const mealAt = new Date(2026, 4, 21, 12, 30).toISOString() // 12:30pm
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.message).toMatch(/^Last meal/)
    })
  })

  describe("large gap between meals", () => {
    it("warns when gap >= 5h during waking hours (7-22)", () => {
      const now = new Date(2026, 4, 21, 18, 0) // 6pm
      const mealAt = new Date(2026, 4, 21, 12, 0).toISOString() // noon
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.warn).toBe(true)
      expect(gap!.hours).toBe(6)
      expect(gap!.message).toContain("consider a snack")
    })

    it("does not warn at 3am even with 7h gap", () => {
      const now = new Date(2026, 4, 21, 3, 0) // 3am
      const mealAt = new Date(2026, 4, 20, 20, 0).toISOString() // 8pm prev day
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.warn).toBe(false)
      expect(gap!.hours).toBe(7)
    })

    it("does not warn at exactly 5h gap if outside waking hours", () => {
      const now = new Date(2026, 4, 21, 5, 0) // 5am
      const mealAt = new Date(2026, 4, 21, 0, 0).toISOString() // midnight
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.warn).toBe(false)
    })
  })

  describe("single meal → gap from meal to now", () => {
    it("calculates gap from single meal to now", () => {
      const now = new Date(2026, 4, 21, 16, 0) // 4pm
      const mealAt = new Date(2026, 4, 21, 10, 0).toISOString() // 10am
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.hours).toBe(6)
      expect(gap!.warn).toBe(true)
    })
  })

  describe("multiple meals → picks the most recent", () => {
    it("uses the most recent meal for gap calculation", () => {
      const now = new Date(2026, 4, 21, 16, 0) // 4pm
      const meals = [
        makeMeal(new Date(2026, 4, 21, 8, 0).toISOString()),  // 8am
        makeMeal(new Date(2026, 4, 21, 14, 0).toISOString()), // 2pm ← most recent
        makeMeal(new Date(2026, 4, 21, 10, 0).toISOString()), // 10am
      ]
      const gap = computeMealGap(meals, now)
      expect(gap!.hours).toBe(2)
    })
  })

  describe("edge cases", () => {
    it("returns null for future meals", () => {
      const now = new Date(2026, 4, 21, 12, 0)
      const futureMeal = new Date(2026, 4, 21, 14, 0).toISOString()
      const gap = computeMealGap([makeMeal(futureMeal)], now)
      expect(gap).toBeNull()
    })

    it("rounds to nearest 0.5h", () => {
      const now = new Date(2026, 4, 21, 15, 15) // 3:15pm
      const mealAt = new Date(2026, 4, 21, 12, 0).toISOString() // noon = 3.25h ago
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.hours).toBe(3.5)
    })

    it("returns 0h for a meal logged right now", () => {
      const now = new Date(2026, 4, 21, 12, 0)
      const mealAt = new Date(2026, 4, 21, 12, 0).toISOString()
      const gap = computeMealGap([makeMeal(mealAt)], now)
      expect(gap!.hours).toBe(0)
      expect(gap!.warn).toBe(false)
    })

    it("waking window includes hour 7 and 22", () => {
      // At hour 7 with 5h gap should warn
      const now7 = new Date(2026, 4, 21, 7, 0)
      const meal7 = new Date(2026, 4, 21, 2, 0).toISOString()
      expect(computeMealGap([makeMeal(meal7)], now7)!.warn).toBe(true)

      // At hour 22 with 5h gap should warn
      const now22 = new Date(2026, 4, 21, 22, 0)
      const meal22 = new Date(2026, 4, 21, 17, 0).toISOString()
      expect(computeMealGap([makeMeal(meal22)], now22)!.warn).toBe(true)
    })
  })
})
