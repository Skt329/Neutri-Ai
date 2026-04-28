'use client'

import { useEffect, useState } from 'react'

export function StreakBadge() {
  const [streak, setStreak] = useState(0)

  useEffect(() => {
    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => setStreak(d.streak ?? 0))
      .catch(() => {})
  }, [])

  if (streak <= 0) return null

  return (
    <div className="flex items-center gap-1.5 bg-turmeric-l text-turmeric px-3 py-1.5 rounded-full text-xs font-semibold animate-fade-in">
      <span>🔥</span>
      <span>{streak}-day streak</span>
    </div>
  )
}
