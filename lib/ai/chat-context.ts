/**
 * Chat context loading — fetches user profile, targets, daily totals,
 * streak, and memories with Redis cache-first strategy.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { NutritionTargets, Profile } from "@/lib/types"
import { sumTotals } from "@/lib/nutrition"
import { computeStreakInfo } from "@/lib/streaks"
import { computeMealGap, type MealGap } from "@/lib/meal-gaps"
import { retrieveMemories } from "@/lib/ai/memory"
import {
  getCachedProfile, getCachedTargets, getCachedDailyTotals,
  getCachedStreak, getCachedMemories,
  cacheProfile, cacheTargets, cacheDailyTotals,
  cacheStreak, cacheMemories,
} from "@/lib/ai/context-cache"

export interface ChatContext {
  profile: Profile | null
  targets: NutritionTargets | null
  totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  streak: ReturnType<typeof computeStreakInfo>
  gap: MealGap | null
  memories: Array<{ content: string }>
  cacheHits: number
}

/**
 * Load all context required for a chat turn. Uses Redis cache first,
 * falls back to Supabase queries for cache misses.
 */
export async function loadChatContext(
  supabase: SupabaseClient,
  userId: string,
  lastUserText: string,
): Promise<ChatContext> {
  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
  const streakSince = new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString()

  // Try cache first
  const [cachedProfile, cachedTargets, cachedTotals, cachedStreak, cachedMems] = await Promise.all([
    getCachedProfile(userId),
    getCachedTargets(userId),
    getCachedDailyTotals(userId),
    getCachedStreak(userId),
    getCachedMemories(userId),
  ])

  const needProfile = cachedProfile === undefined
  const needTargets = cachedTargets === undefined
  const needTotals = cachedTotals === undefined
  const needStreak = cachedStreak === undefined
  const needMemories = cachedMems === undefined
  const cacheHits = [!needProfile, !needTargets, !needTotals, !needStreak, !needMemories].filter(Boolean).length

  // Only query what we need
  const [profileResult, targetsResult, todayMealsResult, streakMealsResult, vectorMemories] = await Promise.all([
    needProfile
      ? supabase.from("profiles").select("*").eq("id", userId).maybeSingle<Profile>()
      : { data: cachedProfile },
    needTargets
      ? supabase
          .from("nutrition_targets")
          .select("*")
          .eq("user_id", userId)
          .order("effective_from", { ascending: false })
          .limit(1)
          .maybeSingle<NutritionTargets>()
      : { data: cachedTargets },
    needTotals
      ? supabase
          .from("meal_logs")
          .select("logged_at, calories, protein_g, carbs_g, fat_g, fiber_g")
          .eq("user_id", userId)
          .gte("logged_at", dayStart)
      : null,
    needStreak
      ? supabase
          .from("meal_logs")
          .select("logged_at")
          .eq("user_id", userId)
          .gte("logged_at", streakSince)
      : null,
    needMemories
      ? retrieveMemories({ userId, query: lastUserText, limit: 6 })
      : null,
  ])

  const profile = (profileResult as { data: Profile | null })?.data ?? null
  const targets = (targetsResult as { data: NutritionTargets | null })?.data ?? null

  // Compute totals
  let totals: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  if (!needTotals && cachedTotals) {
    totals = cachedTotals
  } else {
    const todayMeals = (todayMealsResult as { data: any[] | null })?.data ?? []
    totals = sumTotals(todayMeals)
  }

  // Compute streak
  let streak
  if (!needStreak && cachedStreak) {
    streak = cachedStreak
  } else {
    const streakMeals = (streakMealsResult as { data: any[] | null })?.data ?? []
    streak = computeStreakInfo(
      streakMeals.map((m: any) => m.logged_at),
      profile?.timezone || "UTC",
    )
  }

  // Compute meal gap
  let gap: MealGap | null = null
  if (!needTotals && cachedTotals) {
    gap = null // No individual timestamps in cache
  } else {
    const todayMeals = (todayMealsResult as { data: any[] | null })?.data ?? []
    gap = computeMealGap(
      todayMeals.map((m: any) => ({
        id: "", user_id: userId, logged_at: m.logged_at,
        meal_type: null, description: "",
        calories: m.calories ?? 0, protein_g: m.protein_g ?? 0,
        carbs_g: m.carbs_g ?? 0, fat_g: m.fat_g ?? 0, fiber_g: m.fiber_g ?? 0,
        items: [], source: "chat", created_at: "",
      })),
      now,
    )
  }

  // Build memories
  let memories: Array<{ content: string }>
  if (!needMemories && cachedMems) {
    memories = cachedMems
  } else {
    const vMems = vectorMemories as string[] | null
    memories = (vMems ?? []).map((content) => ({ content }))
    if (memories.length === 0) {
      const { data: recent } = await supabase
        .from("memories")
        .select("content")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10)
      memories = recent ?? []
    }
  }

  // Cache all freshly fetched data (fire-and-forget)
  const cacheOps: Promise<void>[] = []
  if (needProfile) cacheOps.push(cacheProfile(userId, profile))
  if (needTargets) cacheOps.push(cacheTargets(userId, targets))
  if (needTotals) cacheOps.push(cacheDailyTotals(userId, totals))
  if (needStreak) cacheOps.push(cacheStreak(userId, streak))
  if (needMemories) cacheOps.push(cacheMemories(userId, memories))
  if (cacheOps.length > 0) {
    Promise.all(cacheOps).catch(() => {})
  }

  return { profile, targets, totals, streak, gap, memories, cacheHits }
}
