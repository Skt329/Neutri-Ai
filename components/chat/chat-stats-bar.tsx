'use client'

import { Flame, Drumstick, Sparkles, Target } from 'lucide-react'

interface ChatStatsBarProps {
  title: string | null
  caloriesLeft: number | null
  proteinLeft: number | null
  streakDays: number
  goalLabel: string | null
}

export function ChatStatsBar({
  title,
  caloriesLeft,
  proteinLeft,
  streakDays,
  goalLabel,
}: ChatStatsBarProps) {
  return (
    <div className="flex items-center justify-between border-b border-border bg-card px-4 py-2.5 md:px-6">
      <h1 className="min-w-0 truncate text-sm font-semibold text-ink">
        {title || 'New chat'}
      </h1>
      <div className="hidden md:flex items-center gap-2 shrink-0 ml-4">
        {caloriesLeft != null && (
          <StatPill icon={<Flame className="size-3" />} value={`${Math.round(caloriesLeft)}`} label="kcal left" color="turmeric" />
        )}
        {proteinLeft != null && (
          <StatPill icon={<Drumstick className="size-3" />} value={`${Math.round(proteinLeft)}`} label="g protein" color="sage" />
        )}
        {streakDays > 0 && (
          <StatPill icon={<Sparkles className="size-3" />} value={`Day ${streakDays}`} color="mint" />
        )}
        {goalLabel && (
          <StatPill icon={<Target className="size-3" />} value={goalLabel} color="cream" />
        )}
      </div>
    </div>
  )
}

function StatPill({
  icon,
  value,
  label,
  color,
}: {
  icon: React.ReactNode
  value: string
  label?: string
  color: 'turmeric' | 'sage' | 'mint' | 'cream'
}) {
  const colorMap = {
    turmeric: 'bg-turmeric-l text-turmeric',
    sage: 'bg-mint text-forest',
    mint: 'bg-mint text-forest',
    cream: 'bg-cream2 text-stone',
  }
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${colorMap[color]}`}>
      {icon}
      <span className="font-semibold">{value}</span>
      {label && <span className="text-[10px] opacity-70">{label}</span>}
    </div>
  )
}
