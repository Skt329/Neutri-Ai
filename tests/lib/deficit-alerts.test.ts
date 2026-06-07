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
  describe("no alerts scenarios", () => {
    it("returns empty array when targets is null", () => {
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
        now: new Date(2026, 4, 21, 15, 0),
      })
      expect(alerts).toEqual([])
    })

    it("returns no alerts when all targets are met at 9pm", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ calories: 1900, protein_g: 120, fiber_g: 30 })],
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 21, 0),
      })
      expect(alerts).toHaveLength(0)
    })
  })

  describe("protein alerts", () => {
    it("alerts with severity info when 20-49g protein missing at 5pm+", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ protein_g: 90 })], // 30g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 18, 0),
      })
      const a = alerts.find((a) => a.kind === "protein")
      expect(a).toBeDefined()
      expect(a!.severity).toBe("info")
      expect(a!.title).toContain("30g protein")
    })

    it("alerts with severity warning when >=50g protein missing", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ protein_g: 60 })], // 60g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 18, 0),
      })
      const a = alerts.find((a) => a.kind === "protein")
      expect(a!.severity).toBe("warning")
    })

    it("does not alert protein when missing < 20g", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ protein_g: 105 })], // 15g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 18, 0),
      })
      expect(alerts.find((a) => a.kind === "protein")).toBeUndefined()
    })

    it("includes a quickFix suggestion", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ protein_g: 70 })], // 50g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 18, 0),
      })
      const a = alerts.find((a) => a.kind === "protein")
      expect(a!.quickFix).toBeDefined()
      expect(a!.quickFix!.length).toBeGreaterThan(0)
    })
  })

  describe("fiber alerts", () => {
    it("alerts fiber deficit after 6pm when >=10g missing", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ fiber_g: 10, protein_g: 120, calories: 2000 })], // 20g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 19, 0),
      })
      const a = alerts.find((a) => a.kind === "fiber")
      expect(a).toBeDefined()
      expect(a!.severity).toBe("info")
    })

    it("does not alert fiber when missing < 10g", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ fiber_g: 22, protein_g: 120, calories: 2000 })], // 8g missing
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 19, 0),
      })
      expect(alerts.find((a) => a.kind === "fiber")).toBeUndefined()
    })

    it("does not alert fiber before 6pm", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ fiber_g: 5, protein_g: 120, calories: 2000 })],
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 17, 30),
      })
      expect(alerts.find((a) => a.kind === "fiber")).toBeUndefined()
    })
  })

  describe("calorie alerts", () => {
    it("alerts calorie undereating after 8pm when < 70%", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ calories: 1000, protein_g: 120, fiber_g: 30 })], // 50%
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 21, 0),
      })
      const a = alerts.find((a) => a.kind === "calories_low")
      expect(a).toBeDefined()
      expect(a!.message).toContain("1000")
    })

    it("alerts calorie overshoot after 8pm when > 115%", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ calories: 2500, protein_g: 120, fiber_g: 30 })], // 125%
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 21, 0),
      })
      const a = alerts.find((a) => a.kind === "calories_high")
      expect(a).toBeDefined()
      expect(a!.severity).toBe("warning")
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

    it("does not alert calories before 8pm", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ calories: 500, protein_g: 120, fiber_g: 30 })],
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 19, 30),
      })
      expect(alerts.find((a) => a.kind === "calories_low")).toBeUndefined()
    })
  })

  describe("multiple simultaneous alerts", () => {
    it("returns protein + fiber + calorie_low alerts together at 9pm", () => {
      const alerts = buildDeficitAlerts({
        meals: [makeMeal({ calories: 800, protein_g: 30, fiber_g: 5 })],
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 21, 0),
      })
      const kinds = alerts.map((a) => a.kind)
      expect(kinds).toContain("protein")
      expect(kinds).toContain("fiber")
      expect(kinds).toContain("calories_low")
      expect(alerts.length).toBe(3)
    })
  })

  describe("empty meals with targets", () => {
    it("alerts all deficits at 9pm with zero intake", () => {
      const alerts = buildDeficitAlerts({
        meals: [],
        targets: makeTargets(),
        now: new Date(2026, 4, 21, 21, 0),
      })
      const kinds = alerts.map((a) => a.kind)
      expect(kinds).toContain("protein")
      expect(kinds).toContain("fiber")
      expect(kinds).toContain("calories_low")
    })
  })
})
