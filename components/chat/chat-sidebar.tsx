'use client'

import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import Link from 'next/link'
import { Leaf, Plus, X, MessageSquare, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { ConversationList } from '@/components/chat/conversation-list'
import { SidebarSearch } from '@/components/chat/sidebar-search'
import { SidebarDialogs } from '@/components/chat/sidebar-dialogs'
import { deleteConversation, renameConversation } from '@/app/(app)/chat/actions'
import { toast } from 'sonner'
import type { Conversation } from '@/lib/conversation-utils'

interface ChatSidebarProps {
  conversations: Conversation[]
  userName: string | null
  streakDays: number
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
      setDeleteTarget(null)
      router.push('/chat')
      router.refresh()
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
        <SidebarSearch value={search} onChange={setSearch} />

        {/* Conversation list */}
        <ConversationList
          conversations={filtered}
          activeId={activeId}
          onRename={openRename}
          onDelete={setDeleteTarget}
          emptyMessage={search ? 'No matching chats' : 'No conversations yet'}
        />

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
              aria-label="Settings"
            >
              <Settings className="size-4" />
            </Link>
          </div>
        </div>
      </aside>

      {/* Dialogs */}
      <SidebarDialogs
        renameTarget={renameTarget}
        deleteTarget={deleteTarget}
        renameValue={renameValue}
        onRenameValueChange={setRenameValue}
        onCloseRename={() => setRenameTarget(null)}
        onCloseDelete={() => setDeleteTarget(null)}
        onConfirmRename={handleRename}
        onConfirmDelete={handleDelete}
        pending={actionPending}
      />
    </>
  )
}
