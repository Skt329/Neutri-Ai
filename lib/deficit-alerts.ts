import type { DeficitAlert, MealLog, NutritionTargets } from "./types"
import { sumTotals } from "./nutrition"

/**
 * Infer contextual alerts about the user's day so far: protein shortfall after
 * 5pm, fiber shortfall, under/over calorie budget, etc. Meant to surface on
 * the dashboard so the user can act before bed.
 */
export function buildDeficitAlerts(opts: {
  meals: MealLog[]
  targets: NutritionTargets | null
  now?: Date
}): DeficitAlert[] {
  const now = opts.now ?? new Date()
  const hour = now.getHours()
  const alerts: DeficitAlert[] = []
  if (!opts.targets) return alerts

  const totals = sumTotals(opts.meals)
  const { calories, protein_g, fiber_g } = totals
  const target = opts.targets

  // Protein check kicks in after 5pm — the meaningful decision point.
  if (hour >= 17 && target.protein_g) {
    const missing = target.protein_g - protein_g
    if (missing >= 20) {
      alerts.push({
        kind: "protein",
        severity: missing >= 50 ? "warning" : "info",
        title: `${Math.round(missing)}g protein to go`,
        message: `You're ${Math.round(missing)}g short of your ${target.protein_g}g protein target. Dinner is a good moment to catch up.`,
        quickFix: proteinQuickFix(missing),
      })
    }
  }

  // Fiber: only after 6pm, and only meaningful shortfall.
  if (hour >= 18 && target.fiber_g) {
    const missing = target.fiber_g - fiber_g
    if (missing >= 10) {
      alerts.push({
        kind: "fiber",
        severity: "info",
        title: `${Math.round(missing)}g fiber to go`,
        message: `You've had ${Math.round(fiber_g)}g of fiber so far — try adding greens or lentils.`,
        quickFix: "A bowl of dal or a side salad gets you halfway there.",
      })
    }
  }

  // Calorie undereating check (after 8pm).
  if (hour >= 20 && target.calories) {
    const pct = target.calories ? (calories / target.calories) * 100 : 0
    if (pct < 70) {
      alerts.push({
        kind: "calories_low",
        severity: "info",
        title: "Still under your calorie target",
        message: `You've had ${Math.round(calories)} of ${Math.round(target.calories)} kcal. Skipping calories often backfires tomorrow.`,
        quickFix: "A handful of nuts + yogurt is ~300 kcal of easy, quality fuel.",
      })
    } else if (pct > 115) {
      alerts.push({
        kind: "calories_high",
        severity: "warning",
        title: "Over your calorie target",
        message: `You're ${Math.round(calories - target.calories)} kcal over today. No stress — tomorrow starts fresh.`,
      })
    }
  }

  return alerts
}

function proteinQuickFix(missing: number): string {
  if (missing >= 40) {
    return "A protein-heavy dinner (paneer, eggs, chicken, tofu — pick ~150g) closes most of the gap."
  }
  if (missing >= 25) {
    return "Add 2 boiled eggs or a cup of Greek yogurt to dinner."
  }
  return "A scoop of whey or a handful of roasted chana covers the gap."
}
