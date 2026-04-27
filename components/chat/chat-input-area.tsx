'use client'

import { useState } from 'react'
import { Send, Plus, Settings } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatInputAreaProps {
  onSend: (message: string) => void
  isLoading?: boolean
}

const quickActions = [
  { label: '📝 Log meal', color: 'bg-turmeric' },
  { label: '🛒 Order', color: 'bg-sage' },
  { label: '📋 Plan', color: 'bg-mint2' },
  { label: '📊 Progress', color: 'bg-sage2' },
]

export function ChatInputArea({ onSend, isLoading = false }: ChatInputAreaProps) {
  const [message, setMessage] = useState('')

  const handleSend = () => {
    if (message.trim()) {
      onSend(message)
      setMessage('')
    }
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  return (
    <div className="w-full border-t border-border bg-card space-y-3 p-4">
      {/* Quick Actions */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {quickActions.map((action) => (
          <Button
            key={action.label}
            variant="outline"
            size="sm"
            className={`whitespace-nowrap text-xs h-8 ${action.color}`}
          >
            {action.label}
          </Button>
        ))}
      </div>

      {/* Input Area */}
      <div className="flex gap-2">
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask NutriAI anything..."
          className="flex-1 bg-muted border border-border rounded-lg px-4 py-3 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 max-h-24"
          rows={1}
        />
        <div className="flex flex-col gap-2">
          <Button
            onClick={handleSend}
            disabled={!message.trim() || isLoading}
            className="bg-sage hover:bg-sage2 text-white h-10 w-10 p-0 rounded-lg"
          >
            <Send className="w-4 h-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-10 w-10 p-0"
          >
            <Settings className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}
