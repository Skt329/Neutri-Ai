import { describe, it, expect } from "vitest"
import { computeTargets, sumTotals, percent, startOfLocalDayISO } from "@/lib/nutrition"

// ---------------------------------------------------------------------------
// computeTargets
// ---------------------------------------------------------------------------
describe("computeTargets", () => {
  const base = {
    age: 30,
    height_cm: 175,
    weight_kg: 75,
    activity_level: "moderate" as const,
    goal: "maintain" as const,
  }

  describe("sex variations", () => {
    it("computes correct RMR for male (+5 constant)", () => {
      const t = computeTargets({
        age: 30, sex: "male", height_cm: 175, weight_kg: 75,
        activity_level: "sedentary", goal: "maintain",
      })
      // RMR = 10*75 + 6.25*175 - 5*30 + 5 = 1698.75
      // TDEE = 1698.75 * 1.2 = 2038.5 → round → 2039
      expect(t.calories).toBe(2039)
    })

    it("computes correct RMR for female (-161 constant)", () => {
      const t = computeTargets({
        age: 25, sex: "female", height_cm: 165, weight_kg: 60,
        activity_level: "active", goal: "lose",
      })
      // RMR = 10*60 + 6.25*165 - 5*25 - 161 = 1345.25
      // TDEE = 1345.25 * 1.725 = 2320.56 → -500 → 1821
      expect(t.calories).toBe(1821)
      expect(t.protein_g).toBe(Math.round(60 * 2.0))
    })

    it("computes correct RMR for other sex (-78 neutral average)", () => {
      const t = computeTargets({
        age: 30, sex: "other", height_cm: 170, weight_kg: 70,
        activity_level: "light", goal: "maintain",
      })
      const rmr = 10 * 70 + 6.25 * 170 - 5 * 30 - 78
      expect(t.calories).toBe(Math.round(rmr * 1.375))
    })

    it("returns higher RMR for male than female with identical stats", () => {
      const male = computeTargets({ ...base, sex: "male" })
      const female = computeTargets({ ...base, sex: "female" })
      expect(male.calories).toBeGreaterThan(female.calories)
    })

    it("handles prefer_not_say the same as other", () => {
      const other = computeTargets({ ...base, sex: "other" })
      const pns = computeTargets({ ...base, sex: "prefer_not_say" })
      // Both fall into the else branch (-78)
      expect(pns.calories).toBe(other.calories)
    })
  })

  describe("activity levels", () => {
    it("sedentary < light < moderate < active < very_active calories", () => {
      const levels = ["sedentary", "light", "moderate", "active", "very_active"] as const
      const cals = levels.map((l) =>
        computeTargets({ ...base, sex: "male", activity_level: l }).calories,
      )
      for (let i = 1; i < cals.length; i++) {
        expect(cals[i]).toBeGreaterThan(cals[i - 1])
      }
    })
  })

  describe("goals", () => {
    it("lose subtracts 500 calories from TDEE", () => {
      const lose = computeTargets({ ...base, sex: "male", goal: "lose" })
      const maintain = computeTargets({ ...base, sex: "male", goal: "maintain" })
      expect(maintain.calories - lose.calories).toBe(500)
    })

    it("gain adds 400 calories to TDEE", () => {
      const gain = computeTargets({ ...base, sex: "male", goal: "gain" })
      const maintain = computeTargets({ ...base, sex: "male", goal: "maintain" })
      expect(gain.calories - maintain.calories).toBe(400)
    })

    it("recomp subtracts 200 calories and uses 2.0 protein multiplier", () => {
      const t = computeTargets({
        age: 28, sex: "male", height_cm: 178, weight_kg: 82,
        activity_level: "moderate", goal: "recomp",
      })
      expect(t.protein_g).toBe(Math.round(82 * 2.0))
      const rmr = 10 * 82 + 6.25 * 178 - 5 * 28 + 5
      expect(t.calories).toBe(Math.round(rmr * 1.55 - 200))
    })

    it("gain uses 1.8 protein multiplier", () => {
      const t = computeTargets({ ...base, sex: "male", goal: "gain" })
      expect(t.protein_g).toBe(Math.round(75 * 1.8))
    })

    it("maintain uses 1.6 protein multiplier", () => {
      const t = computeTargets({ ...base, sex: "male", goal: "maintain" })
      expect(t.protein_g).toBe(Math.round(75 * 1.6))
    })
  })

  describe("calorie floor", () => {
    it("enforces minimum 1200 calories", () => {
      const t = computeTargets({
        age: 70, sex: "female", height_cm: 150, weight_kg: 40,
        activity_level: "sedentary", goal: "lose",
      })
      expect(t.calories).toBe(1200)
    })
  })

  describe("output shape", () => {
    it("returns all required macro fields as integers", () => {
      const r = computeTargets({ ...base, sex: "male" })
      expect(Number.isInteger(r.calories)).toBe(true)
      expect(Number.isInteger(r.protein_g)).toBe(true)
      expect(Number.isInteger(r.carbs_g)).toBe(true)
      expect(Number.isInteger(r.fat_g)).toBe(true)
      expect(Number.isInteger(r.fiber_g)).toBe(true)
    })

    it("fiber is at least 25g", () => {
      const r = computeTargets({ ...base, sex: "female" })
      expect(r.fiber_g).toBeGreaterThanOrEqual(25)
    })

    it("fat is 25% of total calories / 9", () => {
      const r = computeTargets({ ...base, sex: "male" })
      expect(r.fat_g).toBe(Math.round((r.calories * 0.25) / 9))
    })
  })
})

