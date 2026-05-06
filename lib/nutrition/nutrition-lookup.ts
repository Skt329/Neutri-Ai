/**
 * Nutrition lookup orchestrator.
 *
 * Implements the fallback chain:
 *   1. Supabase cache (30-day TTL)
 *   2. USDA Foundation → SR Legacy → FNDDS → Branded
 *   3. Open Food Facts (text or barcode)
 *   4. Empty array (caller falls back to LLM estimation)
 *
 * All results are cached on successful lookup.
 */

import { createClient as createServiceClient } from "@supabase/supabase-js"
import { searchUSDA } from "./usda-client"
import { searchOpenFoodFacts, getProductByBarcode } from "./openfoodfacts-client"
import type { NutritionLookupResult } from "./types"

// ── Cache config ─────────────────────────────────────────────────────────────

const CACHE_TTL_DAYS = 30

/**
 * Service-role Supabase client for the shared nutrition cache.
 * Lazily initialized to avoid import-time env access.
 */
let _serviceClient: ReturnType<typeof createServiceClient> | null = null

function getServiceClient() {
  if (_serviceClient) return _serviceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    console.warn("[nutrition-lookup] Service role client unavailable — cache disabled")
    return null
  }
  _serviceClient = createServiceClient(url, key)
  return _serviceClient
}

// ── Cache key generation ─────────────────────────────────────────────────────

function normalizeCacheKey(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, " ")
}

function barcodeCacheKey(barcode: string): string {
  return `barcode:${barcode.trim()}`
}

// ── Cache read/write ─────────────────────────────────────────────────────────

// Cache row shape (nutrition_cache is not yet in generated DB types)
interface CacheRow {
  results: NutritionLookupResult[]
  expires_at: string
}

async function readCache(cacheKey: string): Promise<NutritionLookupResult[] | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any)
      .from("nutrition_cache")
      .select("results, expires_at")
      .eq("cache_key", cacheKey)
      .maybeSingle() as { data: CacheRow | null; error: unknown }

    if (error || !data) return null

    // Check TTL
    if (new Date(data.expires_at) < new Date()) {
      // Expired — delete and return null
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ;(supabase as any).from("nutrition_cache").delete().eq("cache_key", cacheKey).then(() => {})
      return null
    }

    return data.results as NutritionLookupResult[]
  } catch {
    return null
  }
}

async function writeCache(
  cacheKey: string,
  query: string,
  source: "usda" | "openfoodfacts",
  results: NutritionLookupResult[],
): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase || results.length === 0) return

  const expiresAt = new Date()
  expiresAt.setDate(expiresAt.getDate() + CACHE_TTL_DAYS)

  try {
    // Limit cached results to top 3 to keep storage lean
    const topResults = results.slice(0, 3)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from("nutrition_cache").upsert(
      {
        cache_key: cacheKey,
        query,
        source,
        results: topResults,
        expires_at: expiresAt.toISOString(),
      },
      { onConflict: "cache_key" },
    )
  } catch (err) {
    console.warn("[nutrition-lookup] Cache write failed:", err instanceof Error ? err.message : err)
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface LookupOptions {
  /** Product barcode (EAN/UPC) for exact match via Open Food Facts. */
  barcode?: string
  /** Force a specific source. */
  preferredSource?: "usda" | "openfoodfacts"
  /** Skip cache and go straight to API. */
  bypassCache?: boolean
}

/**
 * Look up nutrition data for a food item. Returns normalized per-100g results
 * from the most authoritative available source.
 *
 * @param query - Natural language food name (e.g. "chicken breast raw", "brown rice cooked")
 * @param opts  - Optional barcode, source preference, cache bypass
 * @returns     - Array of results (empty = no data found, caller should use LLM estimation)
 */
export async function lookupNutrition(
  query: string,
  opts?: LookupOptions,
): Promise<NutritionLookupResult[]> {
  const { barcode, preferredSource, bypassCache } = opts ?? {}

  // ── 0. Barcode shortcut ──
  if (barcode) {
    const barcodeKey = barcodeCacheKey(barcode)
    if (!bypassCache) {
      const cached = await readCache(barcodeKey)
      if (cached) return cached
    }
    const result = await getProductByBarcode(barcode)
    if (result) {
      const results = [result]
      writeCache(barcodeKey, barcode, "openfoodfacts", results).catch(() => {})
      return results
    }
    // Fall through to text search if barcode not found
  }

  const cacheKey = normalizeCacheKey(query)

  // ── 1. Cache check ──
  if (!bypassCache) {
    const cached = await readCache(cacheKey)
    if (cached) {
      return cached
    }
  }

  // ── 2. USDA search (primary) ──
  if (preferredSource !== "openfoodfacts") {
    try {
      const usdaResults = await searchUSDA({ query, pageSize: 5 })
      if (usdaResults.length > 0) {
        writeCache(cacheKey, query, "usda", usdaResults).catch(() => {})
        return usdaResults
      }
    } catch (err) {
      console.warn("[nutrition-lookup] USDA search failed:", err instanceof Error ? err.message : err)
    }
  }

  // ── 3. Open Food Facts (fallback for branded items) ──
  try {
    const offResults = await searchOpenFoodFacts(query, 5)
    if (offResults.length > 0) {
      writeCache(cacheKey, query, "openfoodfacts", offResults).catch(() => {})
      return offResults
    }
  } catch (err) {
    console.warn("[nutrition-lookup] OpenFoodFacts search failed:", err instanceof Error ? err.message : err)
  }

  // ── 4. No data found — return empty ──
  return []
}
