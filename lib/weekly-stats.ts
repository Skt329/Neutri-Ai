import type { DailyBreakdown, MealLog, NutritionTargets, WeeklyStats, WeightLog } from "./types"

/**
 * Build a Sunday-style weekly report from the last 7 local days of meal logs
 * plus any weight entries. Consistency is the average "how close were you to
 * your calorie target" clamped to 0-100%.
 */
export function buildWeeklyStats(opts: {
  meals: MealLog[]
  weights: WeightLog[]
  targets: NutritionTargets | null
  timezone?: string
}): WeeklyStats {
  const { meals, weights, targets } = opts
  const timezone = opts.timezone || "UTC"

  const today = toLocalDateKey(new Date(), timezone)
  // Build the 7-day window ending today.
  const window: string[] = []
  for (let i = 6; i >= 0; i--) window.push(shiftDateKey(today, -i))

  const byDay = new Map<string, DailyBreakdown>()
  for (const date of window) {
    byDay.set(date, { date, calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, mealCount: 0 })
  }

  for (const m of meals) {
    const key = toLocalDateKey(new Date(m.logged_at), timezone)
    const day = byDay.get(key)
    if (!day) continue
    day.calories += m.calories ?? 0
    day.protein_g += m.protein_g ?? 0
    day.carbs_g += m.carbs_g ?? 0
    day.fat_g += m.fat_g ?? 0
    day.fiber_g += m.fiber_g ?? 0
    day.mealCount += 1
  }

  const days = window.map((d) => byDay.get(d)!)
  const loggedDays = days.filter((d) => d.mealCount > 0)
  const avgCalories = loggedDays.length
    ? loggedDays.reduce((a, d) => a + d.calories, 0) / loggedDays.length
    : 0

  const bestDay = loggedDays.length
    ? [...loggedDays].sort((a, b) => b.calories - a.calories)[0]
    : null
  const worstDay = loggedDays.length
    ? [...loggedDays].sort((a, b) => a.calories - b.calories)[0]
    : null

  // Consistency: within ±15% of target → 100%, scales to 0% at ±60%.
  const target = targets?.calories ?? null
  let macroConsistencyPct = 0
  if (target && loggedDays.length) {
    const scores = loggedDays.map((d) => {
      const pctDiff = Math.abs(d.calories - target) / target
      if (pctDiff <= 0.15) return 100
      if (pctDiff >= 0.6) return 0
      return Math.round(100 - ((pctDiff - 0.15) / 0.45) * 100)
    })
    macroConsistencyPct = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
  }

  // Weight change: first vs last entry within the last 14 days (some weeks
  // nobody logs, so widen just for the delta calc).
  const weightWindow = weights
    .filter((w) => {
      const k = toLocalDateKey(new Date(w.logged_at), timezone)
      return k >= shiftDateKey(today, -13) && k <= today
    })
    .sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())
  const startWeightKg = weightWindow[0]?.weight_kg ?? null
  const endWeightKg = weightWindow.at(-1)?.weight_kg ?? null
  const weightChangeKg =
    startWeightKg != null && endWeightKg != null && weightWindow.length > 1
      ? Math.round((endWeightKg - startWeightKg) * 10) / 10
      : null

  return {
    days,
    avgCalories: Math.round(avgCalories),
    bestDay,
    worstDay,
    macroConsistencyPct,
    weightChangeKg,
    startWeightKg,
    endWeightKg,
    totalMealsLogged: loggedDays.reduce((a, d) => a + d.mealCount, 0),
    targetCalories: target,
  }
}

function toLocalDateKey(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    const y = parts.find((p) => p.type === "year")?.value ?? "1970"
    const m = parts.find((p) => p.type === "month")?.value ?? "01"
    const d = parts.find((p) => p.type === "day")?.value ?? "01"
    return `${y}-${m}-${d}`
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10))
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
