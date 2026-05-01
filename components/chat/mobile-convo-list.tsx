'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Pencil, Trash2, MoreVertical, Inbox } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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

/* ── Date grouping (shared logic with chat-sidebar) ── */
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

function formatRelativeTime(iso: string): string {
  const d = new Date(iso)
  const now = new Date()
  const diff = now.getTime() - d.getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'Just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  if (days < 7) return `${days}d ago`
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function MobileConvoList({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter()
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [actionPending, setActionPending] = useState(false)

  const groups = groupConversations(conversations)

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
      setDeleteTarget(null)
      router.push('/chat')
      router.refresh()
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setActionPending(false)
    }
  }

  return (
    <>
      {/* Scrollable full-height list */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {groups.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-4 py-20 text-center">
            <div className="flex size-16 items-center justify-center rounded-full bg-mint2 text-sage">
              <Inbox className="size-7" />
            </div>
            <div>
              <p className="text-base font-semibold text-ink">No conversations yet</p>
              <p className="text-sm text-fog mt-1">Tap + to start your first chat</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {groups.map((group) => (
              <div key={group.label}>
                <p className="text-[11px] font-semibold uppercase tracking-wider text-fog mb-2 px-1">
                  {group.label}
                </p>
                <ul className="flex flex-col gap-1.5">
                  {group.items.map((c) => (
                    <li key={c.id} className="group relative">
                      <Link
                        href={`/chat/${c.id}`}
                        className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-sage/30 hover:shadow-sm smooth-hover"
                      >
                        <div className="flex size-10 items-center justify-center rounded-lg bg-mint2 text-sage shrink-0">
                          <MessageCircle className="size-4.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-ink">
                            {c.title || 'Untitled'}
                          </p>
                          <p className="text-[11px] text-fog">{formatRelativeTime(c.updated_at)}</p>
                        </div>
                      </Link>

                      {/* 3-dot menu — always visible on mobile, hover on desktop */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="absolute right-2 top-1/2 -translate-y-1/2 flex size-9 items-center justify-center rounded-lg bg-card/80 border border-border opacity-100 hover:bg-accent smooth-hover z-10"
                            aria-label="Chat options"
                          >
                            <MoreVertical className="size-4 text-stone" />
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
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>

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
