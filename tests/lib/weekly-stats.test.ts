import { describe, it, expect } from "vitest"
import { buildWeeklyStats } from "@/lib/weekly-stats"
import type { MealLog, WeightLog, NutritionTargets } from "@/lib/types"

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a minimal MealLog at a given ISO date + time. */
function makeMeal(date: string, cals: number, opts: Partial<MealLog> = {}): MealLog {
  return {
    id: `meal-${date}-${cals}`,
    user_id: "user1",
    logged_at: `${date}T12:00:00Z`,
    meal_type: "lunch",
    description: "test",
    calories: cals,
    protein_g: opts.protein_g ?? Math.round(cals * 0.15 / 4),
    carbs_g: opts.carbs_g ?? Math.round(cals * 0.5 / 4),
    fat_g: opts.fat_g ?? Math.round(cals * 0.3 / 9),
    fiber_g: opts.fiber_g ?? 5,
    items: [],
    source: "chat",
    created_at: `${date}T12:00:00Z`,
    ...opts,
  }
}

function makeWeight(date: string, kg: number): WeightLog {
  return {
    id: `w-${date}`,
    user_id: "user1",
    weight_kg: kg,
    logged_at: `${date}T08:00:00Z`,
    note: null,
    created_at: `${date}T08:00:00Z`,
  }
}

function makeTargets(overrides: Partial<NutritionTargets> = {}): NutritionTargets {
  return {
    id: "t1", user_id: "user1", calories: 2000, protein_g: 120,
    carbs_g: 250, fat_g: 65, fiber_g: 30,
    effective_from: "", created_at: "",
    ...overrides,
  }
}

