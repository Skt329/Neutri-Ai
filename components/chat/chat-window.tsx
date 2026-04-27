'use client'

import { useState, useRef, useEffect } from 'react'
import { Send, Mic, Paperclip } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AnimatedMessage, TypingIndicator } from '@/components/chat/animated-message'
import { ChatHeader } from '@/components/chat/chat-header'
import { SidePanel } from '@/components/chat/side-panel'
import { QuickActions } from '@/components/chat/quick-actions'
import type { Message } from '@/lib/types'

interface ChatWindowProps {
  conversationId?: string
  conversationTitle?: string
  initialMessages?: Message[]
  onSendMessage?: (message: string) => Promise<void>
}

export function ChatWindow({
  conversationId,
  conversationTitle = 'New Conversation',
  initialMessages = [],
  onSendMessage,
}: ChatWindowProps) {
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [inputValue, setInputValue] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [mealsOpen, setMealsOpen] = useState(false)
  const [pantryOpen, setPantryOpen] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSendMessage = async () => {
    if (!inputValue.trim()) return

    // Add user message
    const userMessage: Message = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: inputValue,
      created_at: new Date().toISOString(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInputValue('')
    setIsLoading(true)

    try {
      // Call the provided send handler
      if (onSendMessage) {
        await onSendMessage(inputValue)
      }
    } catch (error) {
      console.error('[ChatWindow] Error sending message:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  return (
    <>
      {/* Chat Header */}
      <ChatHeader title={conversationTitle} conversationId={conversationId} />

      {/* Messages Container */}
      <div className="flex-1 overflow-y-auto px-4 md:px-6 py-6 space-y-4">
        {messages.length === 0 ? (
          // Empty State
          <div className="flex items-center justify-center h-full">
            <div className="text-center space-y-6 max-w-2xl mx-auto">
              <div className="space-y-2">
                <h2 className="text-3xl font-bold">Hello! I&apos;m your AI Diet Assistant</h2>
                <p className="text-muted-foreground text-lg">
                  Let&apos;s work together to achieve your nutrition goals
                </p>
              </div>

              {/* Suggested Questions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {[
                  'What should I eat to gain muscle?',
                  'Create a meal plan for this week',
                  'Analyze my nutrition intake',
                  'What are my pantry items?',
                ].map((question, idx) => (
                  <button
                    key={idx}
                    onClick={() => setInputValue(question)}
                    className="p-3 rounded-lg border border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 text-left hover:scale-105 active:scale-95"
                  >
                    <p className="text-sm font-medium">{question}</p>
                  </button>
                ))}
              </div>

              {/* Quick Actions */}
              <div className="pt-6">
                <p className="text-sm text-muted-foreground mb-4">Quick Access</p>
                <QuickActions
                  onMeals={() => setMealsOpen(true)}
                  onPantry={() => setPantryOpen(true)}
                  onAnalytics={() => {}}
                  onInsights={() => {}}
                />
              </div>
            </div>
          </div>
        ) : (
          // Messages List
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className="group"
              >
                <AnimatedMessage
                  role={message.role}
                  content={message.content}
                  timestamp={message.created_at ? new Date(message.created_at) : undefined}
                />
              </div>
            ))}

            {isLoading && <TypingIndicator />}

            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Area */}
      <div className="border-t border-border/40 bg-card/50 backdrop-blur-sm p-4 md:p-6 space-y-4">
        {/* Quick Actions - shown when not empty */}
        {messages.length > 0 && (
          <div>
            <p className="text-xs text-muted-foreground mb-3 uppercase font-semibold">Quick Access</p>
            <QuickActions
              onMeals={() => setMealsOpen(true)}
              onPantry={() => setPantryOpen(true)}
              onAnalytics={() => {}}
              onInsights={() => {}}
            />
          </div>
        )}

        {/* Message Input */}
        <div className="flex gap-3">
          <div className="flex-1 flex gap-2 bg-muted rounded-lg px-4 py-2 items-center border border-border/50 focus-within:border-primary/50 transition-colors">
            <input
              type="text"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tell me what you ate or ask a question..."
              className="flex-1 bg-transparent outline-none placeholder:text-muted-foreground/50"
              disabled={isLoading}
            />

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:text-primary"
              title="Attach file"
            >
              <Paperclip className="w-4 h-4" />
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 hover:text-primary"
              title="Voice input"
            >
              <Mic className="w-4 h-4" />
            </Button>
          </div>

          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90"
            size="lg"
          >
            <Send className="w-4 h-4" />
            <span className="hidden md:inline">Send</span>
          </Button>
        </div>

        <p className="text-xs text-muted-foreground text-center">
          Press Enter to send • Shift+Enter for new line
        </p>
      </div>

      {/* Side Panels */}
      <SidePanel
        isOpen={mealsOpen}
        onClose={() => setMealsOpen(false)}
        title="Your Meals"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">Meals will be displayed here</p>
        </div>
      </SidePanel>

      <SidePanel
        isOpen={pantryOpen}
        onClose={() => setPantryOpen(false)}
        title="Your Pantry"
      >
        <div className="space-y-4">
          <p className="text-muted-foreground">Pantry items will be displayed here</p>
        </div>
      </SidePanel>
    </>
  )
}
