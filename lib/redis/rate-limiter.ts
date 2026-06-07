/**
 * Rate limiting with Upstash Ratelimit and in-memory fallback.
 */
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './client'

export interface RateLimitResult {
  success: boolean
  remaining: number
  limit: number
  reset: number
}

// ── In-memory fallback ───────────────────────────────────────────────────

const memoryRateLimits = new Map<string, number[]>()

function memoryLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now()
  const timestamps = memoryRateLimits.get(key) ?? []
  const valid = timestamps.filter((t) => now - t < windowMs)

  if (valid.length >= limit) {
    memoryRateLimits.set(key, valid)
    return { success: false, remaining: 0, limit, reset: now + windowMs }
  }

  valid.push(now)
  memoryRateLimits.set(key, valid)
  return { success: true, remaining: limit - valid.length, limit, reset: now + windowMs }
}

// ── Upstash limiters ─────────────────────────────────────────────────────

const chatLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(20, '1 m'), analytics: true, prefix: 'neutriai_chat_limit' })
  : null

const usdaLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(900, '1 h'), analytics: true, prefix: 'neutriai_usda_limit' })
  : null

const nutritionLimiter = redis
  ? new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(10, '1 m'), analytics: true, prefix: 'neutriai_nutrition_limit' })
  : null

// ── Public API ───────────────────────────────────────────────────────────

async function withUpstash(
  limiter: Ratelimit | null,
  key: string,
  fallbackKey: string,
  fallbackLimit: number,
  fallbackWindowMs: number,
): Promise<RateLimitResult> {
  if (limiter) {
    try {
      const res = await limiter.limit(key)
      return { success: res.success, remaining: res.remaining, limit: res.limit, reset: res.reset }
    } catch (err) {
      console.warn('[redis] Rate limit check failed, falling back to memory:', err)
    }
  }
  return memoryLimit(fallbackKey, fallbackLimit, fallbackWindowMs)
}

export const limitChat = (userId: string) =>
  withUpstash(chatLimiter, userId, `chat:${userId}`, 20, 60_000)

export const limitUSDA = () =>
  withUpstash(usdaLimiter, 'global_usda', 'usda:global', 900, 3600_000)

export const limitNutrition = (userId: string) =>
  withUpstash(nutritionLimiter, userId, `nutrition:${userId}`, 10, 60_000)
