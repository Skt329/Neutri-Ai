/**
 * Shared conversation list utilities.
 * Used by both ChatSidebar (desktop) and MobileConvoList (mobile).
 */

export type Conversation = {
  id: string
  title: string | null
  updated_at: string
}

export interface ConversationGroup {
  label: string
  items: Conversation[]
}

/**
 * Group conversations into time buckets: Today, Yesterday, This Week, Older.
 */
export function groupConversations(convos: Conversation[]): ConversationGroup[] {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000)

  const groups: ConversationGroup[] = [
    { label: "Today", items: [] },
    { label: "Yesterday", items: [] },
    { label: "This Week", items: [] },
    { label: "Older", items: [] },
  ]

  for (const c of convos) {
    const d = new Date(c.updated_at)
    if (d >= todayStart) groups[0].items.push(c)
    else if (d >= yesterdayStart) groups[1].items.push(c)
    else if (d >= weekStart) groups[2].items.push(c)
    else groups[3].items.push(c)
  }

  return groups.filter((g) => g.items.length > 0)
}

/**
 * Format a timestamp as a relative time string.
 * For desktop sidebar: "Just now", "5 min ago", "2:30 PM"
 */
export function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return "Just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" })
}
