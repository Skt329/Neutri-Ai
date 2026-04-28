'use client'

import { trackEvent } from '@/lib/posthog'

const ACTIONS = [
  { emoji: '🍽️', label: 'Log a meal', prompt: 'I want to log a meal' },
  { emoji: '🛒', label: 'Order groceries', prompt: 'Add items to my pantry' },
  { emoji: '📋', label: 'Suggest meal plan', prompt: 'Suggest a meal plan for today' },
  { emoji: '📊', label: 'Check my progress', prompt: 'How am I doing today? Show me my daily totals' },
  { emoji: '🔍', label: 'Find a recipe', prompt: 'Suggest a recipe from my pantry items' },
] as const

export function QuickActions({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 py-2 md:px-6">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => {
            trackEvent('quick_action_clicked', { label: a.label })
            onPick(a.prompt)
          }}
          className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-medium text-stone hover:border-sage/30 hover:bg-cream2 hover:text-ink smooth-hover"
        >
          <span>{a.emoji}</span>
          {a.label}
        </button>
      ))}
    </div>
  )
}
