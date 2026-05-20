import { describe, it, expect } from "vitest"
import { scaleNutrition } from "@/lib/nutrition/scale"

describe("scaleNutrition", () => {
  const per100g = {
    calories_kcal: 165,
    protein_g: 31.0,
    carbs_g: 0.0,
    fat_g: 3.6,
    fiber_g: 0.0,
  }

  it("scales to 200g correctly", () => {
    const result = scaleNutrition(per100g, 200)
    expect(result.calories_kcal).toBe(330)
    expect(result.protein_g).toBe(62.0)
    expect(result.fat_g).toBe(7.2)
    expect(result.scaled_for_g).toBe(200)
  })

  it("scales to 50g correctly (halved)", () => {
    const result = scaleNutrition(per100g, 50)
    expect(result.calories_kcal).toBe(83) // Math.round(165 * 0.5)
    expect(result.protein_g).toBe(15.5)
  })

  it("100g returns identity", () => {
    const result = scaleNutrition(per100g, 100)
    expect(result.calories_kcal).toBe(165)
    expect(result.protein_g).toBe(31.0)
  })

  it("preserves extra properties on the input", () => {
    const withName = { ...per100g, name: "Chicken Breast", source: "usda" }
    const result = scaleNutrition(withName, 100)
    expect((result as { name: string }).name).toBe("Chicken Breast")
    expect((result as { source: string }).source).toBe("usda")
  })

  it("handles very small quantities", () => {
    const result = scaleNutrition(per100g, 1)
    expect(result.calories_kcal).toBe(2) // Math.round(165 * 0.01)
    expect(result.protein_g).toBe(0.3)
  })

  it("handles very large quantities", () => {
    const result = scaleNutrition(per100g, 1000)
    expect(result.calories_kcal).toBe(1650)
    expect(result.protein_g).toBe(310)
  })
})
