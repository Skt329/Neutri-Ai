'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { sessionManager } from '@/lib/auth/session-manager'
import { dbCache } from '@/lib/cache/db-cache'
import { Button } from '@/components/ui/button'
import { Menu, X, LogOut, Settings, Plus, MessageSquare, Home, Search } from 'lucide-react'
import type { Message } from '@/lib/types'

interface Conversation {
  id: string
  title: string
  created_at: string
  updated_at: string
}

export function ChatFirstLayout({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode
  userEmail: string
  userName: string | null
}) {
  const pathname = usePathname()
  const [sidebarOpen, setSidebarOpen] = useState(true)
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [currentConversation, setCurrentConversation] = useState<string | null>(null)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  // Determine if we're on a chat page
  const isChatPage = pathname?.includes('/chat')

  useEffect(() => {
    const initializeData = async () => {
      try {
        // Initialize cache
        await dbCache.init()

        // Get session (cached)
        const { user } = await sessionManager.getSession()
        if (!user) return

        // Check for cached conversations first
        const cached = await dbCache.getConversationsList(user.id)
        if (cached) {
          setConversations(cached)
          setLoading(false)
          return
        }

        // Fetch conversations from DB
        const supabase = createClient()
        const { data } = await supabase
          .from('conversations')
          .select('id, title, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false })

        if (data) {
          setConversations(data as Conversation[])
          // Cache for 1 hour
          await dbCache.cacheConversationsList(user.id, data)
        }
      } catch (error) {
        console.error('[ChatFirstLayout] Error initializing:', error)
      } finally {
        setLoading(false)
      }
    }

    initializeData()
  }, [])

  const handleLogout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    sessionManager.invalidateCache()
    await dbCache.clearAll()
    window.location.href = '/auth/login'
  }

  return (
    <div className="flex h-screen w-full bg-background text-foreground overflow-hidden">
      {/* Mobile Sidebar Toggle */}
      <div className="md:hidden fixed top-4 left-4 z-50">
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="p-2 rounded-lg bg-primary/20 hover:bg-primary/30 transition-colors"
        >
          {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar - Conversation History */}
      <aside
        className={`
          fixed md:relative w-64 h-screen bg-card border-r border-border/40 
          flex flex-col transition-all duration-300 ease-out z-40
          ${mobileMenuOpen ? 'left-0' : '-left-64 md:left-0'}
          md:translate-x-0
        `}
      >
        {/* Header */}
        <div className="p-4 border-b border-border/40 space-y-4">
          <Link href="/chat" className="flex items-center gap-2 group">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
              <MessageSquare className="w-6 h-6 text-primary-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm truncate">NutriAI</p>
              <p className="text-xs text-muted-foreground truncate">AI Diet Assistant</p>
            </div>
          </Link>

          <Link href="/chat" className="w-full">
            <Button className="w-full gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              <Plus className="w-4 h-4" />
              New Chat
            </Button>
          </Link>
        </div>

        {/* Search */}
        <div className="px-4 pt-4">
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50 border border-border/50 hover:border-primary/30 transition-colors">
            <Search className="w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        {/* Conversations List */}
        <div className="flex-1 overflow-y-auto px-2 py-4 space-y-1">
          {loading ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">Loading conversations...</div>
          ) : conversations.length === 0 ? (
            <div className="px-4 py-8 text-center text-muted-foreground text-sm">No conversations yet. Start a new chat!</div>
          ) : (
            conversations.map((conv) => (
              <Link
                key={conv.id}
                href={`/chat/${conv.id}`}
                onClick={() => {
                  setCurrentConversation(conv.id)
                  setMobileMenuOpen(false)
                }}
                className={`
                  block px-3 py-2 rounded-lg transition-all duration-200 ease-out
                  group hover:bg-primary/10 cursor-pointer
                  ${currentConversation === conv.id || pathname === `/chat/${conv.id}` 
                    ? 'bg-primary/15 border-l-2 border-primary' 
                    : 'border-l-2 border-transparent'
                  }
                `}
              >
                <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
                  {conv.title}
                </p>
                <p className="text-xs text-muted-foreground">
                  {new Date(conv.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))
          )}
        </div>

        {/* Footer - User & Settings */}
        <div className="border-t border-border/40 p-4 space-y-3">
          <div className="px-3 py-2 rounded-lg bg-muted/50 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">ACCOUNT</p>
            <p className="text-sm font-medium truncate">{userName || 'User'}</p>
            <p className="text-xs text-muted-foreground truncate">{userEmail}</p>
          </div>

          <div className="flex gap-2">
            <Link href="/profile" className="flex-1">
              <Button variant="outline" size="sm" className="w-full gap-2">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              onClick={handleLogout}
              className="gap-2 text-destructive hover:text-destructive"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </aside>

      {/* Main Content Area - Chat Window */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {children}
      </main>

      {/* Mobile Overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 md:hidden z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </div>
  )
}
