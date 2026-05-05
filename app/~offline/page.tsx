'use client'

import { WifiOff, RefreshCw, Leaf } from 'lucide-react'

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center px-6">
      <div className="text-center space-y-8 max-w-sm animate-fade-in-up">
        {/* Brand mark */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <div className="size-10 rounded-xl bg-forest flex items-center justify-center">
            <Leaf className="size-5 text-white" />
          </div>
          <span className="font-display text-xl font-bold">
            <span className="text-forest">Neutri</span>
            <span className="text-turmeric">AI</span>
          </span>
        </div>

        {/* Offline icon */}
        <div className="mx-auto size-20 rounded-2xl bg-clay-l flex items-center justify-center">
          <WifiOff className="size-10 text-clay" />
        </div>

        {/* Message */}
        <div className="space-y-3">
          <h1 className="font-display text-2xl font-bold text-ink">
            You&apos;re Offline
          </h1>
          <p className="text-sm text-stone leading-relaxed">
            NeutriAI needs an internet connection to chat with your AI dietitian,
            log meals, and sync your data. Please check your connection and try
            again.
          </p>
        </div>

        {/* Retry */}
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-forest text-white text-sm font-semibold hover:bg-sage smooth-hover"
        >
          <RefreshCw className="size-4" />
          Try Again
        </button>

        {/* Subtle tip */}
        <p className="text-xs text-fog">
          Tip: Previously viewed pages may still be available while offline.
        </p>
      </div>
    </div>
  )
}
