"use client"

import { useMemo } from "react"
import type { DailyBreakdown } from "@/lib/types"
import { cn } from "@/lib/utils"

/** Compact 7-bar calorie chart with a target line. Pure SVG, no deps. */
export function WeeklyChart({
  days,
  targetCalories,
  className,
}: {
  days: DailyBreakdown[]
  targetCalories: number | null
  className?: string
}) {
  const { bars, max, targetY } = useMemo(() => {
    const localMax = Math.max(
      targetCalories ?? 0,
      ...days.map((d) => d.calories),
      800,
    )
    const m = Math.ceil(localMax / 100) * 100 + 200
    return {
      bars: days,
      max: m,
      targetY: targetCalories ? 1 - targetCalories / m : null,
    }
  }, [days, targetCalories])

  const width = 320
  const height = 140
  const padding = { top: 8, right: 4, bottom: 22, left: 4 }
  const chartW = width - padding.left - padding.right
  const chartH = height - padding.top - padding.bottom
  const barW = chartW / days.length - 6

  return (
    <div className={cn("relative", className)}>
      <svg viewBox={`0 0 ${width} ${height}`} className="h-auto w-full" aria-hidden>
        {targetY != null ? (
          <line
            x1={padding.left}
            x2={width - padding.right}
            y1={padding.top + chartH * targetY}
            y2={padding.top + chartH * targetY}
            stroke="var(--macro-calories)"
            strokeWidth={1}
            strokeDasharray="3 4"
            opacity={0.7}
          />
        ) : null}
        {bars.map((d, i) => {
          const h = (d.calories / max) * chartH
          const x = padding.left + i * (chartW / days.length) + 3
          const y = padding.top + chartH - h
          const dayName = new Date(d.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "short" })
          const isToday = i === bars.length - 1
          return (
            <g key={d.date}>
              <rect
                x={x}
                y={y}
                width={barW}
                height={Math.max(h, 2)}
                rx={4}
                fill={isToday ? "var(--macro-protein)" : "var(--macro-calories)"}
                opacity={d.mealCount === 0 ? 0.18 : 0.85}
              />
              <text
                x={x + barW / 2}
                y={height - 6}
                textAnchor="middle"
                fontSize={9}
                fill="var(--muted-foreground)"
                className="font-medium uppercase tracking-wider"
              >
                {dayName}
              </text>
            </g>
          )
        })}
      </svg>
    </div>
  )
}
