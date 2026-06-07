/**
 * Get the start-of-day (midnight) in a given timezone as an ISO-8601 string.
 *
 * Falls back to UTC if the timezone string is invalid.
 *
 * @param timezone IANA timezone (e.g. "Asia/Kolkata", "America/New_York")
 */
export function getDayStartISO(timezone?: string | null): string {
  const tz = timezone ?? "UTC"
  try {
    // Format current date in the user's timezone
    const formatter = new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    })
    // en-CA gives us YYYY-MM-DD format
    const dateStr = formatter.format(new Date())
    // Use the date string directly as a timestamp filter
    // PostgreSQL timestamptz comparison works with the local date string
    return `${dateStr}T00:00:00`
  } catch {
    // Invalid timezone — fall back to UTC midnight
    const now = new Date()
    return new Date(
      Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()),
    ).toISOString()
  }
}

/**
 * Get the current time in a given timezone as an ISO string for the date part.
 * Returns YYYY-MM-DD.
 */
export function getTodayDateStr(timezone?: string | null): string {
  const tz = timezone ?? "UTC"
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: tz,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date())
  } catch {
    const now = new Date()
    return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}`
  }
}
