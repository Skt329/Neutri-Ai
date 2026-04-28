'use client'

import { useEffect, useState } from 'react'

interface CalorieRingProps {
  consumed: number
  target: number
  protein: { consumed: number; target: number }
  carbs: { consumed: number; target: number }
  fat: { consumed: number; target: number }
}

export function CalorieRing({ consumed, target, protein, carbs, fat }: CalorieRingProps) {
  const [mounted, setMounted] = useState(false)
  useEffect(() => setMounted(true), [])

  const remaining = Math.max(0, target - consumed)
  const pct = Math.min(consumed / Math.max(target, 1), 1)

  // SVG ring params
  const R = 70
  const C = 2 * Math.PI * R // ~440
  const offset = mounted ? C * (1 - pct) : C

  return (
    <div className="flex flex-col items-center gap-4 animate-fade-in-up">
      <div className="relative w-48 h-48">
        <svg viewBox="0 0 160 160" className="w-full h-full -rotate-90">
          {/* Background ring */}
          <circle
            cx="80" cy="80" r={R}
            fill="none"
            stroke="var(--cream2)"
            strokeWidth="10"
          />
          {/* Progress ring */}
          <circle
            cx="80" cy="80" r={R}
            fill="none"
            stroke="var(--sage)"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={C}
            strokeDashoffset={offset}
            className="transition-all duration-1000 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-4xl font-bold text-ink">{consumed}</span>
          <span className="text-xs text-stone font-medium">of {target} kcal</span>
        </div>
      </div>

      {/* Remaining callout */}
      <div className="flex items-center gap-2 bg-mint2 text-forest px-4 py-1.5 rounded-full text-sm font-medium">
        <span className="font-display font-bold">{remaining}</span>
        <span className="text-xs">kcal remaining</span>
      </div>

      {/* Macro bars */}
      <div className="w-full space-y-3 mt-2">
        <MacroBar label="Protein" consumed={protein.consumed} target={protein.target} color="var(--macro-protein)" />
        <MacroBar label="Carbs" consumed={carbs.consumed} target={carbs.target} color="var(--macro-carbs)" />
        <MacroBar label="Fat" consumed={fat.consumed} target={fat.target} color="var(--macro-fat)" />
      </div>
    </div>
  )
}

function MacroBar({ label, consumed, target, color }: { label: string; consumed: number; target: number; color: string }) {
  const pct = Math.min((consumed / Math.max(target, 1)) * 100, 100)

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="size-2 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-stone font-medium">{label}</span>
        </div>
        <span className="font-display font-semibold text-ink tabular-nums">
          {Math.round(consumed)}<span className="text-fog font-sans font-normal">/{target}g</span>
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-cream2 overflow-hidden">
        <div
          className="h-full rounded-full macro-bar-fill"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
