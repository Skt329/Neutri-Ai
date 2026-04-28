'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  Leaf,
  Plus,
  Search,
  X,
  MessageSquare,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createConversation } from '@/app/(app)/chat/actions'

type Conversation = {
  id: string
  title: string | null
  updated_at: string
}

interface ChatSidebarProps {
  conversations: Conversation[]
  userName: string | null
  streakDays: number
}

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins} min ago`
  const h = d.getHours()
  const m = d.getMinutes()
  const ampm = h >= 12 ? 'PM' : 'AM'
  const hh = h % 12 || 12
  return `${hh}:${m.toString().padStart(2, '0')} ${ampm}`
}

function groupConversations(convos: Conversation[]) {
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterdayStart = new Date(todayStart.getTime() - 86400000)
  const weekStart = new Date(todayStart.getTime() - 7 * 86400000)

  const groups: { label: string; items: Conversation[] }[] = [
    { label: 'Today', items: [] },
    { label: 'Yesterday', items: [] },
    { label: 'This Week', items: [] },
    { label: 'Older', items: [] },
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

export function ChatSidebar({ conversations, userName, streakDays }: ChatSidebarProps) {
  const pathname = usePathname()
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(true)

  const filtered = search.trim()
    ? conversations.filter((c) =>
        (c.title ?? 'Untitled').toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  const groups = groupConversations(filtered)
  const activeId = pathname?.match(/\/chat\/(.+)/)?.[1]

  if (!isOpen) {
    return (
      <button
        onClick={() => setIsOpen(true)}
        className="hidden md:flex items-center justify-center w-12 h-full bg-forest border-r border-forest/30 text-white hover:bg-forest/90 smooth-hover"
        aria-label="Open sidebar"
      >
        <MessageSquare className="size-5" />
      </button>
    )
  }

  return (
    <aside className="hidden md:flex flex-col w-[280px] bg-forest text-white shrink-0 border-r border-forest/30">
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2">
        <div className="flex items-center gap-2">
          <div className="flex size-8 items-center justify-center rounded-lg bg-white/10">
            <Leaf className="size-4" />
          </div>
          <span className="font-display text-sm font-bold">NutriAI</span>
        </div>
        <button
          onClick={() => setIsOpen(false)}
          className="flex size-7 items-center justify-center rounded-md hover:bg-white/10 smooth-hover"
          aria-label="Close sidebar"
        >
          <X className="size-4" />
        </button>
      </div>

      {/* New conversation */}
      <div className="px-3 pt-2 pb-1">
        <form action={createConversation}>
          <Button
            type="submit"
            className="w-full justify-start gap-2 bg-turmeric hover:bg-turmeric/90 text-ink rounded-xl h-10 font-semibold text-sm"
          >
            <Plus className="size-4" /> New conversation
          </Button>
        </form>
      </div>

      {/* Search */}
      <div className="px-3 py-2">
        <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
          <Search className="size-3.5 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search chats…"
            className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
          />
        </div>
      </div>

      {/* Conversation list */}
      <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
        {groups.map((group) => (
          <div key={group.label}>
            <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
              {group.label}
            </p>
            <ul className="space-y-0.5">
              {group.items.map((c) => {
                const isActive = c.id === activeId
                return (
                  <li key={c.id}>
                    <Link
                      href={`/chat/${c.id}`}
                      className={cn(
                        'flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm smooth-hover group',
                        isActive
                          ? 'bg-white/15 text-white'
                          : 'text-white/70 hover:bg-white/8 hover:text-white'
                      )}
                    >
                      <span className={cn(
                        'mt-1.5 size-2 shrink-0 rounded-full',
                        isActive ? 'bg-turmeric' : 'bg-sage'
                      )} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium leading-tight">
                          {c.title || 'Untitled chat'}
                        </p>
                        <p className="text-[11px] text-white/40 mt-0.5">
                          {formatRelativeTime(c.updated_at)}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}

        {filtered.length === 0 && (
          <p className="px-3 py-4 text-center text-sm text-white/40">
            {search ? 'No matching chats' : 'No conversations yet'}
          </p>
        )}
      </nav>

      {/* User footer */}
      <div className="border-t border-white/10 px-3 py-3">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-sage text-white text-sm font-semibold">
            {userName?.[0]?.toUpperCase() ?? 'U'}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{userName ?? 'User'}</p>
            {streakDays > 0 && (
              <p className="text-[11px] text-white/50">
                Day {streakDays} streak 🔥
              </p>
            )}
          </div>
          <Link
            href="/profile"
            className="flex size-7 items-center justify-center rounded-md hover:bg-white/10 smooth-hover text-white/50 hover:text-white"
          >
            <Settings className="size-4" />
          </Link>
        </div>
      </div>
    </aside>
  )
}
