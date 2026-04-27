import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

const SESSION_CACHE_KEY = 'nutriai_session_cache'
const SESSION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

interface CachedSession {
  user: User | null
  session: Session | null
  timestamp: number
}

class SessionManager {
  private cachedSession: CachedSession | null = null
  private sessionPromise: Promise<CachedSession> | null = null

  /**
   * Get current session with intelligent caching
   * - First check in-memory cache (instant)
   * - Then check localStorage cache (fast)
   * - Fall back to Supabase query (slower)
   * Eliminates repeated auth checks on every route change
   */
  async getSession(): Promise<CachedSession> {
    const now = Date.now()

    // Return in-memory cache if valid
    if (this.cachedSession && now - this.cachedSession.timestamp < SESSION_CACHE_TTL) {
      return this.cachedSession
    }

    // Prevent multiple concurrent requests
    if (this.sessionPromise) {
      return this.sessionPromise
    }

    this.sessionPromise = this.fetchSession()
    const session = await this.sessionPromise
    this.sessionPromise = null

    return session
  }

  private async fetchSession(): Promise<CachedSession> {
    const now = Date.now()

    // Check localStorage cache first
    const cached = this.getLocalStorageCache()
    if (cached && now - cached.timestamp < SESSION_CACHE_TTL) {
      this.cachedSession = cached
      return cached
    }

    // Query Supabase
    try {
      const supabase = createClient()
      const {
        data: { user, session },
      } = await supabase.auth.getSession()

      const result: CachedSession = {
        user,
        session,
        timestamp: now,
      }

      // Cache in memory and localStorage
      this.cachedSession = result
      this.setLocalStorageCache(result)

      return result
    } catch (error) {
      console.error('[session] Failed to fetch session:', error)
      // Return empty session on error
      return { user: null, session: null, timestamp: now }
    }
  }

  private getLocalStorageCache(): CachedSession | null {
    try {
      if (typeof window === 'undefined') return null
      const cached = localStorage.getItem(SESSION_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  private setLocalStorageCache(session: CachedSession) {
    try {
      if (typeof window === 'undefined') return
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Invalidate session cache when user logs out or session changes
   */
  invalidateCache() {
    this.cachedSession = null
    try {
      if (typeof window !== 'undefined') {
        localStorage.removeItem(SESSION_CACHE_KEY)
      }
    } catch {
      // Silently fail
    }
  }

  /**
   * Get user ID quickly (cached)
   * Used for routing decisions without async
   */
  async getUserId(): Promise<string | null> {
    const { user } = await this.getSession()
    return user?.id ?? null
  }

  /**
   * Check if user is authenticated (cached)
   */
  async isAuthenticated(): Promise<boolean> {
    const { user } = await this.getSession()
    return !!user
  }
}

export const sessionManager = new SessionManager()

/**
 * Hook for React components to check auth with caching
 * Eliminates repeated auth queries on component renders
 */
export async function useSessionCheck() {
  return sessionManager.getSession()
}
