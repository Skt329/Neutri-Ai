'use client'

import { useState } from 'react'
import { Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ChatMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: string
  embeddedCard?: React.ReactNode
}

export function ChatMessage({
  role,
  content,
  timestamp,
  embeddedCard,
}: ChatMessageProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  if (role === 'user') {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-sage text-white">
          <p className="text-sm leading-relaxed">{content}</p>
          {timestamp && <p className="text-xs opacity-70 mt-1">{timestamp}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start gap-3 animate-fade-in-up">
      <div className="w-8 h-8 rounded-full bg-sage text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
        🌱
      </div>
      <div className="flex-1">
        <div className="max-w-[70%] px-4 py-3 rounded-2xl bg-cream2 text-foreground">
          <p className="text-sm leading-relaxed whitespace-pre-wrap">{content}</p>
          {timestamp && <p className="text-xs opacity-70 mt-1">{timestamp}</p>}
        </div>
        
        {/* Embedded Card */}
        {embeddedCard && (
          <div className="mt-3 ml-0">
            {embeddedCard}
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-2 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={handleCopy}
          >
            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>
      </div>
    </div>
  )
}
