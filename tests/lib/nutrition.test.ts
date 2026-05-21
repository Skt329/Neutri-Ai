import { describe, it, expect } from "vitest"
import { computeTargets, sumTotals, percent } from "@/lib/nutrition"

describe("computeTargets", () => {
  it("computes targets for a sedentary male maintaining weight", () => {
    const t = computeTargets({
      age: 30, sex: "male", height_cm: 175, weight_kg: 75,
      activity_level: "sedentary", goal: "maintain",
    })
    // RMR = 10*75 + 6.25*175 - 5*30 + 5 = 750 + 1093.75 - 150 + 5 = 1698.75
    // TDEE = 1698.75 * 1.2 = 2038.5 → calories = round(2038.5) = 2039
    expect(t.calories).toBe(2039)
    expect(t.protein_g).toBe(Math.round(75 * 1.6)) // 120
    expect(t.fat_g).toBe(Math.round((2039 * 0.25) / 9))
    expect(t.fiber_g).toBeGreaterThanOrEqual(25)
  })

  it("computes targets for an active female losing weight", () => {
    const t = computeTargets({
      age: 25, sex: "female", height_cm: 165, weight_kg: 60,
      activity_level: "active", goal: "lose",
    })
    // RMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
    // TDEE = 1345.25 * 1.725 = 2320.56
    // calories = round(2320.56 - 500) = 1821
    expect(t.calories).toBe(1821)
    expect(t.protein_g).toBe(Math.round(60 * 2.0)) // 120 (lose = 2.0)
  })

  it("enforces minimum 1200 calories", () => {
    const t = computeTargets({
      age: 70, sex: "female", height_cm: 150, weight_kg: 40,
      activity_level: "sedentary", goal: "lose",
    })
    expect(t.calories).toBe(1200)
  })

  it("uses gain protein multiplier (1.8)", () => {
    const t = computeTargets({
      age: 25, sex: "male", height_cm: 180, weight_kg: 80,
      activity_level: "moderate", goal: "gain",
    })
    expect(t.protein_g).toBe(Math.round(80 * 1.8))
  })

  it("uses recomp protein multiplier (2.0) and -200 delta", () => {
    const t = computeTargets({
      age: 28, sex: "male", height_cm: 178, weight_kg: 82,
      activity_level: "moderate", goal: "recomp",
    })
    expect(t.protein_g).toBe(Math.round(82 * 2.0))
    // Verify recomp uses -200 delta
    const rmr = 10 * 82 + 6.25 * 178 - 5 * 28 + 5
    const expected = Math.round(rmr * 1.55 - 200)
    expect(t.calories).toBe(expected)
  })

  it("handles 'other' sex (neutral average)", () => {
    const t = computeTargets({
      age: 30, sex: "other", height_cm: 170, weight_kg: 70,
      activity_level: "light", goal: "maintain",
    })
    const rmr = 10 * 70 + 6.25 * 170 - 5 * 30 - 78
    const expected = Math.round(rmr * 1.375)
    expect(t.calories).toBe(expected)
  })
})

describe("sumTotals", () => {
  it("returns zeros for empty array", () => {
    const t = sumTotals([])
    expect(t).toEqual({ calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 })
  })

  it("sums multiple meals", () => {
    const meals = [
      { calories: 300, protein_g: 20, carbs_g: 30, fat_g: 10, fiber_g: 5 },
      { calories: 500, protein_g: 30, carbs_g: 50, fat_g: 15, fiber_g: 8 },
    ]
    const t = sumTotals(meals)
    expect(t.calories).toBe(800)
    expect(t.protein_g).toBe(50)
    expect(t.fiber_g).toBe(13)
  })

  it("handles null values gracefully", () => {
    const meals = [
      { calories: null, protein_g: 10, carbs_g: null, fat_g: 5, fiber_g: null },
      { calories: 200, protein_g: null, carbs_g: 20, fat_g: null, fiber_g: 3 },
    ]
    const t = sumTotals(meals)
    expect(t.calories).toBe(200)
    expect(t.protein_g).toBe(10)
    expect(t.carbs_g).toBe(20)
    expect(t.fat_g).toBe(5)
    expect(t.fiber_g).toBe(3)
  })
})

describe("percent", () => {
  it("returns correct percentage", () => {
    expect(percent(50, 100)).toBe(50)
    expect(percent(100, 100)).toBe(100)
  })

  it("caps at 150", () => {
    expect(percent(200, 100)).toBe(150)
  })

  it("returns 0 when target is 0", () => {
    expect(percent(50, 0)).toBe(0)
  })

  it("rounds to nearest integer", () => {
    expect(percent(33, 100)).toBe(33)
    expect(percent(1, 3)).toBe(33) // 33.33 → 33
  })
})
