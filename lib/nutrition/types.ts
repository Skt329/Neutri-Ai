/**
 * Shared types for the nutrition lookup service.
 */

export interface NutritionLookupResult {
  /** USDA FDC ID or Open Food Facts barcode ID. */
  fdcId: number | null
  /** Which database this came from. */
  source: "usda" | "openfoodfacts" | "estimated"
  /** Food name as listed in the database. */
  name: string
  /** e.g. "Foundation", "SR Legacy", "Branded", "off-branded" */
  dataType: string
  /** All values are per 100g unless scaled. */
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  /** Optional serving size info from the database. */
  servingSize?: number
  servingUnit?: string
  /** How trustworthy is this data point. */
  confidence: "high" | "medium" | "low"
}
