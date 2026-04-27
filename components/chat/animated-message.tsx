'use client'

import { useEffect, useState } from 'react'
import { MessageCircle, Copy, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface AnimatedMessageProps {
  role: 'user' | 'assistant'
  content: string
  timestamp?: Date
  isLoading?: boolean
}

export function AnimatedMessage({ role, content, timestamp, isLoading }: AnimatedMessageProps) {
  const [displayedContent, setDisplayedContent] = useState('')
  const [copied, setCopied] = useState(false)
  const isUser = role === 'user'

  useEffect(() => {
    if (isLoading) {
      setDisplayedContent(content)
      return
    }

    // For user messages, show instantly
    if (isUser) {
      setDisplayedContent(content)
      return
    }

    // For assistant messages, stream the content character by character
    let currentIndex = 0
    const streamInterval = setInterval(() => {
      if (currentIndex < content.length) {
        setDisplayedContent(content.substring(0, currentIndex + 1))
        currentIndex++
      } else {
        clearInterval(streamInterval)
      }
    }, 15) // 15ms per character for smooth typing effect

    return () => clearInterval(streamInterval)
  }, [content, isLoading, isUser])

  const handleCopy = () => {
    navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div
      className={`
        flex gap-3 animate-fade-in-up
        ${isUser ? 'flex-row-reverse justify-start' : 'flex-row justify-start'}
      `}
    >
      {/* Avatar */}
      <div
        className={`
          flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center
          ${
            isUser
              ? 'bg-primary text-primary-foreground'
              : 'bg-secondary text-secondary-foreground'
          }
        `}
      >
        {isUser ? (
          <span className="text-xs font-bold">U</span>
        ) : (
          <MessageCircle className="w-4 h-4" />
        )}
      </div>

      {/* Message Content */}
      <div className={`flex-1 max-w-2xl ${isUser ? 'text-right' : 'text-left'}`}>
        <div
          className={`
            inline-block px-4 py-2 rounded-lg transition-all duration-200
            ${
              isUser
                ? 'bg-primary text-primary-foreground'
                : 'bg-muted text-foreground'
            }
            ${isLoading ? 'animate-pulse' : ''}
          `}
        >
          {isLoading ? (
            <div className="flex gap-1">
              <div className="w-2 h-2 bg-current rounded-full animate-bounce" />
              <div
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: '0.2s' }}
              />
              <div
                className="w-2 h-2 bg-current rounded-full animate-bounce"
                style={{ animationDelay: '0.4s' }}
              />
            </div>
          ) : (
            <div className="prose prose-sm dark:prose-invert max-w-none">
              {isUser ? (
                <p>{displayedContent}</p>
              ) : (
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{displayedContent}</ReactMarkdown>
              )}
            </div>
          )}
        </div>

        {/* Message Actions & Timestamp */}
        {!isLoading && (
          <div
            className={`
              flex items-center gap-2 mt-1 opacity-0 group-hover:opacity-100
              transition-opacity duration-200
              ${isUser ? 'flex-row-reverse justify-end' : 'justify-start'}
            `}
            onMouseEnter={(e) => e.currentTarget.parentElement?.classList.add('group')}
          >
            {!isUser && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopy}
                className="h-6 w-6 p-0"
                title="Copy message"
              >
                {copied ? (
                  <Check className="w-3 h-3 text-green-500" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
              </Button>
            )}

            {timestamp && (
              <span className="text-xs text-muted-foreground">
                {timestamp.toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export function TypingIndicator() {
  return (
    <div className="flex gap-3 animate-fade-in-up">
      <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center bg-secondary text-secondary-foreground">
        <MessageCircle className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-1 px-4 py-2 rounded-lg bg-muted">
        <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" />
        <div
          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: '0.2s' }}
        />
        <div
          className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"
          style={{ animationDelay: '0.4s' }}
        />
      </div>
    </div>
  )
}
