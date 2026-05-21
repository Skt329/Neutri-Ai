import { Redis } from "@upstash/redis"
import { Ratelimit } from "@upstash/ratelimit"

const isRedisConfigured =
  typeof process !== "undefined" &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

// Initialize Redis if configured, otherwise null
export const redis = isRedisConfigured ? Redis.fromEnv() : null

// Simple interface for rate limit results
export interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  reset: number
}

// Memory fallbacks for local development
const memoryRateLimits = new Map<string, number[]>()

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const timestamps = memoryRateLimits.get(key) ?? []
  const valid = timestamps.filter((t) => now - t < windowMs)

  if (valid.length >= limit) {
    memoryRateLimits.set(key, valid)
    return {
      success: false,
      remaining: 0,
      limit,
      reset: now + windowMs,
    }
  }

  valid.push(now)
  memoryRateLimits.set(key, valid)
  return {
    success: true,
    remaining: limit - valid.length,
    limit,
    reset: now + windowMs,
  }
}

// In-memory key-value store fallback for Redis operations
interface MemoryStoreEntry {
  value: string
  expires: number
}
const memoryStore = new Map<string, MemoryStoreEntry>()

export const redisGet = async (key: string): Promise<string | null> => {
  if (redis) {
    try {
      return await redis.get<string>(key)
    } catch (err) {
      console.warn("[redis] Get failed, falling back to memory:", err)
    }
  }
  const entry = memoryStore.get(key)
  if (!entry) return null
  if (entry.expires < Date.now()) {
    memoryStore.delete(key)
    return null
  }
  return entry.value
}

export const redisSet = async (key: string, value: string, exSeconds?: number): Promise<void> => {
  if (redis) {
    try {
      if (exSeconds) {
        await redis.set(key, value, { ex: exSeconds })
      } else {
        await redis.set(key, value)
      }
      return
    } catch (err) {
      console.warn("[redis] Set failed, falling back to memory:", err)
    }
  }
  const expires = exSeconds ? Date.now() + exSeconds * 1000 : Infinity
  memoryStore.set(key, { value, expires })
}

export const redisDel = async (key: string): Promise<void> => {
  if (redis) {
    try {
      await redis.del(key)
      return
    } catch (err) {
      console.warn("[redis] Del failed, falling back to memory:", err)
    }
  }
  memoryStore.delete(key)
}

export const redisDelPattern = async (prefix: string): Promise<void> => {
  if (redis) {
    try {
      // Upstash doesn't support SCAN, so delete known keys by prefix
      // For production with many keys, consider a dedicated invalidation key set
      const keys = await redis.keys(`${prefix}*`)
      if (keys.length > 0) await redis.del(...keys)
      return
    } catch (err) {
      console.warn("[redis] DelPattern failed, falling back to memory:", err)
    }
  }
  for (const k of memoryStore.keys()) {
    if (k.startsWith(prefix)) memoryStore.delete(k)
  }
}

// Chat Rate Limiter (20 requests per minute)
let upstashChatLimiter: Ratelimit | null = null
if (redis) {
  upstashChatLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(20, "1 m"),
    analytics: true,
    prefix: "neutriai_chat_limit",
  })
}

export const limitChat = async (userId: string): Promise<RateLimitResult> => {
  if (upstashChatLimiter) {
    try {
      const res = await upstashChatLimiter.limit(userId)
      return {
        success: res.success,
        remaining: res.remaining,
        limit: res.limit,
        reset: res.reset,
      }
    } catch (err) {
      console.warn("[redis] Rate limit check failed, falling back to memory:", err)
    }
  }
  // Local fallback: 20 per minute
  return memoryLimit(`chat:${userId}`, 20, 60_000)
}

// USDA Rate Limiter (900 requests per hour)
let upstashUSDALimiter: Ratelimit | null = null
if (redis) {
  upstashUSDALimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(900, "1 h"),
    analytics: true,
    prefix: "neutriai_usda_limit",
  })
}

