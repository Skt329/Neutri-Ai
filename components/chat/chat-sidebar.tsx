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
  MoreHorizontal,
  Pencil,
  Trash2,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from '@/components/ui/context-menu'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { deleteConversation, renameConversation } from '@/app/(app)/chat/actions'
import { toast } from 'sonner'

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
  const router = useRouter()
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(true)

  // Dialog state
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [actionPending, setActionPending] = useState(false)

  const filtered = search.trim()
    ? conversations.filter((c) =>
        (c.title ?? 'Untitled').toLowerCase().includes(search.toLowerCase())
      )
    : conversations

  const groups = groupConversations(filtered)
  const activeId = pathname?.match(/\/chat\/(.+)/)?.[1]

  function openRename(c: Conversation) {
    setRenameValue(c.title ?? '')
    setRenameTarget(c)
  }

  async function handleRename() {
    if (!renameTarget) return
    const clean = renameValue.trim().slice(0, 120)
    if (!clean) return
    setActionPending(true)
    try {
      await renameConversation(renameTarget.id, clean)
      router.refresh()
      setRenameTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Rename failed')
    } finally {
      setActionPending(false)
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return
    setActionPending(true)
    try {
      await deleteConversation(deleteTarget.id)
      router.refresh()
      setDeleteTarget(null)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActionPending(false)
    }
  }

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
    <>
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
          <Link href="/chat/new">
            <Button
              className="w-full justify-start gap-2 bg-turmeric hover:bg-turmeric/90 text-ink rounded-xl h-10 font-semibold text-sm"
            >
              <Plus className="size-4" /> New conversation
            </Button>
          </Link>
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
              aria-label="Search conversations"
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
                      <ContextMenu>
                        <ContextMenuTrigger asChild>
                          <Link
                            href={`/chat/${c.id}`}
                            className={cn(
                              'flex items-start gap-2.5 rounded-lg px-2.5 py-2 text-sm smooth-hover group relative',
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

                            {/* 3-dot menu on hover */}
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <button
                                  onClick={(e) => e.preventDefault()}
                                  className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-md opacity-0 group-hover:opacity-100 hover:bg-white/15 smooth-hover"
                                  aria-label="Chat options"
                                >
                                  <MoreHorizontal className="size-3.5" />
                                </button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end" className="w-40">
                                <DropdownMenuItem onClick={() => openRename(c)}>
                                  <Pencil className="mr-2 size-3.5" /> Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => setDeleteTarget(c)} className="text-destructive focus:text-destructive">
                                  <Trash2 className="mr-2 size-3.5" /> Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </Link>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-40">
                          <ContextMenuItem onClick={() => openRename(c)}>
                            <Pencil className="mr-2 size-3.5" /> Rename
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => setDeleteTarget(c)} className="text-destructive focus:text-destructive">
                            <Trash2 className="mr-2 size-3.5" /> Delete
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
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

      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) setRenameTarget(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this chat a descriptive name.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Chat name…"
            maxLength={120}
            onKeyDown={(e) => { if (e.key === 'Enter') handleRename() }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameTarget(null)} disabled={actionPending}>Cancel</Button>
            <Button onClick={handleRename} disabled={actionPending || !renameValue.trim()} className="bg-forest hover:bg-sage text-white">
              {actionPending ? <><Spinner className="size-4 mr-1" /> Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) setDeleteTarget(null) }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.title || 'Untitled chat'}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {actionPending ? <><Spinner className="size-4 mr-1" /> Deleting…</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
