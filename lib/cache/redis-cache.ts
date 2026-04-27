import { Ratelimit } from "@upstash/ratelimit"
import { Redis } from "@upstash/redis"

/**
 * Enterprise-grade caching and rate limiting with Upstash Redis
 * Provides:
 * - Distributed caching across requests/renders
 * - Rate limiting for API protection
 * - Session/user tracking
 * - Expiring data (memory extraction throttling)
 */

// Initialize Redis client (uses env vars: UPSTASH_REDIS_REST_URL, UPSTASH_REDIS_REST_TOKEN)
const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL,
  token: process.env.UPSTASH_REDIS_REST_TOKEN,
})

/**
 * Generic cache wrapper with TTL support
 */
export class CacheLayer {
  async get<T>(key: string): Promise<T | null> {
    try {
      const value = await redis.get(key)
      return value as T | null
    } catch (error) {
      console.warn(`[redis-cache] Get failed for key ${key}:`, error)
      return null
    }
  }

  async set<T>(key: string, value: T, ttlSeconds: number = 3600): Promise<boolean> {
    try {
      await redis.setex(key, ttlSeconds, JSON.stringify(value))
      return true
    } catch (error) {
      console.warn(`[redis-cache] Set failed for key ${key}:`, error)
      return false
    }
  }

  async delete(key: string): Promise<boolean> {
    try {
      await redis.del(key)
      return true
    } catch (error) {
      console.warn(`[redis-cache] Delete failed for key ${key}:`, error)
      return false
    }
  }

  async invalidatePattern(pattern: string): Promise<void> {
    try {
      // Upstash doesn't support SCAN in REST API, so use specific key patterns
      const keys = await redis.keys(pattern)
      if (keys.length > 0) {
        await redis.del(...keys)
      }
    } catch (error) {
      console.warn(`[redis-cache] Pattern invalidation failed for ${pattern}:`, error)
    }
  }
}

/**
 * User-specific caching
 */
export class UserCache extends CacheLayer {
  getCacheKey(userId: string, type: string, id?: string): string {
    return id ? `user:${userId}:${type}:${id}` : `user:${userId}:${type}`
  }

  async getUserData(userId: string, dataType: string) {
    return this.get(this.getCacheKey(userId, dataType))
  }

  async setUserData(userId: string, dataType: string, data: any, ttlSeconds: number = 3600) {
    return this.set(this.getCacheKey(userId, dataType), data, ttlSeconds)
  }