export const limitUSDA = async (): Promise<RateLimitResult> => {
  if (upstashUSDALimiter) {
    try {
      const res = await upstashUSDALimiter.limit("global_usda")
      return {
        success: res.success,
        remaining: res.remaining,
        limit: res.limit,
        reset: res.reset,
      }
    } catch (err) {
      console.warn("[redis] USDA rate limit check failed, falling back to memory:", err)
    }
  }
  // Local fallback: 900 per hour
  return memoryLimit("usda:global", 900, 3600_000)
}

// Nutrition API Rate Limiter (10 requests per minute per user)
let upstashNutritionLimiter: Ratelimit | null = null
if (redis) {
  upstashNutritionLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(10, "1 m"),
    analytics: true,
    prefix: "neutriai_nutrition_limit",
  })
}

export const limitNutrition = async (userId: string): Promise<RateLimitResult> => {
  if (upstashNutritionLimiter) {
    try {
      const res = await upstashNutritionLimiter.limit(userId)
      return {
        success: res.success,
        remaining: res.remaining,
        limit: res.limit,
        reset: res.reset,
      }
    } catch (err) {
      console.warn("[redis] Nutrition rate limit check failed, falling back to memory:", err)
    }
  }
  // Local fallback: 10 per minute
  return memoryLimit(`nutrition:${userId}`, 10, 60_000)
}

// ── Per-User Token Usage Tracking ──────────────────────────────────────

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

/**
 * Track token usage for a user. Stores daily and monthly counters in Redis.
 * Keys auto-expire so there's no cleanup needed.
 */
export async function trackTokenUsage(userId: string, tokens: TokenUsage): Promise<void> {
  const now = new Date()
  const dayKey = `tokens:${userId}:${now.toISOString().slice(0, 10)}`    // tokens:uid:2026-05-21
  const monthKey = `tokens:${userId}:${now.toISOString().slice(0, 7)}`   // tokens:uid:2026-05

  if (redis) {
    try {
      // Use pipeline for atomicity and efficiency
      const pipe = redis.pipeline()
      pipe.incrby(`${dayKey}:prompt`, tokens.promptTokens)
      pipe.incrby(`${dayKey}:completion`, tokens.completionTokens)
      pipe.incrby(`${dayKey}:total`, tokens.totalTokens)
      pipe.expire(`${dayKey}:prompt`, 172800)      // 48h TTL
      pipe.expire(`${dayKey}:completion`, 172800)
      pipe.expire(`${dayKey}:total`, 172800)
      pipe.incrby(`${monthKey}:prompt`, tokens.promptTokens)
      pipe.incrby(`${monthKey}:completion`, tokens.completionTokens)
      pipe.incrby(`${monthKey}:total`, tokens.totalTokens)
      pipe.expire(`${monthKey}:prompt`, 3024000)   // 35 day TTL
      pipe.expire(`${monthKey}:completion`, 3024000)
      pipe.expire(`${monthKey}:total`, 3024000)
      await pipe.exec()
      return
    } catch (err) {
      console.warn("[redis] Token tracking failed (non-blocking):", err)
    }
  }

  // In-memory fallback — useful for dev but doesn't persist
  const totalKey = `${dayKey}:total`
  const existing = memoryStore.get(totalKey)
  const prev = existing ? parseInt(existing.value, 10) : 0
  memoryStore.set(totalKey, {
    value: String(prev + tokens.totalTokens),
    expires: Date.now() + 172800_000,
  })
}

/**
 * Get token usage for a user for a given period.
 */
export async function getTokenUsage(
  userId: string,
  period: "day" | "month",
): Promise<TokenUsage> {
  const now = new Date()
  const periodKey =
    period === "day"
      ? `tokens:${userId}:${now.toISOString().slice(0, 10)}`
      : `tokens:${userId}:${now.toISOString().slice(0, 7)}`

  if (redis) {
    try {
      const [prompt, completion, total] = await Promise.all([
        redis.get<number>(`${periodKey}:prompt`),
        redis.get<number>(`${periodKey}:completion`),
        redis.get<number>(`${periodKey}:total`),
      ])
      return {
        promptTokens: prompt ?? 0,
        completionTokens: completion ?? 0,
        totalTokens: total ?? 0,
      }
    } catch {
      // Fall through to default
    }
  }

  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}
