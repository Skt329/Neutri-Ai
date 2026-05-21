import { describe, it, expect } from "vitest"
import { buildDeficitAlerts } from "@/lib/deficit-alerts"
import type { MealLog, NutritionTargets } from "@/lib/types"

function makeMeal(overrides: Partial<MealLog> = {}): MealLog {
  return {
    id: "test", user_id: "user1", logged_at: new Date().toISOString(),
    meal_type: "lunch", description: "test", calories: 0, protein_g: 0,
    carbs_g: 0, fat_g: 0, fiber_g: 0, items: [], source: "chat", created_at: "",
    ...overrides,
  }
}

function makeTargets(overrides: Partial<NutritionTargets> = {}): NutritionTargets {
  return {
    id: "target-1", user_id: "user1", calories: 2000, protein_g: 120, carbs_g: 250,
    fat_g: 65, fiber_g: 30, effective_from: "", created_at: "",
    ...overrides,
  }
}

describe("buildDeficitAlerts", () => {
  it("returns empty array when no targets", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ calories: 100 })],
      targets: null,
      now: new Date(2026, 4, 21, 21, 0),
    })
    expect(alerts).toEqual([])
  })

  it("returns no alerts before 5pm even with deficits", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ protein_g: 10, calories: 200, fiber_g: 2 })],
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 15, 0), // 3pm
    })
    expect(alerts).toEqual([])
  })

  it("alerts protein deficit at 6pm with severity info (20-49g missing)", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ protein_g: 90 })], // 30g missing from 120g target
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 18, 0), // 6pm
    })
    const proteinAlert = alerts.find((a) => a.kind === "protein")
    expect(proteinAlert).toBeDefined()
    expect(proteinAlert!.severity).toBe("info")
    expect(proteinAlert!.title).toContain("30g protein")
  })

  it("alerts protein deficit with severity warning (>=50g missing)", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ protein_g: 60 })], // 60g missing
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 18, 0),
    })
    const proteinAlert = alerts.find((a) => a.kind === "protein")
    expect(proteinAlert!.severity).toBe("warning")
  })

  it("does not alert protein when missing < 20g", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ protein_g: 105 })], // 15g missing
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 18, 0),
    })
    expect(alerts.find((a) => a.kind === "protein")).toBeUndefined()
  })

  it("alerts fiber deficit after 6pm", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ fiber_g: 10, protein_g: 120, calories: 2000 })], // 20g fiber missing
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 19, 0), // 7pm
    })
    const fiberAlert = alerts.find((a) => a.kind === "fiber")
    expect(fiberAlert).toBeDefined()
    expect(fiberAlert!.severity).toBe("info")
  })

  it("alerts calorie undereating after 8pm (< 70%)", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ calories: 1000, protein_g: 120, fiber_g: 30 })], // 50% of 2000
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 21, 0), // 9pm
    })
    const calAlert = alerts.find((a) => a.kind === "calories_low")
    expect(calAlert).toBeDefined()
    expect(calAlert!.message).toContain("1000")
  })

  it("alerts calorie overeating after 8pm (> 115%)", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ calories: 2500, protein_g: 120, fiber_g: 30 })], // 125% of 2000
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 21, 0),
    })
    const calAlert = alerts.find((a) => a.kind === "calories_high")
    expect(calAlert).toBeDefined()
    expect(calAlert!.severity).toBe("warning")
  })

  it("does not alert calories between 70-115%", () => {
    const alerts = buildDeficitAlerts({
      meals: [makeMeal({ calories: 1800, protein_g: 120, fiber_g: 30 })], // 90%
      targets: makeTargets(),
      now: new Date(2026, 4, 21, 21, 0),
    })
    expect(alerts.find((a) => a.kind === "calories_low")).toBeUndefined()
    expect(alerts.find((a) => a.kind === "calories_high")).toBeUndefined()
  })
})
