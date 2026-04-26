export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—"
  return value.toLocaleString(undefined, { maximumFractionDigits: digits })
}

export function formatTime(iso: string): string {
  try {
    return new Date(iso).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })
  } catch {
    return iso
  }
}

export function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })
  } catch {
    return iso
  }
}

export function capitalize(s: string | null | undefined): string {
  if (!s) return ""
  return s.charAt(0).toUpperCase() + s.slice(1)
}
