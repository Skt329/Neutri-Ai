import posthog from 'posthog-js'

// Initialize PostHog only on client side
export function initPostHog() {
  if (typeof window === 'undefined') return

  // Get PostHog key from environment - if not set, we'll use a placeholder
  // Users should set NEXT_PUBLIC_POSTHOG_KEY in their .env.local
  const posthogKey = process.env.NEXT_PUBLIC_POSTHOG_KEY

  if (!posthogKey) {
    console.warn(
      '[PostHog] NEXT_PUBLIC_POSTHOG_KEY not set. Analytics disabled. Set it in your environment variables to enable.'
    )
    return
  }

  posthog.init(posthogKey, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://us.i.posthog.com',
    loaded: (ph) => {
      // Callback when PostHog is loaded
      console.log('[PostHog] Initialized successfully')
    },
  })
}

// Helper to track events
export function trackEvent(eventName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    posthog.capture(eventName, properties)
  } catch (error) {
    console.error('[PostHog] Error tracking event:', error)
  }
}

// Helper to track errors
export function trackError(error: Error, context?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    posthog.capture('error_occurred', {
      error_message: error.message,
      error_stack: error.stack,
      ...context,
    })
  } catch (err) {
    console.error('[PostHog] Error tracking error:', err)
  }
}

// Helper to set user properties
export function setUserProperties(userId: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    posthog.identify(userId, {
      ...properties,
    })
  } catch (error) {
    console.error('[PostHog] Error setting user properties:', error)
  }
}

// Helper to track page views
export function trackPageView(pageName: string, properties?: Record<string, any>) {
  if (typeof window === 'undefined') return

  try {
    posthog.capture('page_view', {
      page_name: pageName,
      ...properties,
    })
  } catch (error) {
    console.error('[PostHog] Error tracking page view:', error)
  }
}

export default posthog
