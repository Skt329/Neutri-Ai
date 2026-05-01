import { cache } from "react"
import { createClient } from "./server"
import type { MealLog, NutritionTargets, PantryItem, WeightLog } from "@/lib/types"

// ─── Cache Tags ──────────────────────────────────────────────────────
// Centralised tag constants used by server actions for surgical
// revalidation via revalidateTag(TAG, { expire: 0 }).
export const CACHE_TAGS = {
  meals: "meals",
  targets: "targets",
  pantry: "pantry",
  profile: "profile",
  weights: "weights",
  conversations: "conversations",
} as const

// ─── Helpers ─────────────────────────────────────────────────────────
// React cache() deduplicates within a single server render (request),
// so if both layout + page call the same loader, the query runs once.
//
// We create the Supabase client OUTSIDE any cache wrapper and pass
// it as a parameter — this avoids the "cookies() inside unstable_cache"
// restriction because React cache() allows dynamic data sources.

/**
 * Request-scoped Supabase client.
 * Deduped across all callers within the same render pass.
 */
const getSupabase = cache(async () => await createClient())

// ─── Nutrition Targets ───────────────────────────────────────────────
export const getCachedTargets = cache(async (userId: string) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("nutrition_targets")
    .select("*")
    .eq("user_id", userId)
    .order("effective_from", { ascending: false })
    .limit(1)
    .maybeSingle<NutritionTargets>()
  return data
})

// ─── Today's Meals ───────────────────────────────────────────────────
export const getCachedTodayMeals = cache(async (userId: string, dayStartISO: string) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", userId)
    .gte("logged_at", dayStartISO)
    .order("logged_at", { ascending: false })
    .returns<MealLog[]>()
  return data ?? []
})

// ─── All Meals (history) ─────────────────────────────────────────────
// Selects only columns needed for the list view, avoiding heavy
// JSONB `items` payloads.  Capped at 100 rows (paginate client-side).
export const getCachedAllMeals = cache(async (userId: string) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("meal_logs")
    .select("id, user_id, description, meal_type, calories, protein_g, carbs_g, fat_g, fiber_g, logged_at, source, created_at")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(100)
    .returns<MealLog[]>()
  return data ?? []
})

// ─── Pantry Items ────────────────────────────────────────────────────
export const getCachedPantryItems = cache(async (userId: string) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", userId)
    .order("name")
    .returns<PantryItem[]>()
  return data ?? []
})

// ─── Weight Logs ─────────────────────────────────────────────────────
export const getCachedWeightLogs = cache(async (userId: string) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("weight_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false })
    .limit(10)
    .returns<WeightLog[]>()
  return data ?? []
})

// ─── Conversations list ──────────────────────────────────────────────
export const getCachedConversations = cache(async (userId: string, limit = 50) => {
  const supabase = await getSupabase()
  const { data } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(limit)
  return data ?? []
})
