/**
 * USDA FoodData Central provider.
 *
 * Wraps the existing usda-client.ts as an INutritionProvider implementation.
 */

import type { INutritionProvider } from "./provider.interface"
import type { NutritionLookupResult } from "../types"
import { searchUSDA, getUSDAFoodDetails } from "../usda-client"

export class USDAProvider implements INutritionProvider {
  readonly name = "usda" as const
  readonly displayName = "USDA FoodData Central"
  readonly priority = 1 // Highest priority — most authoritative

  async search(query: string, pageSize = 5): Promise<NutritionLookupResult[]> {
    try {
      return await searchUSDA({ query, pageSize })
    } catch (err) {
      console.warn(`[${this.name}] Search failed:`, err instanceof Error ? err.message : err)
      return []
    }
  }

  /** USDA doesn't support barcode lookup directly. */
  lookupBarcode = undefined

  /** Get details by FDC ID — useful for drill-down. */
  async getDetails(fdcId: number): Promise<NutritionLookupResult | null> {
    try {
      return await getUSDAFoodDetails(fdcId)
    } catch (err) {
      console.warn(`[${this.name}] Detail fetch failed:`, err instanceof Error ? err.message : err)
      return null
    }
  }
}
