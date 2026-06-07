/**
 * Per-user token usage tracking with Redis counters.
 */
import { redis } from './client'

export interface TokenUsage {
  promptTokens: number
  completionTokens: number
  totalTokens: number
}

const memoryStore = new Map<string, { value: string; expires: number }>()

export async function trackTokenUsage(userId: string, tokens: TokenUsage): Promise<void> {
  const now = new Date()
  const dayKey = `tokens:${userId}:${now.toISOString().slice(0, 10)}`
  const monthKey = `tokens:${userId}:${now.toISOString().slice(0, 7)}`

  if (redis) {
    try {
      const pipe = redis.pipeline()
      pipe.incrby(`${dayKey}:prompt`, tokens.promptTokens)
      pipe.incrby(`${dayKey}:completion`, tokens.completionTokens)
      pipe.incrby(`${dayKey}:total`, tokens.totalTokens)
      pipe.expire(`${dayKey}:prompt`, 172800)
      pipe.expire(`${dayKey}:completion`, 172800)
      pipe.expire(`${dayKey}:total`, 172800)
      pipe.incrby(`${monthKey}:prompt`, tokens.promptTokens)
      pipe.incrby(`${monthKey}:completion`, tokens.completionTokens)
      pipe.incrby(`${monthKey}:total`, tokens.totalTokens)
      pipe.expire(`${monthKey}:prompt`, 3024000)
      pipe.expire(`${monthKey}:completion`, 3024000)
      pipe.expire(`${monthKey}:total`, 3024000)
      await pipe.exec()
      return
    } catch (err) {
      console.warn('[redis] Token tracking failed (non-blocking):', err)
    }
  }

  const totalKey = `${dayKey}:total`
  const existing = memoryStore.get(totalKey)
  const prev = existing ? parseInt(existing.value, 10) : 0
  memoryStore.set(totalKey, { value: String(prev + tokens.totalTokens), expires: Date.now() + 172800_000 })
}

export async function getTokenUsage(userId: string, period: 'day' | 'month'): Promise<TokenUsage> {
  const now = new Date()
  const periodKey = period === 'day'
    ? `tokens:${userId}:${now.toISOString().slice(0, 10)}`
    : `tokens:${userId}:${now.toISOString().slice(0, 7)}`

  if (redis) {
    try {
      const [prompt, completion, total] = await Promise.all([
        redis.get<number>(`${periodKey}:prompt`),
        redis.get<number>(`${periodKey}:completion`),
        redis.get<number>(`${periodKey}:total`),
      ])
      return { promptTokens: prompt ?? 0, completionTokens: completion ?? 0, totalTokens: total ?? 0 }
    } catch {
      // Fall through to default
    }
  }

  return { promptTokens: 0, completionTokens: 0, totalTokens: 0 }
}
