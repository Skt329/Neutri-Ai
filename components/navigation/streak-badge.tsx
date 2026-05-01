'use client'

import { useEffect, useRef, useState } from 'react'

// Deduplicate streak fetches — the badge is mounted in the shell layout
// and re-renders on every client-side navigation.  Without this guard,
// a new fetch fires on every tab switch (3 extra DB queries per nav).
// We cache the result for 5 minutes before allowing a refresh.
const DEDUP_MS = 5 * 60 * 1000

export function StreakBadge() {
  const [streak, setStreak] = useState(0)
  const fetchedRef = useRef(false)

  useEffect(() => {
    if (fetchedRef.current) return
    fetchedRef.current = true

    fetch('/api/streak')
      .then((r) => r.json())
      .then((d) => setStreak(d.streak ?? 0))
      .catch(() => {})

    // Allow a re-fetch after the dedup window (e.g. if the user
    // keeps the app open for a long session)
    const timer = setTimeout(() => { fetchedRef.current = false }, DEDUP_MS)
    return () => clearTimeout(timer)
  }, [])

  if (streak <= 0) return null

  return (
    <div className="flex items-center gap-1.5 bg-turmeric-l text-turmeric px-3 py-1.5 rounded-full text-xs font-semibold animate-fade-in">
      <span>🔥</span>
      <span>{streak}-day streak</span>
    </div>
  )
}
