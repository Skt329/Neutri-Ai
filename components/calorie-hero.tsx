"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import { Flame } from "lucide-react"

/**
 * Large circular progress hero showing today's calories vs target.
 * Celebrates via confetti + ring glow when the user crosses the target band (90-110%).
 */
export function CalorieHero({
  consumed,
  target,
  protein,
  carbs,
  fat,
}: {
  consumed: number
  target: number
  protein: { consumed: number; target: number }
  carbs: { consumed: number; target: number }
  fat: { consumed: number; target: number }
}) {
  const remaining = Math.max(0, target - consumed)
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  const inTargetBand = target > 0 && consumed >= target * 0.9 && consumed <= target * 1.1
  const celebrated = useRef(false)
  const [shouldCelebrate, setShouldCelebrate] = useState(false)

  useEffect(() => {
    if (inTargetBand && !celebrated.current) {
      celebrated.current = true
      setShouldCelebrate(true)
      import("canvas-confetti")
        .then(({ default: confetti }) => {
          confetti({
            particleCount: 80,
            spread: 70,
            origin: { y: 0.35 },
            colors: ["#2f8f46", "#e88b3b", "#d4a93a", "#ffffff"],
            scalar: 0.9,
            disableForReducedMotion: true,
          })
        })
        .catch(() => {})
      const t = setTimeout(() => setShouldCelebrate(false), 2500)
      return () => clearTimeout(t)
    }
  }, [inTargetBand])

  // Ring math
  const size = 220
  const stroke = 14
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const dashOffset = c * (1 - pct / 100)

  return (
    <div className="relative flex flex-col items-center gap-6 sm:flex-row sm:items-center sm:gap-8">
      <div
        className={cn(
          "relative transition-all duration-700",
          shouldCelebrate && "animate-in zoom-in-50",
        )}
      >
        <svg width={size} height={size} className="-rotate-90">
          <defs>
            <linearGradient id="calorieGrad" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="var(--macro-calories)" />
              <stop offset="100%" stopColor="var(--macro-protein)" />
            </linearGradient>
          </defs>
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="var(--border)"
            strokeWidth={stroke}
            opacity={0.4}
          />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke="url(#calorieGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <Flame className="mb-1 size-5" style={{ color: "var(--macro-calories)" }} aria-hidden />
          <div className="text-4xl font-semibold tracking-tight tabular-nums">{formatNumber(Math.round(consumed))}</div>
          <div className="text-xs text-muted-foreground">of {formatNumber(target)} kcal</div>
          {remaining > 0 ? (
            <div className="mt-1 text-[11px] font-medium text-muted-foreground">
              {formatNumber(remaining)} left today
            </div>
          ) : (
            <div className="mt-1 text-[11px] font-medium" style={{ color: "var(--macro-protein)" }}>
              target reached
            </div>
          )}
        </div>
      </div>

      <div className="grid w-full flex-1 grid-cols-3 gap-3 sm:gap-4">
        <MacroBar
          label="Protein"
          consumed={protein.consumed}
          target={protein.target}
          color="var(--macro-protein)"
        />
        <MacroBar label="Carbs" consumed={carbs.consumed} target={carbs.target} color="var(--macro-carbs)" />
        <MacroBar label="Fat" consumed={fat.consumed} target={fat.target} color="var(--macro-fat)" />
      </div>
    </div>
  )
}

function MacroBar({
  label,
  consumed,
  target,
  color,
}: {
  label: string
  consumed: number
  target: number
  color: string
}) {
  const pct = target > 0 ? Math.min(100, (consumed / target) * 100) : 0
  return (
    <div className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3">
      <div className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-muted-foreground">{label}</span>
        <span className="text-[10px] tabular-nums text-muted-foreground">{Math.round(pct)}%</span>
      </div>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold tabular-nums">{Math.round(consumed)}</span>
        <span className="text-xs text-muted-foreground">/ {Math.round(target)}g</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full transition-[width] duration-700 ease-out"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
      </div>
    </div>
  )
}
