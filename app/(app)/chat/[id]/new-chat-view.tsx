"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createConversationOnly } from "../actions"
import { toast } from "sonner"
import { Leaf, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * NewChatView — a lightweight input-only view for /chat/new.
 *
 * This component intentionally does NOT use the `useChat` hook.
 * On first send it:
 *   1. Creates the conversation row via server action
 *   2. Navigates to /chat/{realId}?prefill={message}
 *   3. The real ChatView's existing prefill handler auto-sends the message
 *
 * This avoids the race condition of trying to set up useChat's transport
 * mid-render after a state update.
 */
export function NewChatView() {
  const router = useRouter()
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const creatingRef = useRef(false) // guard against double-tap

  const handleSend = useCallback(async () => {
    const text = input.trim()
    if (!text || sending || creatingRef.current) return

    creatingRef.current = true
    setSending(true)

    try {
      const newId = await createConversationOnly()
      // Navigate to the real chat page with prefill — the existing
      // prefill handler in ChatView will auto-send the message.
      router.push(`/chat/${newId}?prefill=${encodeURIComponent(text)}`)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create conversation")
      creatingRef.current = false
      setSending(false)
    }
  }, [input, sending, router])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Desktop: Enter sends, Shift+Enter newline
    // Mobile (coarse pointer) handled by button only
    const isTouch = window.matchMedia("(pointer: coarse)").matches
    if (!isTouch && e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const ta = e.target
    ta.style.height = "auto"
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`
  }

  return (
    <div className="flex flex-col h-full bg-cream">
      {/* ── Empty state hero ── */}
      <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6">
        <div className="relative">
          <div className="absolute inset-0 bg-forest/10 rounded-full blur-xl animate-pulse" />
          <div className="relative bg-gradient-to-br from-forest to-forest/80 rounded-2xl p-4 shadow-lg">
            <Leaf className="size-10 text-cream" />
          </div>
        </div>
        <div className="text-center space-y-2">
          <h2 className="text-xl font-bold text-ink">What would you like to eat?</h2>
          <p className="text-sm text-stone max-w-xs">
            Log meals, track nutrition, get recipe ideas, or manage your pantry.
          </p>
        </div>
      </div>

      {/* ── Input bar (flush to bottom) ── */}
      <div className="sticky bottom-0 bg-cream border-t border-border px-3 py-2 safe-area-pb">
        <div className="flex items-end gap-2 max-w-3xl mx-auto">
          <div className="relative flex-1">
            <textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={handleKeyDown}
              placeholder="Tell NutriAI what you ate..."
              disabled={sending}
              rows={1}
              className={cn(
                "w-full resize-none rounded-2xl border border-border bg-card px-4 py-3 pr-12",
                "text-sm text-ink placeholder:text-fog",
                "focus:outline-none focus:ring-2 focus:ring-forest/30 focus:border-forest",
                "disabled:opacity-50 disabled:cursor-not-allowed",
                "transition-all duration-150",
              )}
              style={{ maxHeight: 160 }}
            />
          </div>
          <Button
            onClick={handleSend}
            disabled={!input.trim() || sending}
            size="icon"
            className={cn(
              "size-11 rounded-xl shrink-0 transition-all duration-200",
              input.trim()
                ? "bg-forest hover:bg-forest/90 text-cream shadow-md"
                : "bg-muted text-fog",
            )}
          >
            {sending ? (
              <div className="size-4 border-2 border-cream/30 border-t-cream rounded-full animate-spin" />
            ) : (
              <Send className="size-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
