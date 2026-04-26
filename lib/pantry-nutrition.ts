import type { NutritionBasis, PantryItem } from "@/lib/types"

/**
 * Convert an item's declared quantity into its "basis count" — i.e. how many
 * 100g / 100ml / pieces / servings it represents. Returns null if we can't
 * confidently convert (e.g. unit "packs" with no weight info).
 *
 *  - per_100g   → grams ÷ 100
 *  - per_100ml  → milliliters ÷ 100
 *  - per_piece  → count (quantity in pcs / eggs / slices)
 *  - per_serving → count of servings
 */
export function basisCount(item: PantryItem): number | null {
  if (item.quantity == null || item.quantity <= 0) return null
  const unit = (item.unit ?? "").toLowerCase().trim()
  const basis: NutritionBasis = item.nutrition_basis ?? inferBasis(unit)

  switch (basis) {
    case "per_100g": {
      const g = toGrams(item.quantity, unit)
      return g == null ? null : g / 100
    }
    case "per_100ml": {
      const ml = toMilliliters(item.quantity, unit)
      return ml == null ? null : ml / 100
    }
    case "per_piece":
    case "per_serving":
      return item.quantity
    default:
      return null
  }
}

function inferBasis(unit: string): NutritionBasis {
  if (["ml", "l", "liter", "litre", "liters"].includes(unit)) return "per_100ml"
  if (["pcs", "pc", "piece", "pieces", "eggs", "bananas", "apples", "slice", "slices"].includes(unit))
    return "per_piece"
  return "per_100g"
}

function toGrams(qty: number, unit: string): number | null {
  switch (unit) {
    case "g":
    case "gram":
    case "grams":
      return qty
    case "kg":
    case "kilogram":
    case "kilograms":
      return qty * 1000
    case "mg":
      return qty / 1000
    default:
      return null
  }
}

function toMilliliters(qty: number, unit: string): number | null {
  switch (unit) {
    case "ml":
    case "milliliter":
    case "milliliters":
      return qty
    case "l":
    case "liter":
    case "litre":
    case "liters":
    case "litres":
      return qty * 1000
    default:
      return null
  }
}

export interface NutritionTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  /** Items whose total could not be computed (missing quantity or unit). */
  incomplete: number
}

export function computePantryTotals(items: PantryItem[]): NutritionTotals {
  const totals: NutritionTotals = { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0, incomplete: 0 }
  for (const it of items) {
    const mult = basisCount(it)
    if (mult == null || it.calories_kcal == null) {
      if (it.calories_kcal != null) totals.incomplete += 1
      continue
    }
    totals.calories += (it.calories_kcal ?? 0) * mult
    totals.protein_g += (it.protein_g ?? 0) * mult
    totals.carbs_g += (it.carbs_g ?? 0) * mult
    totals.fat_g += (it.fat_g ?? 0) * mult
    totals.fiber_g += (it.fiber_g ?? 0) * mult
  }
  return totals
}

/**
 * Describes the per-item basis for display — "per 100g", "per piece", etc.
 */
export function describeBasis(item: PantryItem): string {
  const basis = item.nutrition_basis ?? inferBasis((item.unit ?? "").toLowerCase())
  if (basis === "per_100g") return "per 100 g"
  if (basis === "per_100ml") return "per 100 ml"
  if (basis === "per_piece") return "per piece"
  return "per serving"
}
