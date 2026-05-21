import { describe, it, expect } from "vitest"
import { generateWeeklyReport, formatReportMarkdown } from "@/lib/ai/weekly-report"

function makeMeal(date: string, cals: number, protein = 30, carbs = 50, fat = 15) {
  return { logged_at: `${date}T12:00:00Z`, calories: cals, protein_g: protein, carbs_g: carbs, fat_g: fat }
}

const weekStart = new Date("2025-01-06")
const weekEnd = new Date("2025-01-12")

describe("generateWeeklyReport", () => {
  it("returns zeros for no meals", () => {
    const report = generateWeeklyReport({
      meals: [], targets: null, streakDays: 0, weekStart, weekEnd,
    })
    expect(report.totalMealsLogged).toBe(0)
    expect(report.daysWithMeals).toBe(0)
    expect(report.avgDailyCalories).toBe(0)
    expect(report.avgProtein).toBe(0)
    expect(report.bestDay).toBeNull()
    expect(report.worstDay).toBeNull()
  })

  it("calculates correct averages for 3 days of meals", () => {
    const meals = [
      makeMeal("2025-01-06", 2000, 100, 250, 70),
      makeMeal("2025-01-07", 1800, 90, 200, 60),
      makeMeal("2025-01-07", 200, 10, 30, 5), // 2nd meal same day
      makeMeal("2025-01-08", 2200, 110, 280, 80),
    ]
    const report = generateWeeklyReport({
      meals, targets: null, streakDays: 3, weekStart, weekEnd,
    })
    expect(report.totalMealsLogged).toBe(4)
    expect(report.daysWithMeals).toBe(3)
    // Day 1: 2000, Day 2: 2000, Day 3: 2200 → avg = 2067
    expect(report.avgDailyCalories).toBe(Math.round((2000 + 2000 + 2200) / 3))
    expect(report.streakDays).toBe(3)
  })

  it("finds best/worst day based on calorie target proximity", () => {
    const meals = [
      makeMeal("2025-01-06", 2000),
      makeMeal("2025-01-07", 1500),
      makeMeal("2025-01-08", 2500),
    ]
    const report = generateWeeklyReport({
      meals,
      targets: { calories: 2000, protein_g: 120 },
      streakDays: 3,
      weekStart,
      weekEnd,
    })
    // Best = closest to 2000 → Jan 06 (diff=0)
    expect(report.bestDay?.date).toBe("2025-01-06")
    expect(report.bestDay?.calories).toBe(2000)
    // Worst = farthest from 2000 → Jan 07 or Jan 08 (both diff=500)
    expect(report.worstDay?.calories).toSatisfy(
      (c: number) => Math.abs(c - 2000) === 500,
    )
  })

  it("calculates calorie adherence correctly", () => {
    const meals = [
      makeMeal("2025-01-06", 2000), // within 15% of 2000 ✓
      makeMeal("2025-01-07", 1500), // 25% off ✗
      makeMeal("2025-01-08", 1900), // within 5% ✓
      makeMeal("2025-01-09", 2100), // within 5% ✓
    ]
    const report = generateWeeklyReport({
      meals,
      targets: { calories: 2000, protein_g: 120 },
      streakDays: 4,
      weekStart,
      weekEnd,
    })
    // 3 out of 4 days within 15% = 75%
    expect(report.targetAdherence.calories).toBe(75)
  })

  it("handles single meal correctly", () => {
    const meals = [makeMeal("2025-01-06", 1800, 80, 200, 55)]
    const report = generateWeeklyReport({
      meals, targets: null, streakDays: 1, weekStart, weekEnd,
    })
    expect(report.totalMealsLogged).toBe(1)
    expect(report.daysWithMeals).toBe(1)
    expect(report.avgDailyCalories).toBe(1800)
    expect(report.avgProtein).toBe(80)
  })

  it("returns 0% adherence when no targets set", () => {
    const meals = [makeMeal("2025-01-06", 2000)]
    const report = generateWeeklyReport({
      meals, targets: null, streakDays: 1, weekStart, weekEnd,
    })
    expect(report.targetAdherence.calories).toBe(0)
    expect(report.targetAdherence.protein).toBe(0)
  })
})

describe("formatReportMarkdown", () => {
  it("produces valid markdown with all sections", () => {
    const report = generateWeeklyReport({
      meals: [
        makeMeal("2025-01-06", 2000, 100, 250, 70),
        makeMeal("2025-01-07", 1900, 95, 240, 65),
      ],
      targets: { calories: 2000, protein_g: 100 },
      streakDays: 5,
      weekStart,
      weekEnd,
    })
    const md = formatReportMarkdown(report)
    expect(md).toContain("Weekly Nutrition Report")
    expect(md).toContain("2025-01-06")
    expect(md).toContain("2025-01-12")
    expect(md).toContain("5 days 🔥")
    expect(md).toContain("Calories")
    expect(md).toContain("Protein")
    expect(md).toContain("Target Adherence")
  })
})
