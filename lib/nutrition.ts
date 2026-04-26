import type { ActivityLevel, Goal, Sex } from "./types"

const ACTIVITY_FACTOR: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  active: 1.725,
  very_active: 1.9,
}

const GOAL_CALORIE_DELTA: Record<Goal, number> = {
  lose: -500,
  maintain: 0,
  gain: 400,
  recomp: -200,
}

/**
 * Mifflin-St Jeor Resting Metabolic Rate, then multiplied by activity factor
 * and adjusted by the user's goal.
 */
export function computeTargets(input: {
  age: number
  sex: Sex
  height_cm: number
  weight_kg: number
  activity_level: ActivityLevel
  goal: Goal
}): { calories: number; protein_g: number; carbs_g: number; fat_g: number; fiber_g: number } {
  const { age, sex, height_cm, weight_kg, activity_level, goal } = input

  // RMR - Mifflin-St Jeor
  const rmrBase = 10 * weight_kg + 6.25 * height_cm - 5 * age
  const rmr = sex === "male" ? rmrBase + 5 : sex === "female" ? rmrBase - 161 : rmrBase - 78 // neutral avg

  const tdee = rmr * ACTIVITY_FACTOR[activity_level]
  const calories = Math.max(1200, Math.round(tdee + GOAL_CALORIE_DELTA[goal]))

  // Macro split — protein scaled by goal/bodyweight, fat = 25%, remainder carbs
  const proteinPerKg = goal === "gain" ? 1.8 : goal === "lose" || goal === "recomp" ? 2.0 : 1.6
  const protein_g = Math.round(weight_kg * proteinPerKg)
  const fatCalories = calories * 0.25
  const fat_g = Math.round(fatCalories / 9)
  const proteinCalories = protein_g * 4
  const carbCalories = Math.max(0, calories - proteinCalories - fatCalories)
  const carbs_g = Math.round(carbCalories / 4)
  const fiber_g = Math.round(Math.max(25, (calories / 1000) * 14))

  return { calories, protein_g, carbs_g, fat_g, fiber_g }
}

export function sumTotals<T extends { calories: number | null; protein_g: number | null; carbs_g: number | null; fat_g: number | null; fiber_g: number | null }>(
  meals: T[],
) {
  return meals.reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
      fiber_g: acc.fiber_g + (m.fiber_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
  )
}

export function percent(current: number, target: number): number {
  if (!target) return 0
  return Math.min(150, Math.round((current / target) * 100))
}

export function startOfLocalDayISO(timezone = "UTC"): string {
  const now = new Date()
  // Use Intl API to compute local Y/M/D in the user's timezone, then back to UTC ISO.
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: timezone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  })
  const parts = fmt.formatToParts(now)
  const y = parts.find((p) => p.type === "year")?.value
  const m = parts.find((p) => p.type === "month")?.value
  const d = parts.find((p) => p.type === "day")?.value
  // Construct midnight in that timezone — for simplicity we use plain UTC midnight of the same date,
  // which is correct to within one day for query windows used in the dashboard.
  return `${y}-${m}-${d}T00:00:00.000Z`
}
