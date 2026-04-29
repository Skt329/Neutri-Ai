'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { MessageCircle, Pencil, Trash2, MoreHorizontal } from 'lucide-react'
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
import { formatDate } from '@/lib/format'
import { toast } from 'sonner'

type Conversation = {
  id: string
  title: string | null
  updated_at: string
}

export function MobileConvoList({ conversations }: { conversations: Conversation[] }) {
  const router = useRouter()
  const [renameTarget, setRenameTarget] = useState<Conversation | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<Conversation | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [actionPending, setActionPending] = useState(false)

  if (conversations.length === 0) return null

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

  return (
    <>
      <div className="w-full max-w-lg md:hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <p className="text-xs font-semibold uppercase tracking-wider text-fog mb-3 text-left">Recent chats</p>
        <ul className="flex flex-col gap-2">
          {conversations.map((c) => (
            <li key={c.id} className="group relative">
              <Link
                href={`/chat/${c.id}`}
                className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-sage/30 hover:shadow-sm smooth-hover"
              >
                <div className="flex size-9 items-center justify-center rounded-lg bg-mint2 text-sage shrink-0">
                  <MessageCircle className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-ink">{c.title || 'Untitled'}</p>
                  <p className="text-[11px] text-fog">{formatDate(c.updated_at)}</p>
                </div>
              </Link>

              {/* 3-dot menu */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <button
                    className="absolute right-2 top-1/2 -translate-y-1/2 flex size-8 items-center justify-center rounded-lg bg-card/80 border border-border opacity-0 group-hover:opacity-100 active:opacity-100 hover:bg-accent smooth-hover z-10"
                    aria-label="Chat options"
                  >
                    <MoreHorizontal className="size-4 text-stone" />
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
