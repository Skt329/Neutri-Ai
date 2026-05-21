/**
 * Weekly nutrition report generator.
 * Pure function — no side effects, no DB calls.
 */

export interface WeeklyReportData {
  weekStart: string
  weekEnd: string
  totalMealsLogged: number
  daysWithMeals: number
  avgDailyCalories: number
  avgProtein: number
  avgCarbs: number
  avgFat: number
  bestDay: { date: string; calories: number } | null
  worstDay: { date: string; calories: number } | null
  streakDays: number
  targetAdherence: { calories: number; protein: number }
}

interface MealInput {
  logged_at: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

/**
 * Generate a structured weekly report from raw meal data.
 */
export function generateWeeklyReport(params: {
  meals: MealInput[]
  targets: { calories: number; protein_g: number } | null
  streakDays: number
  weekStart: Date
  weekEnd: Date
}): WeeklyReportData {
  const { meals, targets, streakDays, weekStart, weekEnd } = params

  // Group meals by date (YYYY-MM-DD)
  const byDay = new Map<string, MealInput[]>()
  for (const meal of meals) {
    const day = meal.logged_at.slice(0, 10)
    const existing = byDay.get(day) ?? []
    existing.push(meal)
    byDay.set(day, existing)
  }

  // Compute daily totals
  const dailyTotals = Array.from(byDay.entries()).map(([date, dayMeals]) => ({
    date,
    calories: dayMeals.reduce((s, m) => s + (m.calories ?? 0), 0),
    protein_g: dayMeals.reduce((s, m) => s + (m.protein_g ?? 0), 0),
    carbs_g: dayMeals.reduce((s, m) => s + (m.carbs_g ?? 0), 0),
    fat_g: dayMeals.reduce((s, m) => s + (m.fat_g ?? 0), 0),
  }))

  const daysWithMeals = dailyTotals.length

  // Averages (per day with meals, avoid division by zero)
  const avgDailyCalories = daysWithMeals > 0
    ? Math.round(dailyTotals.reduce((s, d) => s + d.calories, 0) / daysWithMeals)
    : 0
  const avgProtein = daysWithMeals > 0
    ? Math.round(dailyTotals.reduce((s, d) => s + d.protein_g, 0) / daysWithMeals)
    : 0
  const avgCarbs = daysWithMeals > 0
    ? Math.round(dailyTotals.reduce((s, d) => s + d.carbs_g, 0) / daysWithMeals)
    : 0
  const avgFat = daysWithMeals > 0
    ? Math.round(dailyTotals.reduce((s, d) => s + d.fat_g, 0) / daysWithMeals)
    : 0

  // Best/worst day — closest to calorie target wins as "best"
  let bestDay: { date: string; calories: number } | null = null
  let worstDay: { date: string; calories: number } | null = null

  if (targets && daysWithMeals > 0) {
    let bestScore = Infinity
    let worstScore = -Infinity

    for (const day of dailyTotals) {
      const diff = Math.abs(day.calories - targets.calories)
      if (diff < bestScore) { bestScore = diff; bestDay = { date: day.date, calories: day.calories } }
      if (diff > worstScore) { worstScore = diff; worstDay = { date: day.date, calories: day.calories } }
    }
  } else if (daysWithMeals > 0) {
    // No targets — highest calorie day is best, lowest is worst
    const sorted = [...dailyTotals].sort((a, b) => b.calories - a.calories)
    bestDay = { date: sorted[0].date, calories: sorted[0].calories }
    worstDay = { date: sorted[sorted.length - 1].date, calories: sorted[sorted.length - 1].calories }
  }

  // Target adherence (percentage of days within 15% of target)
  let calorieAdherence = 0
  let proteinAdherence = 0

  if (targets && daysWithMeals > 0) {
    const calThreshold = targets.calories * 0.15
    const protThreshold = targets.protein_g * 0.15
    let calHits = 0
    let protHits = 0

    for (const day of dailyTotals) {
      if (Math.abs(day.calories - targets.calories) <= calThreshold) calHits++
      if (Math.abs(day.protein_g - targets.protein_g) <= protThreshold) protHits++
    }

    calorieAdherence = Math.round((calHits / daysWithMeals) * 100)
    proteinAdherence = Math.round((protHits / daysWithMeals) * 100)
  }

  return {
    weekStart: weekStart.toISOString().slice(0, 10),
    weekEnd: weekEnd.toISOString().slice(0, 10),
    totalMealsLogged: meals.length,
    daysWithMeals,
    avgDailyCalories,
    avgProtein,
    avgCarbs,
    avgFat,
    bestDay,
    worstDay,
    streakDays,
    targetAdherence: { calories: calorieAdherence, protein: proteinAdherence },
  }
}

/**
 * Format a weekly report into a Markdown message for the chat.
 */
export function formatReportMarkdown(report: WeeklyReportData): string {
  const lines: string[] = [
    `## 📊 Weekly Nutrition Report`,
    `**${report.weekStart} → ${report.weekEnd}**\n`,
    `### Overview`,
    `- **Meals logged:** ${report.totalMealsLogged} across ${report.daysWithMeals} days`,
    `- **Current streak:** ${report.streakDays} days 🔥\n`,
    `### Daily Averages`,
    `| Macro | Average |`,
    `|-------|---------|`,
    `| Calories | ${report.avgDailyCalories} kcal |`,
    `| Protein | ${report.avgProtein}g |`,
    `| Carbs | ${report.avgCarbs}g |`,
    `| Fat | ${report.avgFat}g |\n`,
  ]

  if (report.bestDay || report.worstDay) {
    lines.push(`### Highlights`)
    if (report.bestDay) lines.push(`- **Best day:** ${report.bestDay.date} (${report.bestDay.calories} kcal)`)
    if (report.worstDay) lines.push(`- **Needs improvement:** ${report.worstDay.date} (${report.worstDay.calories} kcal)`)
    lines.push("")
  }

  if (report.targetAdherence.calories > 0 || report.targetAdherence.protein > 0) {
    lines.push(`### Target Adherence`)
    lines.push(`- Calorie target hit: **${report.targetAdherence.calories}%** of days`)
    lines.push(`- Protein target hit: **${report.targetAdherence.protein}%** of days`)
    lines.push("")
  }

  lines.push(`*Keep going! Consistency is the key to progress.* 💪`)

  return lines.join("\n")
}
