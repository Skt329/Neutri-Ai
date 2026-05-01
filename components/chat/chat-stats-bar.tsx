'use client'

import { Flame, Drumstick, Zap, Target } from 'lucide-react'

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
    <div className="flex items-center gap-3 px-5 py-3">
      <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink/80">
        {title || 'New chat'}
      </h1>
      <div className="hidden md:flex items-center gap-1.5 shrink-0">
        {caloriesLeft != null && (
          <StatPill
            icon={<Flame className="size-3" />}
            value={`${Math.round(caloriesLeft)}`}
            label="kcal"
            colorClass="bg-turmeric-l text-turmeric"
          />
        )}
        {proteinLeft != null && (
          <StatPill
            icon={<Drumstick className="size-3" />}
            value={`${Math.round(proteinLeft)}g`}
            label="protein"
            colorClass="bg-mint text-forest"
          />
        )}
        {streakDays > 0 && (
          <StatPill
            icon={<Zap className="size-3" />}
            value={`${streakDays}d`}
            label="streak"
            colorClass="bg-cream2 text-stone"
          />
        )}
        {goalLabel && (
          <StatPill
            icon={<Target className="size-3" />}
            value={goalLabel}
            colorClass="bg-cream2 text-stone"
          />
        )}
      </div>
    </div>
  )
}

function StatPill({
  icon,
  value,
  label,
  colorClass,
}: {
  icon: React.ReactNode
  value: string
  label?: string
  colorClass: string
}) {
  return (
    <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium ${colorClass}`}>
      {icon}
      <span className="font-semibold tabular-nums">{value}</span>
      {label && <span className="opacity-60">{label}</span>}
    </div>
  )
}
