/**
 * Redis cache operations with in-memory fallback.
 */
import { redis } from './client'

interface MemoryStoreEntry {
  value: string
  expires: number
}

const memoryStore = new Map<string, MemoryStoreEntry>()

export async function cacheGet(key: string): Promise<string | null> {
  if (redis) {
    try {
      return await redis.get<string>(key)
    } catch (err) {
      console.warn('[redis] Get failed, falling back to memory:', err)
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

export async function cacheSet(key: string, value: string, exSeconds?: number): Promise<void> {
  if (redis) {
    try {
      if (exSeconds) {
        await redis.set(key, value, { ex: exSeconds })
      } else {
        await redis.set(key, value)
      }
      return
    } catch (err) {
      console.warn('[redis] Set failed, falling back to memory:', err)
    }
  }
  const expires = exSeconds ? Date.now() + exSeconds * 1000 : Infinity
  memoryStore.set(key, { value, expires })
}

export async function cacheDel(key: string): Promise<void> {
  if (redis) {
    try {
      await redis.del(key)
      return
    } catch (err) {
      console.warn('[redis] Del failed, falling back to memory:', err)
    }
  }
  memoryStore.delete(key)
}

export async function cacheDelByPrefix(prefix: string, knownSuffixes: string[]): Promise<void> {
  if (redis) {
    try {
      const keys = knownSuffixes.map(s => `${prefix}${s}`)
      const pipe = redis.pipeline()
      keys.forEach(k => pipe.del(k))
      await pipe.exec()
      return
    } catch (err) {
      console.warn('[redis] DelPattern failed, falling back to memory:', err)
    }
  }
  for (const k of memoryStore.keys()) {
    if (k.startsWith(prefix)) memoryStore.delete(k)
  }
}
