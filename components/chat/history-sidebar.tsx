'use client'

import { useState } from 'react'
import { Plus, Search, Menu, LogOut, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ConversationItem {
  id: string
  title: string
  timestamp: string
  isPinned?: boolean
}

interface HistorySidebarProps {
  conversations: ConversationItem[]
  currentId?: string
  onNewChat: () => void
  onSelectChat: (id: string) => void
  onSignOut: () => void
}

export function HistorySidebar({
  conversations,
  currentId,
  onNewChat,
  onSelectChat,
  onSignOut,
}: HistorySidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [isOpen, setIsOpen] = useState(false)

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="ghost"
        size="sm"
        className="md:hidden fixed top-4 left-4 z-40 h-9 w-9 p-0"
        onClick={() => setIsOpen(!isOpen)}
      >
        <Menu className="w-5 h-5" />
      </Button>

      {/* Sidebar */}
      <div
        className={`fixed md:static inset-y-0 left-0 w-60 md:w-60 bg-card border-r border-border transition-transform duration-300 z-30 flex flex-col ${
          isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        {/* Header */}
        <div className="p-4 border-b border-border space-y-3">
          <div className="text-center">
            <h2 className="font-serif text-lg font-bold text-foreground">NutriAI</h2>
            <p className="text-xs text-muted-foreground">Your AI Dietitian</p>
          </div>
          
          <Button
            onClick={onNewChat}
            className="w-full bg-sage hover:bg-sage2 text-white font-semibold h-9 gap-2"
          >
            <Plus className="w-4 h-4" />
            New conversation
          </Button>
        </div>

        {/* Search */}
        <div className="px-4 py-3 border-b border-border">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-muted border border-border rounded-lg pl-9 pr-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-primary/50"
            />
          </div>
        </div>

        {/* Conversations */}
        <div className="flex-1 overflow-y-auto px-2 py-3">
          {filtered.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-xs text-muted-foreground">No conversations yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filtered.map((conv) => (
                <button
                  key={conv.id}
                  onClick={() => {
                    onSelectChat(conv.id)
                    setIsOpen(false)
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors ${
                    currentId === conv.id
                      ? 'bg-sage text-white'
                      : 'hover:bg-muted text-foreground'
                  }`}
                >
                  <div className="font-medium truncate">{conv.title}</div>
                  <div className="text-xs opacity-60">{conv.timestamp}</div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-border p-3 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs gap-2 h-8"
          >
            <Settings className="w-4 h-4" />
            Settings
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start text-xs gap-2 h-8 text-destructive hover:text-destructive"
            onClick={onSignOut}
          >
            <LogOut className="w-4 h-4" />
            Sign out
          </Button>
        </div>
      </div>

      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-20"
          onClick={() => setIsOpen(false)}
        />
      )}
    </>
  )
}
