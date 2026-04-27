'use client'

import { Pill, MoreVertical } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ContextStripProps {
  caloriesLeft: number
  protein: number
  dayNumber: number
  streak: number
}

export function ContextStrip({
  caloriesLeft,
  protein,
  dayNumber,
  streak,
}: ContextStripProps) {
  return (
    <div className="flex items-center justify-between px-6 py-3 bg-card border-b border-border">
      <div className="flex items-center gap-2">
        {/* Calories Left */}
        <div className="pill pill-clay">
          <span className="text-[11px] font-bold">🔥</span>
          <span className="text-xs font-semibold">{caloriesLeft} kcal left</span>
        </div>

        {/* Protein */}
        <div className="pill pill-amber">
          <span className="text-[11px] font-bold">💪</span>
          <span className="text-xs font-semibold">{protein}g protein</span>
        </div>

        {/* Day Badge */}
        <div className="pill pill-green">
          <span className="text-[11px] font-bold">📅</span>
          <span className="text-xs font-semibold">Day {dayNumber}</span>
        </div>

        {/* Streak */}
        <div className="pill pill-ghost">
          <span className="text-[11px] font-bold">✨</span>
          <span className="text-xs font-semibold">{streak}-day streak</span>
        </div>
      </div>

      <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
        <MoreVertical className="w-4 h-4" />
      </Button>
    </div>
  )
}
