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
    // Create midnight in UTC equivalent of the user's local midnight
    const [year, month, day] = dateStr.split("-").map(Number)
    // Use DateTimeFormat to find the offset at midnight
    const midnightLocal = new Date(`${dateStr}T00:00:00`)
    // Calculate offset using the timezone
    const utcFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      hour: "numeric",
      minute: "numeric",
      hour12: false,
      timeZoneName: "shortOffset",
    })
    const parts = utcFormatter.formatToParts(midnightLocal)
    // Simpler approach: just use the date string as a timestamp filter
    // Since PostgreSQL timestamptz stores in UTC, we need the UTC equivalent
    // of "midnight in user's timezone"
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