  async invalidateUser(userId: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:*`)
  }

  async invalidateUserType(userId: string, dataType: string): Promise<void> {
    await this.invalidatePattern(`user:${userId}:${dataType}:*`)
  }
}

/**
 * Conversation-specific caching
 */
export class ConversationCache extends CacheLayer {
  getCacheKey(conversationId: string, type: string): string {
    return `conv:${conversationId}:${type}`
  }

  async getConversationData(conversationId: string, dataType: string) {
    return this.get(this.getCacheKey(conversationId, dataType))
  }

  async setConversationData(
    conversationId: string,
    dataType: string,
    data: any,
    ttlSeconds: number = 3600
  ) {
    return this.set(this.getCacheKey(conversationId, dataType), data, ttlSeconds)
  }

  async invalidateConversation(conversationId: string): Promise<void> {
    await this.invalidatePattern(`conv:${conversationId}:*`)
  }
}

/**
 * Rate limiting for API endpoints
 * Prevents abuse and ensures fair usage
 */
export class RateLimitManager {
  private limits = {
    // Chat API: 10 requests per minute per user
    chatMessage: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(10, "60s"),
      analytics: true,
      prefix: "ratelimit:chat",
    }),

    // Meal logging: 20 per minute per user
    logMeal: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(20, "60s"),
      analytics: true,
      prefix: "ratelimit:meal",
    }),

    // Memory extraction: 3 per hour per user
    memoryExtraction: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(3, "1 h"),
      analytics: true,
      prefix: "ratelimit:memory",
    }),

    // Profile updates: 5 per hour
    profileUpdate: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(5, "1 h"),
      analytics: true,
      prefix: "ratelimit:profile",
    }),

    // API calls (general): 100 per minute per user
    general: new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(100, "60s"),
      analytics: true,
      prefix: "ratelimit:general",
    }),
  }

  async checkLimit(
    type: keyof typeof this.limits,
    userId: string
  ): Promise<{ success: boolean; remaining: number; resetIn?: number }> {
    try {
      const limiter = this.limits[type]
      const result = await limiter.limit(userId)

      return {
        success: result.success,
        remaining: result.remaining,
        resetIn: result.resetAfter ? Math.ceil(result.resetAfter / 1000) : undefined,
      }
    } catch (error) {
      console.error(`[rate-limit] Check failed for ${type}:`, error)
      // Fail open - allow request if rate limiter fails
      return { success: true, remaining: 0 }
    }
  }
}

/**
 * Session tracking and user fingerprinting
 */
export class SessionTracker {
  async trackSession(userId: string, sessionId: string, metadata: Record<string, any>) {
    const key = `session:${sessionId}`
    const sessionData = {
      userId,
      startedAt: new Date().toISOString(),
      ...metadata,
    }

    // Session expires after 24 hours of inactivity
    await redis.setex(key, 24 * 60 * 60, JSON.stringify(sessionData))
  }

  async getSession(sessionId: string) {
    const key = `session:${sessionId}`
    const data = await redis.get(key)
    return data ? (JSON.parse(data as string) as any) : null
  }

  async invalidateSession(sessionId: string) {
    const key = `session:${sessionId}`
    await redis.del(key)
  }
}

/**
 * Distributed locks for critical sections
 * Prevents race conditions in concurrent operations
 */
export class DistributedLock {
  private lockDuration = 5000 // 5 seconds

  async acquire(lockKey: string): Promise<boolean> {
    try {
      const value = `${Date.now()}-${Math.random()}`
      const result = await redis.set(lockKey, value, { nx: true, ex: Math.ceil(this.lockDuration / 1000) })
      return result === "OK"
    } catch (error) {
      console.warn(`[distributed-lock] Acquire failed for ${lockKey}:`, error)
      return false
    }
  }

  async release(lockKey: string): Promise<void> {
    try {
      await redis.del(lockKey)
    } catch (error) {
      console.warn(`[distributed-lock] Release failed for ${lockKey}:`, error)
    }
  }

  async executeWithLock<T>(lockKey: string, fn: () => Promise<T>): Promise<T | null> {
    const acquired = await this.acquire(lockKey)
    if (!acquired) {
      console.warn(`[distributed-lock] Could not acquire lock: ${lockKey}`)
      return null
    }

    try {
      return await fn()
    } finally {
      await this.release(lockKey)
    }
  }
}

/**
 * Singleton instances
 */
export const userCache = new UserCache()
export const conversationCache = new ConversationCache()
export const rateLimitManager = new RateLimitManager()
export const sessionTracker = new SessionTracker()
export const distributedLock = new DistributedLock()

/**
 * Cache invalidation strategies
 */
export const cacheInvalidation = {
  // Invalidate user's nutrition data after logging meal
  async onMealLogged(userId: string) {
    await userCache.invalidateUserType(userId, "nutrition")
  },

  // Invalidate pantry after item changes
  async onPantryUpdated(userId: string) {
    await userCache.invalidateUserType(userId, "pantry")
  },

  // Invalidate memories after extraction
  async onMemoriesExtracted(userId: string) {
    await userCache.invalidateUserType(userId, "memories")
  },

  // Invalidate conversation after message
  async onConversationUpdated(conversationId: string) {
    await conversationCache.invalidateConversation(conversationId)
  },

  // Clear all user data on logout
  async onLogout(userId: string) {
    await userCache.invalidateUser(userId)
  },
}
