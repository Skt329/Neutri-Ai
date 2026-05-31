import { createClient } from '@/lib/supabase/client'
import type { Session, User } from '@supabase/supabase-js'

const SESSION_CACHE_KEY = 'nutriai_session_cache'
const SESSION_CACHE_TTL = 5 * 60 * 1000 // 5 minutes
const AUTH_SYNC_CHANNEL = 'nutriai-auth-sync'

interface CachedSession {
  user: User | null
  session: Session | null
  timestamp: number
}

/**
 * What we persist to localStorage — NO tokens, NO secrets.
 * Only used as a "hint" for redirect logic so we don't flash
 * the login page on every navigation.
 */
interface LocalStorageAuthHint {
  isAuthenticated: boolean
  userId: string | null
  timestamp: number
}

class SessionManager {
  private cachedSession: CachedSession | null = null
  private sessionPromise: Promise<CachedSession> | null = null
  private broadcastChannel: BroadcastChannel | null = null

  constructor() {
    this.initBroadcastChannel()
  }

  /**
   * Set up cross-tab session synchronization via BroadcastChannel.
   * When any tab calls invalidateCache(), all other tabs immediately
   * clear their in-memory and localStorage caches.
   */
  private initBroadcastChannel() {
    try {
      if (typeof window === 'undefined' || typeof BroadcastChannel === 'undefined') return
      this.broadcastChannel = new BroadcastChannel(AUTH_SYNC_CHANNEL)
      this.broadcastChannel.addEventListener('message', (event) => {
        if (event.data === 'logout' || event.data === 'invalidate') {
          // Another tab triggered logout — clear local caches silently
          this.cachedSession = null
          try {
            localStorage.removeItem(SESSION_CACHE_KEY)
          } catch {
            // Silently fail if localStorage is unavailable
          }
        }
      })
    } catch {
      // BroadcastChannel not supported — cross-tab sync disabled gracefully
    }
  }

  /**
   * Get current session with intelligent caching
   * - First check in-memory cache (instant)
   * - Then check localStorage hint (fast, no secrets)
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

    // Check localStorage hint first — if the hint says "not authenticated"
    // or is expired, skip straight to Supabase. If it says "authenticated",
    // still fetch from Supabase but we know the redirect guard can relax.
    const hint = this.getLocalStorageHint()
    if (hint && !hint.isAuthenticated && now - hint.timestamp < SESSION_CACHE_TTL) {
      // User was recently unauthenticated — return empty session quickly
      const empty: CachedSession = { user: null, session: null, timestamp: now }
      this.cachedSession = empty
      return empty
    }

    // Query Supabase for the actual session
    try {
      const supabase = createClient()
      const {
        data: { session },
      } = await supabase.auth.getSession()

      const result: CachedSession = {
        user: session?.user ?? null,
        session,
        timestamp: now,
      }

      // Cache in memory and save a safe hint to localStorage
      this.cachedSession = result
      this.setLocalStorageHint(result)

      return result
    } catch (error) {
      console.error('[session] Failed to fetch session:', error)
      // Return empty session on error
      return { user: null, session: null, timestamp: now }
    }
  }

  /**
   * Read the lightweight auth hint from localStorage.
   * This NEVER contains tokens or session data.
   */
  private getLocalStorageHint(): LocalStorageAuthHint | null {
    try {
      if (typeof window === 'undefined') return null
      const cached = localStorage.getItem(SESSION_CACHE_KEY)
      return cached ? JSON.parse(cached) : null
    } catch {
      return null
    }
  }

  /**
   * Save a lightweight hint to localStorage.
   * Only stores isAuthenticated flag + userId — no JWTs, no secrets.
   */
  private setLocalStorageHint(session: CachedSession) {
    try {
      if (typeof window === 'undefined') return
      const hint: LocalStorageAuthHint = {
        isAuthenticated: !!session.user,
        userId: session.user?.id ?? null,
        timestamp: session.timestamp,
      }
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(hint))
    } catch {
      // Silently fail if localStorage is unavailable
    }
  }

  /**
   * Invalidate session cache when user logs out or session changes.
   * Broadcasts to all other open tabs so they clear their caches too.
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

    // Notify all other tabs to invalidate their caches
    try {
      this.broadcastChannel?.postMessage('logout')
    } catch {
      // BroadcastChannel may be closed — ignore
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
 * Helper to check auth session with caching.
 * Renamed from useSessionCheck to avoid React Hook linter warnings.
 */
export async function checkSession() {
  return sessionManager.getSession()
}
