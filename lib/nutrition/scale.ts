/**
 * Scale per-100g nutrition values to a specific quantity.
 *
 * This utility eliminates duplicated scaling logic between the
 * API route and tool execute functions.
 */
export function scaleNutrition<
  T extends {
    calories_kcal: number
    protein_g: number
    carbs_g: number
    fat_g: number
    fiber_g: number
  },
>(result: T, quantityG: number): T & { scaled_for_g: number } {
  const factor = quantityG / 100
  return {
    ...result,
    calories_kcal: Math.round(result.calories_kcal * factor),
    protein_g: Math.round(result.protein_g * factor * 10) / 10,
    carbs_g: Math.round(result.carbs_g * factor * 10) / 10,
    fat_g: Math.round(result.fat_g * factor * 10) / 10,
    fiber_g: Math.round(result.fiber_g * factor * 10) / 10,
    scaled_for_g: quantityG,
  }
}
