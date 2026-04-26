import type { StreakInfo } from "./types"

/**
 * Given a list of ISO timestamps when the user logged meals and a timezone
 * offset (IANA), compute the current streak, longest streak, and 7-day
 * consistency. Operates entirely in the user's local-day bucket.
 */
export function computeStreakInfo(mealTimestamps: string[], timezone = "UTC"): StreakInfo {
  const dayBuckets = new Set<string>()
  for (const ts of mealTimestamps) {
    const d = new Date(ts)
    if (Number.isNaN(d.getTime())) continue
    dayBuckets.add(toLocalDateKey(d, timezone))
  }

  const today = toLocalDateKey(new Date(), timezone)
  const yesterday = shiftDateKey(today, -1)
  const loggedToday = dayBuckets.has(today)

  // Current streak: walk backwards from today (or yesterday if today hasn't been logged yet).
  let current = 0
  let cursor = loggedToday ? today : dayBuckets.has(yesterday) ? yesterday : null
  while (cursor && dayBuckets.has(cursor)) {
    current += 1
    cursor = shiftDateKey(cursor, -1)
  }

  // Longest streak: sort every logged day and find the longest consecutive run.
  const sorted = [...dayBuckets].sort()
  let longest = 0
  let run = 0
  let prev: string | null = null
  for (const key of sorted) {
    if (prev && shiftDateKey(prev, 1) === key) {
      run += 1
    } else {
      run = 1
    }
    if (run > longest) longest = run
    prev = key
  }
  longest = Math.max(longest, current)

  // 7-day consistency flags (oldest first).
  const last7Days: boolean[] = []
  for (let i = 6; i >= 0; i--) {
    last7Days.push(dayBuckets.has(shiftDateKey(today, -i)))
  }
  const weeklyConsistency = last7Days.filter(Boolean).length

  return { currentStreak: current, longestStreak: longest, weeklyConsistency, last7Days, loggedToday }
}

function toLocalDateKey(date: Date, timezone: string): string {
  try {
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: timezone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(date)
    const y = parts.find((p) => p.type === "year")?.value ?? "1970"
    const m = parts.find((p) => p.type === "month")?.value ?? "01"
    const d = parts.find((p) => p.type === "day")?.value ?? "01"
    return `${y}-${m}-${d}`
  } catch {
    return date.toISOString().slice(0, 10)
  }
}

function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split("-").map((n) => Number.parseInt(n, 10))
  const date = new Date(Date.UTC(y, m - 1, d))
  date.setUTCDate(date.getUTCDate() + days)
  return date.toISOString().slice(0, 10)
}
