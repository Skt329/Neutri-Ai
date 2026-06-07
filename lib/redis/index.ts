/**
 * Redis module — re-exports for backward compatibility.
 *
 * Consumers can import from '@/lib/redis' as before.
 * Internally, concerns are split into:
 *   - client.ts: connection management
 *   - cache.ts: key-value caching with memory fallback
 *   - rate-limiter.ts: rate limiting with Upstash + memory fallback
 *   - token-tracker.ts: per-user token usage counters
 */

export { redis } from './client'
export { cacheGet as redisGet, cacheSet as redisSet, cacheDel as redisDel, cacheDelByPrefix as redisDelPattern } from './cache'
export { limitChat, limitUSDA, limitNutrition, type RateLimitResult } from './rate-limiter'
export { trackTokenUsage, getTokenUsage, type TokenUsage } from './token-tracker'
