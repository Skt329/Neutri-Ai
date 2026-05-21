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
  it("returns null for empty meals", () => {
    expect(computeMealGap([])).toBeNull()
  })

  it("calculates gap correctly for a recent meal", () => {
    const now = new Date(2026, 4, 21, 14, 0) // 2pm
    const mealAt = new Date(2026, 4, 21, 13, 0).toISOString() // 1pm = 1h ago
    const gap = computeMealGap([makeMeal(mealAt)], now)
    expect(gap).not.toBeNull()
    expect(gap!.hours).toBe(1)
    expect(gap!.warn).toBe(false)
    expect(gap!.lastMealAt).toBe(mealAt)
  })

  it("warns when gap >= 5h during waking hours", () => {
    const now = new Date(2026, 4, 21, 18, 0) // 6pm (waking hours)
    const mealAt = new Date(2026, 4, 21, 12, 0).toISOString() // noon = 6h ago
    const gap = computeMealGap([makeMeal(mealAt)], now)
    expect(gap!.warn).toBe(true)
    expect(gap!.hours).toBe(6)
    expect(gap!.message).toContain("consider a snack")
  })

  it("does not warn at 3am even with large gap", () => {
    const now = new Date(2026, 4, 21, 3, 0) // 3am (not waking hours)
    const mealAt = new Date(2026, 4, 20, 20, 0).toISOString() // 8pm previous day = 7h ago
    const gap = computeMealGap([makeMeal(mealAt)], now)
    expect(gap!.warn).toBe(false)
    expect(gap!.hours).toBe(7)
  })

  it("returns null for future meals", () => {
    const now = new Date(2026, 4, 21, 12, 0)
    const futureMeal = new Date(2026, 4, 21, 14, 0).toISOString() // 2h in future
    const gap = computeMealGap([makeMeal(futureMeal)], now)
    expect(gap).toBeNull()
  })

  it("picks the most recent meal from multiple", () => {
    const now = new Date(2026, 4, 21, 16, 0) // 4pm
    const meals = [
      makeMeal(new Date(2026, 4, 21, 8, 0).toISOString()),  // 8am = 8h ago
      makeMeal(new Date(2026, 4, 21, 14, 0).toISOString()), // 2pm = 2h ago
      makeMeal(new Date(2026, 4, 21, 10, 0).toISOString()), // 10am = 6h ago
    ]
    const gap = computeMealGap(meals, now)
    expect(gap!.hours).toBe(2)
  })

  it("rounds to nearest 0.5h", () => {
    const now = new Date(2026, 4, 21, 15, 15) // 3:15pm
    const mealAt = new Date(2026, 4, 21, 12, 0).toISOString() // noon = 3.25h ago
    const gap = computeMealGap([makeMeal(mealAt)], now)
    expect(gap!.hours).toBe(3.5) // rounds 3.25 → 3.5
  })
})
