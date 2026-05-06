"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { createConversationOnly } from "../actions"
import { toast } from "sonner"
import { Leaf, Send, Camera, X } from "lucide-react"
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
  const [pendingImages, setPendingImages] = useState<Array<{ url: string; name: string; type: string }>>([])
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const creatingRef = useRef(false) // guard against double-tap

  const MAX_IMAGE_SIZE = 4 * 1024 * 1024
  const MAX_IMAGES = 3

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) { toast.error(`${file.name} is not an image`); continue }
      if (file.size > MAX_IMAGE_SIZE) { toast.error(`${file.name} exceeds 4MB limit`); continue }
      if (pendingImages.length >= MAX_IMAGES) { toast.error(`Maximum ${MAX_IMAGES} images per message`); break }
      const reader = new FileReader()
      reader.onload = () => {
        setPendingImages((prev) => prev.length >= MAX_IMAGES ? prev : [...prev, { url: reader.result as string, name: file.name, type: file.type }])
      }
      reader.readAsDataURL(file)
    }
    e.target.value = ""
  }

  function removeImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
  }

  const handleSend = useCallback(async () => {
    const text = input.trim()
    const hasImages = pendingImages.length > 0
    if ((!text && !hasImages) || sending || creatingRef.current) return

    creatingRef.current = true
    setSending(true)

    try {
      const newId = await createConversationOnly()
      // If images are attached, store them in sessionStorage for ChatView to pick up
      if (hasImages) {
        try {
          sessionStorage.setItem(`prefill-images-${newId}`, JSON.stringify(pendingImages))
        } catch { /* sessionStorage full — images will just be lost */ }
        setPendingImages([])
      }
      // Navigate to the real chat page with prefill — the existing
      // prefill handler in ChatView will auto-send the message.
      router.push(`/chat/${newId}?prefill=${encodeURIComponent(text || "Add these items to my pantry")}`)
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed to create conversation"

      if (msg.includes("timed out") || msg.includes("timeout")) {
        toast.error("Connection slow — retrying…", { duration: 2000 })
        try {
          const retryId = await createConversationOnly()
          router.push(`/chat/${retryId}?prefill=${encodeURIComponent(text)}`)
          return
        } catch {
          toast.error("Still failing. Please check your connection and try again.")
        }
      } else if (msg.includes("Not authenticated")) {
        toast.error("Session expired — refreshing…", { duration: 2000 })
        router.refresh() // triggers middleware session refresh
      } else {
        toast.error(msg)
      }

      creatingRef.current = false
      setSending(false)
    }
  }, [input, sending, router, pendingImages])

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
        <div className="max-w-3xl mx-auto">
          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative shrink-0 group">
                  <img src={img.url} alt={img.name} className="size-16 rounded-xl object-cover border border-border" />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-clay text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-clay/80 smooth-hover shadow-sm"
                  >
                    <X className="size-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2">
            {/* Hidden file input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={handleFileSelect}
            />
            {/* Camera / image attachment button */}
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => fileInputRef.current?.click()}
              disabled={sending || pendingImages.length >= MAX_IMAGES}
              aria-label="Attach image or take photo"
              className="text-stone hover:text-forest rounded-full size-10 shrink-0"
            >
              <Camera className="size-5" />
            </Button>
            <div className="relative flex-1">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={pendingImages.length > 0 ? "Add a message about the image…" : "Tell NutriAI what you ate..."}
                disabled={sending}
                rows={1}
                className={cn(
                  "w-full resize-none rounded-2xl border border-border bg-card px-4 py-3",
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
              disabled={(!input.trim() && pendingImages.length === 0) || sending}
              size="icon"
              className={cn(
                "size-11 rounded-xl shrink-0 transition-all duration-200",
                (input.trim() || pendingImages.length > 0)
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
    </div>
  )
}
