/**
 * Nutrition data service — clean re-exports.
 *
 * Usage:
 *   import { lookupNutrition, type NutritionLookupResult } from "@/lib/nutrition"
 *
 * Strategy pattern providers (for extending with new data sources):
 *   import { createDefaultProviders, type INutritionProvider } from "@/lib/nutrition"
 */

export { lookupNutrition, type LookupOptions } from "./nutrition-lookup"
export type { NutritionLookupResult } from "./types"
export { searchUSDA, getUSDAFoodDetails } from "./usda-client"
export { searchOpenFoodFacts, getProductByBarcode } from "./openfoodfacts-client"
export { scaleNutrition } from "./scale"

// Strategy pattern providers
export { createDefaultProviders, type INutritionProvider } from "./providers"
export { USDAProvider } from "./providers/usda.provider"
export { OpenFoodFactsProvider } from "./providers/openfoodfacts.provider"

