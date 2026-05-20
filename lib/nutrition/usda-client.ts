/**
 * USDA FoodData Central API client.
 *
 * Endpoints:
 *   POST /fdc/v1/foods/search  — full-text food search
 *   GET  /fdc/v1/food/{fdcId}  — single food detail
 *
 * Docs: https://fdc.nal.usda.gov/api-guide
 * Rate limit: 1,000 req/hr per IP (we cap at 900 for safety)
 */

import type { NutritionLookupResult } from "./types"
import { limitUSDA } from "@/lib/redis"

// ── Constants ────────────────────────────────────────────────────────────────

const BASE_URL = "https://api.nal.usda.gov/fdc/v1"
const REQUEST_TIMEOUT_MS = 5_000
const MAX_RETRIES = 1
const RETRY_DELAY_MS = 800

/** USDA nutrient IDs for our 5 target macros. */
const NUTRIENT_IDS = {
  ENERGY: 1008, // kcal
  PROTEIN: 1003,
  CARBS: 1005,
  FAT: 1004,
  FIBER: 1079,
} as const

/** Data types in priority order (most authoritative first). */
export const USDA_DATA_TYPES = [
  "Foundation",
  "SR Legacy",
  "Survey (FNDDS)",
  "Branded",
] as const

export type USDADataType = (typeof USDA_DATA_TYPES)[number]

// ── Upstash Redis rate limiter (sliding window, 900/hr) ─────────────────────────

async function checkRateLimit(): Promise<boolean> {
  try {
    const res = await limitUSDA()
    return res.success
  } catch (err) {
    console.warn("[usda] Rate limiter error, default to true:", err)
    return true
  }
}

// ── API helpers ──────────────────────────────────────────────────────────────

function getApiKey(): string {
  const key = process.env.USDA_API_KEY
  if (!key) throw new Error("USDA_API_KEY is not configured. Register at https://fdc.nal.usda.gov/api-key-signup")
  return key
}

async function fetchWithRetry(url: string, init: RequestInit, retries = MAX_RETRIES): Promise<Response> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS)
      const res = await fetch(url, { ...init, signal: controller.signal })
      clearTimeout(timeout)
      if (res.ok) return res
      // 429 = rate limited, retry
      if (res.status === 429 && attempt < retries) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
        continue
      }
      throw new Error(`USDA API ${res.status}: ${res.statusText}`)
    } catch (err) {
      if (attempt < retries && err instanceof Error && (err.name === "AbortError" || err.message.includes("fetch"))) {
        await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * (attempt + 1)))
        continue
      }
      throw err
    }
  }
  throw new Error("USDA API: max retries exceeded")
}

// ── Raw USDA response types ─────────────────────────────────────────────────

interface USDAFoodNutrient {
  nutrientId: number
  nutrientName: string
  nutrientNumber: string
  value: number
  unitName: string
}

interface USDASearchFood {
  fdcId: number
  description: string
  dataType: string
  foodNutrients: USDAFoodNutrient[]
  servingSize?: number
  servingSizeUnit?: string
  brandName?: string
  brandOwner?: string
}

interface USDASearchResponse {
  totalHits: number
  foods: USDASearchFood[]
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface USDASearchParams {
  query: string
  dataType?: USDADataType[]
  pageSize?: number
  requireAllWords?: boolean
}

/**
 * Search USDA FoodData Central for foods matching the query.
 * Returns normalized nutrition results sorted by data-type priority.
 */
export async function searchUSDA(params: USDASearchParams): Promise<NutritionLookupResult[]> {
  if (!(await checkRateLimit())) {
    console.warn("[usda] Rate limit reached (900/hr), skipping USDA search")
    return []
  }

  const apiKey = getApiKey()
  const body = {
    query: params.query,
    dataType: params.dataType ?? USDA_DATA_TYPES.slice(),
    pageSize: params.pageSize ?? 5,
    requireAllWords: params.requireAllWords ?? false,
    // Only request the nutrients we need
    nutrients: [NUTRIENT_IDS.ENERGY, NUTRIENT_IDS.PROTEIN, NUTRIENT_IDS.CARBS, NUTRIENT_IDS.FAT, NUTRIENT_IDS.FIBER],
  }

  const res = await fetchWithRetry(`${BASE_URL}/foods/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Api-Key": apiKey },
    body: JSON.stringify(body),
  })

  const data: USDASearchResponse = await res.json()
  if (!data.foods || data.foods.length === 0) return []

  return data.foods.map(normalizeUSDAFood).filter((r): r is NutritionLookupResult => r !== null)
}

/**
 * Get full nutrient details for a specific USDA food by FDC ID.
 */
export async function getUSDAFoodDetails(fdcId: number): Promise<NutritionLookupResult | null> {
  if (!(await checkRateLimit())) {
    console.warn("[usda] Rate limit reached, skipping detail fetch")
    return null
  }

  const apiKey = getApiKey()
  const res = await fetchWithRetry(`${BASE_URL}/food/${fdcId}?nutrients=${Object.values(NUTRIENT_IDS).join(",")}`, {
    method: "GET",
    headers: { "X-Api-Key": apiKey },
  })

  const food: USDASearchFood = await res.json()
  return normalizeUSDAFood(food)
}

// ── Normalizer ───────────────────────────────────────────────────────────────

function extractNutrient(nutrients: USDAFoodNutrient[], nutrientId: number): number {
  const match = nutrients.find((n) => n.nutrientId === nutrientId)
  return match?.value ?? 0
}

function normalizeUSDAFood(food: USDASearchFood): NutritionLookupResult | null {
  if (!food.foodNutrients || food.foodNutrients.length === 0) return null

  const calories = extractNutrient(food.foodNutrients, NUTRIENT_IDS.ENERGY)
  // Skip entries with 0 calories (likely incomplete data)
  if (calories <= 0) return null

  const dataTypePriority = USDA_DATA_TYPES.indexOf(food.dataType as USDADataType)
  const confidence: NutritionLookupResult["confidence"] =
    dataTypePriority <= 1 ? "high" : dataTypePriority === 2 ? "medium" : "low"

  return {
    fdcId: food.fdcId,
    source: "usda",
    name: food.description,
    dataType: food.dataType,
    calories_kcal: Math.round(calories),
    protein_g: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.PROTEIN) * 10) / 10,
    carbs_g: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.CARBS) * 10) / 10,
    fat_g: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.FAT) * 10) / 10,
    fiber_g: Math.round(extractNutrient(food.foodNutrients, NUTRIENT_IDS.FIBER) * 10) / 10,
    servingSize: food.servingSize ?? undefined,
    servingUnit: food.servingSizeUnit ?? undefined,
    confidence,
  }
}
