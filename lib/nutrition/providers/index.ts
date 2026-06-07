/**
 * Nutrition Providers — public exports.
 *
 * Register all available providers here. The lookup orchestrator
 * uses this registry to determine the fallback chain.
 */

export type { INutritionProvider } from "./provider.interface"
export { USDAProvider } from "./usda.provider"
export { OpenFoodFactsProvider } from "./openfoodfacts.provider"

/**
 * Default provider registry, ordered by priority.
 * To add a new provider (e.g. Nutritionix):
 *   1. Create nutritionix.provider.ts implementing INutritionProvider
 *   2. Add it here with appropriate priority
 */
import { USDAProvider } from "./usda.provider"
import { OpenFoodFactsProvider } from "./openfoodfacts.provider"
import type { INutritionProvider } from "./provider.interface"

export function createDefaultProviders(): INutritionProvider[] {
  return [
    new USDAProvider(),
    new OpenFoodFactsProvider(),
  ].sort((a, b) => a.priority - b.priority)
}
