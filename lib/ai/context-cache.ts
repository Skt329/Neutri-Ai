/**
 * User context cache — avoids redundant DB queries during rapid conversation.
 *
 * During a fast chat exchange, profile/targets/streak rarely change between
 * messages. This module caches them in Redis with short TTLs so subsequent
 * messages within the window skip the 5 parallel DB queries.
 *
 * Cache invalidation is handled by the chat route's onStepFinish callback
 * when write tools (log_meal, update_profile, set_targets) execute.
 */

import { redisGet, redisSet, redisDel } from "@/lib/redis"
import type { NutritionTargets, Profile, StreakInfo } from "@/lib/types"

// ── Cache key helpers ─────────────────────────────────────────────────

const CACHE_PREFIX = "ctx"

function key(userId: string, field: string): string {
  return `${CACHE_PREFIX}:${userId}:${field}`
}

// ── TTLs (seconds) ────────────────────────────────────────────────────

const TTL = {
  profile: 300,      // 5 min — rarely changes
  targets: 300,      // 5 min — rarely changes
  dailyTotals: 120,  // 2 min — changes on meal log
  streak: 600,       // 10 min — changes at most once/day
  memories: 600,     // 10 min — changes on cron extraction
} as const

// ── Types ─────────────────────────────────────────────────────────────

export interface DailyTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
}

export interface CachedContext {
  profile: Profile | null
  targets: NutritionTargets | null
  dailyTotals: DailyTotals | null
  streak: StreakInfo | null
  mealGapHours: number | null
  memories: Array<{ content: string }>
}

// ── Getters ───────────────────────────────────────────────────────────

export async function getCachedProfile(userId: string): Promise<Profile | null | undefined> {
  const raw = await redisGet(key(userId, "profile"))
  if (raw === null) return undefined // cache miss
  try {
    return JSON.parse(raw) as Profile | null
  } catch {
    return undefined
  }
}

export async function getCachedTargets(userId: string): Promise<NutritionTargets | null | undefined> {
  const raw = await redisGet(key(userId, "targets"))
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as NutritionTargets | null
  } catch {
    return undefined
  }
}

export async function getCachedDailyTotals(userId: string): Promise<DailyTotals | null | undefined> {
  const raw = await redisGet(key(userId, "dailyTotals"))
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as DailyTotals | null
  } catch {
    return undefined
  }
}

export async function getCachedStreak(userId: string): Promise<StreakInfo | null | undefined> {
  const raw = await redisGet(key(userId, "streak"))
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as StreakInfo | null
  } catch {
    return undefined
  }
}

export async function getCachedMemories(userId: string): Promise<Array<{ content: string }> | undefined> {
  const raw = await redisGet(key(userId, "memories"))
  if (raw === null) return undefined
  try {
    return JSON.parse(raw) as Array<{ content: string }>
  } catch {
    return undefined
  }
}

// ── Setters ───────────────────────────────────────────────────────────

export async function cacheProfile(userId: string, profile: Profile | null): Promise<void> {
  await redisSet(key(userId, "profile"), JSON.stringify(profile), TTL.profile)
}

export async function cacheTargets(userId: string, targets: NutritionTargets | null): Promise<void> {
  await redisSet(key(userId, "targets"), JSON.stringify(targets), TTL.targets)
}

export async function cacheDailyTotals(userId: string, totals: DailyTotals | null): Promise<void> {
  await redisSet(key(userId, "dailyTotals"), JSON.stringify(totals), TTL.dailyTotals)
}

export async function cacheStreak(userId: string, streak: StreakInfo | null): Promise<void> {
  await redisSet(key(userId, "streak"), JSON.stringify(streak), TTL.streak)
}

export async function cacheMemories(userId: string, memories: Array<{ content: string }>): Promise<void> {
  await redisSet(key(userId, "memories"), JSON.stringify(memories), TTL.memories)
}

// ── Invalidation ──────────────────────────────────────────────────────

/** Invalidate daily totals + streak after a meal is logged or deleted */
export async function invalidateMealCache(userId: string): Promise<void> {
  await Promise.all([
    redisDel(key(userId, "dailyTotals")),
    redisDel(key(userId, "streak")),
  ])
}

/** Invalidate profile cache after profile update */
export async function invalidateProfileCache(userId: string): Promise<void> {
  await redisDel(key(userId, "profile"))
}

/** Invalidate targets cache after targets are set */
export async function invalidateTargetsCache(userId: string): Promise<void> {
  await redisDel(key(userId, "targets"))
}

/** Invalidate memories cache (called after cron extraction) */
export async function invalidateMemoriesCache(userId: string): Promise<void> {
  await redisDel(key(userId, "memories"))
}
