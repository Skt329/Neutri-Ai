'use client'

import { memo } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react'
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
import { type Conversation, formatRelativeTime } from '@/lib/conversation-utils'

interface ConversationItemProps {
  conversation: Conversation
  isActive: boolean
  onRename: (c: Conversation) => void
  onDelete: (c: Conversation) => void
}

function ConversationItemInner({ conversation: c, isActive, onRename, onDelete }: ConversationItemProps) {
  return (
    <li>
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
                <DropdownMenuItem onClick={() => onRename(c)}>
                  <Pencil className="mr-2 size-3.5" /> Rename
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onDelete(c)} className="text-destructive focus:text-destructive">
                  <Trash2 className="mr-2 size-3.5" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </Link>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-40">
          <ContextMenuItem onClick={() => onRename(c)}>
            <Pencil className="mr-2 size-3.5" /> Rename
          </ContextMenuItem>
          <ContextMenuItem onClick={() => onDelete(c)} className="text-destructive focus:text-destructive">
            <Trash2 className="mr-2 size-3.5" /> Delete
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </li>
  )
}

export const ConversationItem = memo(ConversationItemInner)
