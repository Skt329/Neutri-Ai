/**
 * Redis client initialization.
 * Single source of truth for the Redis connection.
 */
import { Redis } from '@upstash/redis'

const isRedisConfigured =
  typeof process !== 'undefined' &&
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN

export const redis = isRedisConfigured ? Redis.fromEnv() : null
