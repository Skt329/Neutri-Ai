'use client'

import { useSyncExternalStore } from 'react'

function subscribe(callback: () => void) {
  window.addEventListener('online', callback)
  window.addEventListener('offline', callback)
  return () => {
    window.removeEventListener('online', callback)
    window.removeEventListener('offline', callback)
  }
}

function getSnapshot() {
  return navigator.onLine
}

function getServerSnapshot() {
  return true // Assume online during SSR
}

/**
 * React hook that tracks network connectivity status.
 * Uses `useSyncExternalStore` for tear-free, concurrent-safe reads.
 *
 * @returns `{ isOnline: boolean }`
 */
export function useNetworkStatus() {
  const isOnline = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
  return { isOnline }
}