/** Returns the date string N days ago from today in YYYY-MM-DD format (UTC). */
function daysAgoDate(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("buildWeeklyStats", () => {
  describe("empty meals", () => {
    it("returns all zeros with no meals", () => {
      const stats = buildWeeklyStats({ meals: [], weights: [], targets: null })
      expect(stats.avgCalories).toBe(0)
      expect(stats.bestDay).toBeNull()
      expect(stats.worstDay).toBeNull()
      expect(stats.totalMealsLogged).toBe(0)
      expect(stats.macroConsistencyPct).toBe(0)
      expect(stats.weightChangeKg).toBeNull()
      expect(stats.targetCalories).toBeNull()
    })

    it("still returns 7 days in the breakdown", () => {
      const stats = buildWeeklyStats({ meals: [], weights: [], targets: null })
      expect(stats.days).toHaveLength(7)
      expect(stats.days.every((d) => d.mealCount === 0)).toBe(true)
    })
  })

  describe("single day of meals", () => {
    it("averages from the single logged day", () => {
      const today = daysAgoDate(0)
      const stats = buildWeeklyStats({
        meals: [makeMeal(today, 1800), makeMeal(today, 600)],
        weights: [],
        targets: null,
      })
      expect(stats.avgCalories).toBe(2400)
      expect(stats.totalMealsLogged).toBe(2)
      expect(stats.bestDay).not.toBeNull()
      expect(stats.bestDay!.calories).toBe(2400)
      // bestDay === worstDay when only one logged day
      expect(stats.worstDay!.calories).toBe(2400)
    })
  })

  describe("full week with varied intake", () => {
    it("computes correct averages and identifies best/worst day", () => {
      const meals = [
        makeMeal(daysAgoDate(6), 1500),
        makeMeal(daysAgoDate(5), 2200),
        makeMeal(daysAgoDate(4), 1800),
        makeMeal(daysAgoDate(3), 2500), // highest
        makeMeal(daysAgoDate(2), 1600),
        makeMeal(daysAgoDate(1), 2000),
        makeMeal(daysAgoDate(0), 1900),
      ]
      const stats = buildWeeklyStats({ meals, weights: [], targets: null })

      expect(stats.totalMealsLogged).toBe(7)
      const total = 1500 + 2200 + 1800 + 2500 + 1600 + 2000 + 1900
      expect(stats.avgCalories).toBe(Math.round(total / 7))
      expect(stats.bestDay!.calories).toBe(2500)
      expect(stats.worstDay!.calories).toBe(1500)
    })
  })

  describe("best/worst day identification", () => {
    it("bestDay is highest calorie day, worstDay is lowest", () => {
      const meals = [
        makeMeal(daysAgoDate(2), 3000),
        makeMeal(daysAgoDate(1), 1200),
        makeMeal(daysAgoDate(0), 2000),
      ]
      const stats = buildWeeklyStats({ meals, weights: [], targets: null })
      expect(stats.bestDay!.calories).toBe(3000)
      expect(stats.worstDay!.calories).toBe(1200)
    })
  })

  describe("macroConsistencyPct", () => {
    it("returns 0 when no targets", () => {
      const stats = buildWeeklyStats({
        meals: [makeMeal(daysAgoDate(0), 2000)],
        weights: [],
        targets: null,
      })
      expect(stats.macroConsistencyPct).toBe(0)
    })

    it("returns 100 when all days are within ±15% of target", () => {
      const meals = [
        makeMeal(daysAgoDate(0), 2000), // 0% off
        makeMeal(daysAgoDate(1), 1900), // 5% off
        makeMeal(daysAgoDate(2), 2100), // 5% off
      ]
      const stats = buildWeeklyStats({
        meals, weights: [], targets: makeTargets(),
      })
      expect(stats.macroConsistencyPct).toBe(100)
    })

    it("returns lower score when days deviate >15% from target", () => {
      const meals = [
        makeMeal(daysAgoDate(0), 2000), // perfect
        makeMeal(daysAgoDate(1), 1000), // 50% off → very low score
      ]
      const stats = buildWeeklyStats({
        meals, weights: [], targets: makeTargets(),
      })
      expect(stats.macroConsistencyPct).toBeLessThan(100)
    })

    it("returns 0 when all days are >=60% off target", () => {
      const meals = [
        makeMeal(daysAgoDate(0), 500),  // 75% off
        makeMeal(daysAgoDate(1), 400),  // 80% off
      ]
      const stats = buildWeeklyStats({
        meals, weights: [], targets: makeTargets(),
      })
      expect(stats.macroConsistencyPct).toBe(0)
    })
  })

  describe("weight change", () => {
    it("calculates weight change from first to last entry", () => {
      const stats = buildWeeklyStats({
        meals: [makeMeal(daysAgoDate(0), 2000)],
        weights: [
          makeWeight(daysAgoDate(6), 75.0),
          makeWeight(daysAgoDate(0), 74.5),
        ],
        targets: null,
      })
      expect(stats.weightChangeKg).toBe(-0.5)
      expect(stats.startWeightKg).toBe(75.0)
      expect(stats.endWeightKg).toBe(74.5)
    })

    it("returns null weight change with only one entry", () => {
      const stats = buildWeeklyStats({
        meals: [],
        weights: [makeWeight(daysAgoDate(0), 70)],
        targets: null,
      })
      expect(stats.weightChangeKg).toBeNull()
    })

    it("returns null when no weight entries", () => {
      const stats = buildWeeklyStats({
        meals: [],
        weights: [],
        targets: null,
      })
      expect(stats.weightChangeKg).toBeNull()
      expect(stats.startWeightKg).toBeNull()
      expect(stats.endWeightKg).toBeNull()
    })
  })

  describe("meals outside window", () => {
    it("ignores meals older than 7 days", () => {
      const stats = buildWeeklyStats({
        meals: [makeMeal(daysAgoDate(10), 3000)],
        weights: [],
        targets: null,
      })
      expect(stats.totalMealsLogged).toBe(0)
      expect(stats.avgCalories).toBe(0)
    })
  })

  describe("timezone handling", () => {
    it("accepts a timezone parameter", () => {
      const stats = buildWeeklyStats({
        meals: [makeMeal(daysAgoDate(0), 2000)],
        weights: [],
        targets: null,
        timezone: "Asia/Kolkata",
      })
      expect(stats.days).toHaveLength(7)
    })

    it("defaults to UTC when timezone is omitted", () => {
      const stats = buildWeeklyStats({
        meals: [makeMeal(daysAgoDate(0), 2000)],
        weights: [],
        targets: null,
      })
      expect(stats.days).toHaveLength(7)
    })
  })

  describe("targetCalories field", () => {
    it("reflects the calorie target when provided", () => {
      const stats = buildWeeklyStats({
        meals: [], weights: [], targets: makeTargets({ calories: 2500 }),
      })
      expect(stats.targetCalories).toBe(2500)
    })

    it("returns null when no targets", () => {
      const stats = buildWeeklyStats({ meals: [], weights: [], targets: null })
      expect(stats.targetCalories).toBeNull()
    })
  })
})