// ---------------------------------------------------------------------------
// sumTotals
// ---------------------------------------------------------------------------
describe("sumTotals", () => {
  it("returns all zeros for empty array", () => {
    const t = sumTotals([])
    expect(t).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
  })

  it("returns identical values for a single meal", () => {
    const t = sumTotals([
      { calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15, fiber_g: 8 },
    ])
    expect(t).toEqual({ calories: 500, protein_g: 30, carbs_g: 60, fat_g: 15, fiber_g: 8 })
  })

  it("sums multiple meals", () => {
    const meals = [
      { calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 5 },
      { calories: 500, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 8 },
    ]
    const t = sumTotals(meals)
    expect(t).toEqual({ calories: 800, protein_g: 50, carbs_g: 80, fat_g: 25, fiber_g: 13 })
  })

  it("handles null values gracefully (treats as 0)", () => {
    const meals = [
      { calories: null, protein_g: 10, carbs_g: null, fat_g: 5, fiber_g: null },
      { calories: 200, protein_g: null, carbs_g: 20, fat_g: null, fiber_g: 3 },
    ]
    const t = sumTotals(meals)
    expect(t).toEqual({ calories: 200, protein_g: 10, carbs_g: 20, fat_g: 5, fiber_g: 3 })
  })

  it("handles all-null meal", () => {
    const t = sumTotals([
      { calories: null, protein_g: null, carbs_g: null, fat_g: null, fiber_g: null },
    ])
    expect(t).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
  })

  it("handles three meals with mixed nulls", () => {
    const t = sumTotals([
      { calories: 100, protein_g: null, carbs_g: 10, fat_g: 5, fiber_g: 2 },
      { calories: null, protein_g: 20, carbs_g: null, fat_g: null, fiber_g: null },
      { calories: 300, protein_g: 15, carbs_g: 30, fat_g: 10, fiber_g: 8 },
    ])
    expect(t).toEqual({ calories: 400, protein_g: 35, carbs_g: 40, fat_g: 15, fiber_g: 10 })
  })
})

// ---------------------------------------------------------------------------
// percent
// ---------------------------------------------------------------------------
describe("percent", () => {
  it("returns correct percentage for normal values", () => {
    expect(percent(50, 100)).toBe(50)
    expect(percent(75, 100)).toBe(75)
    expect(percent(100, 100)).toBe(100)
  })

  it("returns 0 when target is 0", () => {
    expect(percent(50, 0)).toBe(0)
  })

  it("caps at 150% max", () => {
    expect(percent(200, 100)).toBe(150)
    expect(percent(500, 100)).toBe(150)
  })

  it("rounds to nearest integer", () => {
    expect(percent(33, 100)).toBe(33)
    expect(percent(1, 3)).toBe(33)
  })

  it("handles current = 0", () => {
    expect(percent(0, 100)).toBe(0)
  })

  it("handles exactly at 150%", () => {
    expect(percent(150, 100)).toBe(150)
  })

  it("handles fractional values", () => {
    expect(percent(7, 20)).toBe(35)
  })
})

// ---------------------------------------------------------------------------
// startOfLocalDayISO
// ---------------------------------------------------------------------------
describe("startOfLocalDayISO", () => {
  it("returns an ISO string ending in T00:00:00.000Z", () => {
    const result = startOfLocalDayISO("UTC")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
  })

  it("reflects today's date in UTC", () => {
    const result = startOfLocalDayISO("UTC")
    const todayUTC = new Date().toISOString().slice(0, 10)
    expect(result.startsWith(todayUTC)).toBe(true)
  })

  it("returns a valid date for America/New_York timezone", () => {
    const result = startOfLocalDayISO("America/New_York")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
  })

  it("returns a valid date for Asia/Kolkata timezone", () => {
    const result = startOfLocalDayISO("Asia/Kolkata")
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}T00:00:00\.000Z$/)
  })

  it("defaults to UTC when no timezone is provided", () => {
    const resultDefault = startOfLocalDayISO()
    const resultUTC = startOfLocalDayISO("UTC")
    expect(resultDefault).toBe(resultUTC)
  })

  it("produces a parseable Date", () => {
    const result = startOfLocalDayISO("America/Los_Angeles")
    const d = new Date(result)
    expect(d.getTime()).not.toBeNaN()
    expect(d.getUTCHours()).toBe(0)
    expect(d.getUTCMinutes()).toBe(0)
  })
})
