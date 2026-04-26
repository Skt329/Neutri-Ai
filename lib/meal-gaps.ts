import type { MealLog } from "./types"

export interface MealGap {
  /** Hours since last logged meal (rounded to 0.5). */
  hours: number
  /** ISO timestamp of the last meal. */
  lastMealAt: string | null
  /** True when the gap is uncomfortable (user's waking window and > 5h). */
  warn: boolean
  message: string
}

/**
 * Compute the time since the user's most recent meal today. Returns a warn
 * flag when the gap is large enough to matter (>5h in waking hours).
 */
export function computeMealGap(meals: MealLog[], now = new Date()): MealGap | null {
  if (meals.length === 0) return null
  const sorted = [...meals].sort(
    (a, b) => new Date(b.logged_at).getTime() - new Date(a.logged_at).getTime(),
  )
  const last = sorted[0]
  const lastAt = new Date(last.logged_at)
  const diffMs = now.getTime() - lastAt.getTime()
  if (diffMs < 0) return null
  const hours = Math.round((diffMs / 3_600_000) * 2) / 2

  const hourOfDay = now.getHours()
  const inWakingWindow = hourOfDay >= 7 && hourOfDay <= 22
  const warn = inWakingWindow && hours >= 5

  let message: string
  if (hours < 2) {
    message = `Last meal ${formatHours(hours)} ago`
  } else if (!inWakingWindow) {
    message = `It's been ${formatHours(hours)} since your last meal`
  } else if (warn) {
    message = `You haven't eaten in ${formatHours(hours)} — consider a snack`
  } else {
    message = `${formatHours(hours)} since your last meal`
  }

  return { hours, lastMealAt: last.logged_at, warn, message }
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)}m`
  if (h < 1.25) return "1h"
  if (Math.abs(h - Math.round(h)) < 0.01) return `${Math.round(h)}h`
  return `${h.toFixed(1)}h`
}
