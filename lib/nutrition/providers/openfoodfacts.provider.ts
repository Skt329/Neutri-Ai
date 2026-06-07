/**
 * Open Food Facts provider.
 *
 * Wraps the existing openfoodfacts-client.ts as an INutritionProvider implementation.
 */

import type { INutritionProvider } from "./provider.interface"
import type { NutritionLookupResult } from "../types"
import { searchOpenFoodFacts, getProductByBarcode } from "../openfoodfacts-client"

export class OpenFoodFactsProvider implements INutritionProvider {
  readonly name = "openfoodfacts" as const
  readonly displayName = "Open Food Facts"
  readonly priority = 2 // Secondary — best for branded/packaged products

  async search(query: string, pageSize = 5): Promise<NutritionLookupResult[]> {
    try {
      return await searchOpenFoodFacts(query, pageSize)
    } catch (err) {
      console.warn(`[${this.name}] Search failed:`, err instanceof Error ? err.message : err)
      return []
    }
  }

  async lookupBarcode(barcode: string): Promise<NutritionLookupResult | null> {
    try {
      return await getProductByBarcode(barcode)
    } catch (err) {
      console.warn(`[${this.name}] Barcode lookup failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }
}
