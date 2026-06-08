import * as Sentry from "@sentry/nextjs"

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,

  // Only enable in production to avoid noise during development
  enabled: process.env.NODE_ENV === "production",

  // Performance monitoring — sample 10% of transactions in production
  tracesSampleRate: 0.1,

  // Don't send PII (emails, usernames) to Sentry
  sendDefaultPii: false,

  // Filter out noisy or irrelevant errors
  ignoreErrors: [
    // Browser extensions and third-party scripts
    "ResizeObserver loop",
    "Non-Error promise rejection",
    // Network errors the user can't control
    "Failed to fetch",
    "Load failed",
    "NetworkError",
    // Service Worker errors
    "ServiceWorker",
    "service worker",
    "TypeError: Failed to register a ServiceWorker",
    "NetworkError when attempting to fetch resource",
    // AbortController cancellations (normal user navigation)
    "AbortError",
    "The operation was aborted",
  ],

  // Tag every event with the app version
  release: process.env.npm_package_version ?? "0.1.0",
  environment: process.env.NODE_ENV ?? "development",
})
