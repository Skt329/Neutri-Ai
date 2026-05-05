'use client'

import { useState, useEffect, useCallback } from 'react'
import { Download, X, Wifi, WifiOff } from 'lucide-react'
import { useNetworkStatus } from '@/hooks/use-network-status'
import { toast } from 'sonner'

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>
}

const DISMISSED_KEY = 'neutri-pwa-install-dismissed'
const DISMISS_DURATION_MS = 7 * 24 * 60 * 60 * 1000 // 7 days

/**
 * Non-intrusive PWA install banner + offline status toasts.
 * - Listens for `beforeinstallprompt` to show an install banner.
 * - Remembers dismissals for 7 days via localStorage.
 * - Shows toast notifications on connectivity changes.
 */
export function PwaInstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null)
  const [showBanner, setShowBanner] = useState(false)
  const { isOnline } = useNetworkStatus()
  const [wasOffline, setWasOffline] = useState(false)

  // ── Install prompt listener ──
  useEffect(() => {
    // Check if previously dismissed
    const dismissedAt = localStorage.getItem(DISMISSED_KEY)
    if (dismissedAt && Date.now() - Number(dismissedAt) < DISMISS_DURATION_MS) {
      return
    }

    const handler = (e: Event) => {
      e.preventDefault()
      setDeferredPrompt(e as BeforeInstallPromptEvent)
      // Delay showing the banner for better UX
      setTimeout(() => setShowBanner(true), 3000)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  // ── Online/offline toasts ──
  useEffect(() => {
    if (!isOnline) {
      setWasOffline(true)
      toast.error('You\'re offline', {
        description: 'Some features may be unavailable.',
        duration: 5000,
      })
    } else if (wasOffline) {
      toast.success('Back online', {
        description: 'Connection restored.',
        duration: 3000,
      })
      setWasOffline(false)
    }
  }, [isOnline, wasOffline])

  const handleInstall = useCallback(async () => {
    if (!deferredPrompt) return

    await deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice

    if (outcome === 'accepted') {
      toast.success('NeutriAI installed!', {
        description: 'Find it on your home screen.',
      })
    }

    setDeferredPrompt(null)
    setShowBanner(false)
  }, [deferredPrompt])

  const handleDismiss = useCallback(() => {
    localStorage.setItem(DISMISSED_KEY, String(Date.now()))
    setShowBanner(false)
    setDeferredPrompt(null)
  }, [])

  if (!showBanner || !deferredPrompt) return null

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 mx-auto max-w-md animate-slide-up">
      <div className="flex items-center gap-3 rounded-2xl bg-card border border-border shadow-[var(--sh2)] px-4 py-3">
        <div className="size-10 shrink-0 rounded-xl bg-forest flex items-center justify-center">
          <Download className="size-5 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">Install NeutriAI</p>
          <p className="text-xs text-stone">Quick access from your home screen</p>
        </div>
        <button
          onClick={handleInstall}
          className="shrink-0 px-4 py-1.5 rounded-full bg-forest text-white text-xs font-semibold hover:bg-sage smooth-hover"
        >
          Install
        </button>
        <button
          onClick={handleDismiss}
          className="shrink-0 p-1 rounded-full hover:bg-cream2 smooth-hover"
          aria-label="Dismiss install prompt"
        >
          <X className="size-4 text-stone" />
        </button>
      </div>
    </div>
  )
}
