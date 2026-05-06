/**
 * Nutrition data service — clean re-exports.
 *
 * Usage:
 *   import { lookupNutrition, type NutritionLookupResult } from "@/lib/nutrition"
 */

export { lookupNutrition, type LookupOptions } from "./nutrition-lookup"
export type { NutritionLookupResult } from "./types"
export { searchUSDA, getUSDAFoodDetails } from "./usda-client"
export { searchOpenFoodFacts, getProductByBarcode } from "./openfoodfacts-client"
