export interface StreakInfo {
  /** Consecutive days ending today (or yesterday if the user hasn't logged today yet) with at least one meal. */
  currentStreak: number
  /** Longest streak ever. */
  longestStreak: number
  /** How many of the last 7 days had at least one meal logged (0-7). */
  weeklyConsistency: number
  /** Flags for individual days in the past week (oldest first). True = logged. */
  last7Days: boolean[]
  /** Whether the user has logged any meal today. */
  loggedToday: boolean
}
