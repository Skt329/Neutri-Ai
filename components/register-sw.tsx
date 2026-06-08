"use client"

import { useEffect } from "react"

/**
 * Manually registers the Serwist service worker with a .catch() guard
 * to prevent unhandled promise rejections in production.
 *
 * Auto-registration is disabled in next.config.mjs (register: false)
 * because the injected script doesn't handle registration failures,
 * causing Sentry to report "Error: Rejected" from ServiceWorkerContainer.
 */
export function RegisterSW() {
  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      window.serwist !== undefined
    ) {
      window.serwist.register().catch((err: unknown) => {
        console.warn("[sw] Service worker registration failed:", err)
      })
    }
  }, [])

  return null
}
