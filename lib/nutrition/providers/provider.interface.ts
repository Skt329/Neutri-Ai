/**
 * Nutrition Provider Interface.
 *
 * Strategy pattern — allows swapping USDA, OpenFoodFacts,
 * or future providers (Nutritionix, Edamam, FatSecret)
 * without modifying the lookup orchestrator.
 */

import type { NutritionLookupResult } from "../types"

/**
 * Contract for any nutrition data provider.
 * Implementations must normalize results to NutritionLookupResult.
 */
export interface INutritionProvider {
  /** Unique identifier for this provider (e.g. 'usda', 'openfoodfacts'). */
  readonly name: string

  /** Display name for user-facing attribution. */
  readonly displayName: string

  /** Priority (lower = higher priority). Used for fallback ordering. */
  readonly priority: number

  /**
   * Search for foods matching the query.
   * @returns Normalized results or empty array on failure.
   */
  search(query: string, pageSize?: number): Promise<NutritionLookupResult[]>

  /**
   * Look up a product by barcode (optional — not all providers support this).
   * @returns A single result or null.
   */
  lookupBarcode?(barcode: string): Promise<NutritionLookupResult | null>
}
