'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronLeft, MoreVertical, Trash2, Edit2, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'

interface ChatHeaderProps {
  title?: string
  conversationId?: string
  onDelete?: () => void
  onRename?: () => void
}

export function ChatHeader({
  title = 'New Conversation',
  conversationId,
  onDelete,
  onRename,
}: ChatHeaderProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editTitle, setEditTitle] = useState(title)

  const handleSaveTitle = async () => {
    if (editTitle.trim() && editTitle !== title && conversationId) {
      // Call rename function from parent
      onRename?.()
      setIsEditing(false)
    }
  }

  return (
    <header className="border-b border-border/40 bg-card/50 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center justify-between px-4 py-3 md:px-6">
        {/* Left - Back button & Title */}
        <div className="flex items-center gap-4 min-w-0 flex-1">
          <Link href="/chat" className="md:hidden p-2 hover:bg-muted rounded-lg transition-colors">
            <ChevronLeft className="w-5 h-5" />
          </Link>

          <div className="flex-1 min-w-0">
            {isEditing ? (
              <input
                type="text"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={handleSaveTitle}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') setIsEditing(false)
                }}
                autoFocus
                className="bg-transparent text-lg font-semibold outline-none border-b border-primary max-w-full"
              />
            ) : (
              <h1 className="text-lg font-semibold truncate text-balance">{title}</h1>
            )}
          </div>
        </div>

        {/* Right - Actions */}
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" className="hidden md:inline-flex">
            <Share2 className="w-4 h-4" />
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="text-destructive">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
