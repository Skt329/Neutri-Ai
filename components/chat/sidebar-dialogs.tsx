'use client'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Spinner } from '@/components/ui/spinner'
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
import type { Conversation } from '@/lib/conversation-utils'

interface SidebarDialogsProps {
  renameTarget: Conversation | null
  deleteTarget: Conversation | null
  renameValue: string
  onRenameValueChange: (value: string) => void
  onCloseRename: () => void
  onCloseDelete: () => void
  onConfirmRename: () => void
  onConfirmDelete: () => void
  pending: boolean
}

export function SidebarDialogs({
  renameTarget,
  deleteTarget,
  renameValue,
  onRenameValueChange,
  onCloseRename,
  onCloseDelete,
  onConfirmRename,
  onConfirmDelete,
  pending,
}: SidebarDialogsProps) {
  return (
    <>
      {/* Rename Dialog */}
      <Dialog open={!!renameTarget} onOpenChange={(open) => { if (!open) onCloseRename() }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this chat a descriptive name.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => onRenameValueChange(e.target.value)}
            placeholder="Chat name…"
            maxLength={120}
            onKeyDown={(e) => { if (e.key === 'Enter') onConfirmRename() }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={onCloseRename} disabled={pending}>Cancel</Button>
            <Button onClick={onConfirmRename} disabled={pending || !renameValue.trim()} className="bg-forest hover:bg-sage text-white">
              {pending ? <><Spinner className="size-4 mr-1" /> Saving…</> : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(open) => { if (!open) onCloseDelete() }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete &ldquo;{deleteTarget?.title || 'Untitled chat'}&rdquo;?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this conversation and all its messages. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={onConfirmDelete} disabled={pending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {pending ? <><Spinner className="size-4 mr-1" /> Deleting…</> : 'Delete'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
