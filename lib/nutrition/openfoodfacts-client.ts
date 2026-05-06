/**
 * Open Food Facts API client.
 *
 * Used as secondary/fallback source for branded/packaged products.
 * Completely free, no API key required.
 *
 * Endpoints:
 *   GET /cgi/search.pl?search_terms={q}&json=1   — text search
 *   GET /api/v2/product/{barcode}                  — barcode lookup
 *
 * Docs: https://wiki.openfoodfacts.org/API
 */

import type { NutritionLookupResult } from "./types"

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://world.openfoodfacts.org"
const REQUEST_TIMEOUT_MS = 5_000
const USER_AGENT = "NeutriAI/1.0 (https://neutri.ai)"

// ── Raw API response types ──────────────────────────────────────────────────

interface OFFNutriments {
  "energy-kcal_100g"?: number
  energy_100g?: number // kJ fallback
  proteins_100g?: number
  carbohydrates_100g?: number
  fat_100g?: number
  fiber_100g?: number
}

interface OFFProduct {
  code: string
  product_name?: string
  brands?: string
  nutriments?: OFFNutriments
  serving_size?: string
  serving_quantity?: number
  nutriscore_grade?: string
  completeness?: number
}

interface OFFSearchResponse {
  count: number
  products: OFFProduct[]
}

interface OFFProductResponse {
  status: number
  product: OFFProduct
}

// ── Helpers ──────────────────────────────────────────────────────────────────

async function offFetch(url: string): Promise<Response> {
  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { "User-Agent": USER_AGENT },
      signal: controller.signal,
    })
    clearTimeout(timeout)
    return res
  } catch (err) {
    clearTimeout(timeout)
    throw err
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

/**
 * Text search for products on Open Food Facts.
 * Best for branded/packaged items. Returns up to 5 results.
 */
export async function searchOpenFoodFacts(query: string, pageSize = 5): Promise<NutritionLookupResult[]> {
  try {
    const url = `${BASE_URL}/cgi/search.pl?search_terms=${encodeURIComponent(query)}&json=1&page_size=${pageSize}&fields=code,product_name,brands,nutriments,serving_size,serving_quantity,completeness`
    const res = await offFetch(url)
    if (!res.ok) return []

    const data: OFFSearchResponse = await res.json()
    if (!data.products || data.products.length === 0) return []

    return data.products
      .map(normalizeOFFProduct)
      .filter((r): r is NutritionLookupResult => r !== null)
  } catch (err) {
    console.warn("[openfoodfacts] Search failed:", err instanceof Error ? err.message : err)
    return []
  }
}

/**
 * Look up a product by barcode (EAN-13 / UPC-A).
 * Returns a single result or null.
 */
export async function getProductByBarcode(barcode: string): Promise<NutritionLookupResult | null> {
  try {
    const url = `${BASE_URL}/api/v2/product/${encodeURIComponent(barcode)}?fields=code,product_name,brands,nutriments,serving_size,serving_quantity,completeness`
    const res = await offFetch(url)
    if (!res.ok) return null

    const data: OFFProductResponse = await res.json()
    if (data.status !== 1 || !data.product) return null

    return normalizeOFFProduct(data.product)
  } catch (err) {
    console.warn("[openfoodfacts] Barcode lookup failed:", err instanceof Error ? err.message : err)
    return null
  }
}

// ── Normalizer ───────────────────────────────────────────────────────────────

function normalizeOFFProduct(product: OFFProduct): NutritionLookupResult | null {
  const n = product.nutriments
  if (!n) return null

  // Must have at least calories to be useful
  const calories = n["energy-kcal_100g"] ?? (n.energy_100g ? Math.round(n.energy_100g / 4.184) : 0)
  if (calories <= 0) return null

  const name = [product.product_name, product.brands].filter(Boolean).join(" — ") || "Unknown product"

  // Confidence based on data completeness
  const completeness = product.completeness ?? 0
  const confidence: NutritionLookupResult["confidence"] = completeness > 0.7 ? "medium" : "low"

  return {
    fdcId: null,
    source: "openfoodfacts",
    name,
    dataType: "off-branded",
    calories_kcal: Math.round(calories),
    protein_g: Math.round((n.proteins_100g ?? 0) * 10) / 10,
    carbs_g: Math.round((n.carbohydrates_100g ?? 0) * 10) / 10,
    fat_g: Math.round((n.fat_100g ?? 0) * 10) / 10,
    fiber_g: Math.round((n.fiber_100g ?? 0) * 10) / 10,
    servingSize: product.serving_quantity ?? undefined,
    servingUnit: product.serving_size ?? undefined,
    confidence,
  }
}
