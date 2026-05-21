'use client'

import { type Conversation, groupConversations } from '@/lib/conversation-utils'
import { ConversationItem } from '@/components/chat/conversation-item'

interface ConversationListProps {
  conversations: Conversation[]
  activeId: string | undefined
  onRename: (c: Conversation) => void
  onDelete: (c: Conversation) => void
  emptyMessage: string
}

export function ConversationList({ conversations, activeId, onRename, onDelete, emptyMessage }: ConversationListProps) {
  const groups = groupConversations(conversations)

  return (
    <nav className="flex-1 overflow-y-auto px-2 pb-2 space-y-3">
      {groups.map((group) => (
        <div key={group.label}>
          <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-white/40">
            {group.label}
          </p>
          <ul className="space-y-0.5">
            {group.items.map((c) => (
              <ConversationItem
                key={c.id}
                conversation={c}
                isActive={c.id === activeId}
                onRename={onRename}
                onDelete={onDelete}
              />
            ))}
          </ul>
        </div>
      ))}

      {conversations.length === 0 && (
        <p className="px-3 py-4 text-center text-sm text-white/40">
          {emptyMessage}
        </p>
      )}
    </nav>
  )
}
