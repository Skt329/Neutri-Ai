"use client"

import { useState, useEffect, useRef, useCallback, memo } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreVertical, Send, Square, Trash2, Pencil, Leaf, User, Wrench, Sparkles, Image as ImageIcon, Paperclip, Check, AlertCircle, ChevronDown, ArrowDown, Copy, FileDown, Share2, Link2, Camera, X } from "lucide-react"
import { toast } from "sonner"
import { deleteConversation, renameConversation } from "../actions"
import { shareChat, revokeShare } from "../../profile/settings-actions"
import { cn } from "@/lib/utils"

import {
  AskUserCard,
  ChooseOptionCard,
  ProposeMealCard,
  ProposePantryCard,
  type AskUserInput,
  type AskUserOutput,
  type ChooseOptionInput,
  type ChooseOptionOutput,
  type ProposeMealInput,
  type ProposeMealOutput,
  type ProposePantryInput,
  type ProposePantryOutput,
} from "@/components/chat-tool-cards"
import { CLIENT_TOOL_NAMES } from "@/lib/ai/tools"
import {
  SwiggyOrderReviewCard,
  RestaurantPickerCard,
  MenuSelectorCard,
  PantryRestockCard,
  type SwiggyOrderInput,
  type SwiggyOrderOutput,
  type RestaurantPickInput,
  type RestaurantPickOutput,
  type MenuSelectionInput,
  type MenuSelectionOutput,
  type PantryRestockInput,
  type PantryRestockOutput,
} from "@/components/swiggy/tool-cards"
import { ChatStatsBar } from "@/components/chat/chat-stats-bar"
import { QuickActions } from "@/components/chat/quick-actions"

type AddToolOutput = (args: { tool: string; toolCallId: string; output: unknown }) => void

export function ChatView({
  conversationId,
  initialMessages,
  title,
  caloriesLeft,
  proteinLeft,
  goalLabel,
}: {
  conversationId: string
  initialMessages: UIMessage[]
  title: string | null
  caloriesLeft: number | null
  proteinLeft: number | null
  goalLabel: string | null
}) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const hadTitleRef = useRef(Boolean(title))
  const prefillHandled = useRef(false)
  const { messages, sendMessage, status, error, addToolOutput, stop } = useChat({
    id: conversationId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: "/api/chat",
      prepareSendMessagesRequest: ({ messages: msgs }) => ({
        body: { messages: msgs, conversationId },
      }),
    }),
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    onFinish: () => {
      router.refresh()
      if (!hadTitleRef.current) {
        hadTitleRef.current = true
        // Delayed refresh to catch the async fire-and-forget title generation
        setTimeout(() => router.refresh(), 3000)
      }
    },
    onError: (err) => {
      const msg = err.message || ""
      if (msg.includes("401") || msg.includes("Unauthorized")) {
        toast.error("Session expired. Please refresh the page.")
      } else if (msg.includes("503") || msg.includes("timed out")) {
        toast.error("Connection to server timed out. Please try again.")
      } else {
        toast.error(msg || "Something went wrong")
      }
    },
  })

  const [input, setInput] = useState("")
  const [lastFailedInput, setLastFailedInput] = useState<string | null>(null)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const [renameOpen, setRenameOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)
  const [renameValue, setRenameValue] = useState(title ?? "")
  const [actionPending, setActionPending] = useState(false)
  const [isTouchDevice, setIsTouchDevice] = useState(false)
  const [pendingImages, setPendingImages] = useState<Array<{ url: string; name: string; type: string }>>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const isAutoScrollingRef = useRef(false)
  const scrollRafRef = useRef<number | null>(null)

  const MAX_IMAGE_SIZE = 4 * 1024 * 1024 // 4MB
  const MAX_IMAGES = 3

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const files = e.target.files
    if (!files) return
    const newImages: Array<{ url: string; name: string; type: string }> = []
    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image`)
        continue
      }
      if (file.size > MAX_IMAGE_SIZE) {
        toast.error(`${file.name} exceeds 4MB limit`)
        continue
      }
      if (pendingImages.length + newImages.length >= MAX_IMAGES) {
        toast.error(`Maximum ${MAX_IMAGES} images per message`)
        break
      }
      const reader = new FileReader()
      reader.onload = () => {
        setPendingImages((prev) => {
          if (prev.length >= MAX_IMAGES) return prev
          return [...prev, { url: reader.result as string, name: file.name, type: file.type }]
        })
      }
      reader.readAsDataURL(file)
      newImages.push({ url: "", name: file.name, type: file.type })
    }
    // Reset input so the same file can be selected again
    e.target.value = ""
  }

  function removeImage(index: number) {
    setPendingImages((prev) => prev.filter((_, i) => i !== index))
  }

  // Detect touch device — on mobile, Enter inserts newline (send via button).
  // On desktop, Enter sends (Shift+Enter for newline).
  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    setIsTouchDevice(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  // Smart auto-scroll: batched with rAF to prevent jank during streaming
  useEffect(() => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
      if (isNearBottom) {
        isAutoScrollingRef.current = true
        el.scrollTop = el.scrollHeight
        // Clear auto-scroll flag after browser processes the scroll
        requestAnimationFrame(() => { isAutoScrollingRef.current = false })
      } else {
        setShowScrollDown(true)
      }
    })
    return () => { if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current) }
  }, [messages, status])

  // Track scroll position — ignores programmatic auto-scrolls
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    function onScroll() {
      if (isAutoScrollingRef.current) return
      const nearBottom = el!.scrollHeight - el!.scrollTop - el!.clientHeight < 150
      setShowScrollDown(!nearBottom)
    }
    el.addEventListener("scroll", onScroll, { passive: true })
    return () => el.removeEventListener("scroll", onScroll)
  }, [])

  useEffect(() => {
    if (prefillHandled.current) return
    const prefill = searchParams.get("prefill")
    if (!prefill || initialMessages.length > 0) return
    prefillHandled.current = true

    // Check if NewChatView stored images in sessionStorage
    const storageKey = `prefill-images-${conversationId}`
    let storedImages: Array<{ url: string; name: string; type: string }> = []
    try {
      const raw = sessionStorage.getItem(storageKey)
      if (raw) {
        storedImages = JSON.parse(raw)
        sessionStorage.removeItem(storageKey)
      }
    } catch { /* ignore */ }

    if (storedImages.length > 0) {
      // Send multimodal message with images
      const parts: Array<{ type: "text"; text: string } | { type: "file"; mediaType: string; url: string }> = []
      parts.push({ type: "text", text: prefill })
      for (const img of storedImages) {
        parts.push({ type: "file", mediaType: img.type, url: img.url })
      }
      sendMessage({ parts })
    } else {
      sendMessage({ text: prefill })
    }

    const url = new URL(window.location.href)
    url.searchParams.delete("prefill")
    window.history.replaceState(null, "", url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keyboard shortcuts
  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && (status === "streaming" || status === "submitted")) {
        e.preventDefault()
        stop()
      }
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [status, stop])

  const isStreaming = status === "streaming" || status === "submitted"
  const isEmpty = messages.length === 0

  const sendText = useCallback((text: string) => {
    if (status === "streaming" || status === "submitted") return
    const hasImages = pendingImages.length > 0
    if (!text.trim() && !hasImages) return
    setLastFailedInput(text)
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"

    if (hasImages) {
      // Send as multimodal message with file parts
      const parts: Array<{ type: "text"; text: string } | { type: "file"; mediaType: string; url: string }> = []
      if (text.trim()) parts.push({ type: "text", text })
      for (const img of pendingImages) {
        parts.push({ type: "file", mediaType: img.type, url: img.url })
      }
      setPendingImages([])
      sendMessage({ parts })
    } else {
      sendMessage({ text })
    }
  }, [status, sendMessage, pendingImages])

  function handleTextareaChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    setInput(e.target.value)
    const el = e.target
    el.style.height = "auto"
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendText(input)
  }

  function scrollToBottom() {
    const el = scrollRef.current
    if (el) {
      isAutoScrollingRef.current = true
      el.scrollTo({ top: el.scrollHeight, behavior: "smooth" })
      setShowScrollDown(false)
      setTimeout(() => { isAutoScrollingRef.current = false }, 500)
    }
  }

  async function handleRename() {
    const clean = renameValue.trim().slice(0, 120)
    if (!clean) return
    setActionPending(true)
    try {
      await renameConversation(conversationId, clean)
      router.refresh()
      setRenameOpen(false)
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Rename failed")
    } finally {
      setActionPending(false)
    }
  }

  async function handleDelete() {
    setActionPending(true)
    try {
      await deleteConversation(conversationId)
      router.push("/chat")
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
      setActionPending(false)
    }
  }

  async function handleExportPDF() {
    toast.info("Generating PDF…")
    try {
      const { generateChatPDF } = await import("@/lib/chat-pdf")
      const textMessages = messages.filter(m => m.role === "user" || m.role === "assistant").map(m => ({
        role: m.role as "user" | "assistant",
        text: m.parts.filter((p): p is { type: "text"; text: string } => p.type === "text").map(p => p.text).join("\n"),
      })).filter(m => m.text.trim())
      await generateChatPDF(textMessages, title || "NutriAI Chat")
      toast.success("PDF downloaded")
    } catch (err) {
      toast.error("Failed to generate PDF")
    }
  }

  async function handleShare() {
    try {
      const result = await shareChat(conversationId)
      if ("ok" in result && result.ok) {
        await navigator.clipboard.writeText(result.url)
        toast.success("Share link copied to clipboard")
      } else if ("error" in result) {
        toast.error(result.error)
      }
    } catch {
      toast.error("Failed to create share link")
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0">
      {/* Mobile header (hidden on desktop where sidebar is visible) */}
      <header className="flex md:hidden items-center gap-2 border-b border-border bg-card px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to chats" className="text-stone hover:text-forest">
          <Link href="/chat">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-base font-semibold text-ink">
          {title || "New chat"}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat options" className="text-stone hover:text-forest">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameValue(title ?? ""); setRenameOpen(true) }}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportPDF()}>
              <FileDown className="mr-2 size-4" /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare()}>
              <Share2 className="mr-2 size-4" /> Share link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-clay focus:text-clay">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* Desktop stats bar (title + nutrition pills + menu) */}
      <div className="hidden md:flex items-center border-b border-border bg-card">
        <div className="flex-1 min-w-0">
          <ChatStatsBar
            title={title}
            caloriesLeft={caloriesLeft}
            proteinLeft={proteinLeft}
            streakDays={0}
            goalLabel={goalLabel}
          />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat options" className="text-stone hover:text-forest mr-2">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameValue(title ?? ""); setRenameOpen(true) }}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleExportPDF()}>
              <FileDown className="mr-2 size-4" /> Export PDF
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleShare()}>
              <Share2 className="mr-2 size-4" /> Share link
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-clay focus:text-clay">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages area — indicator is OUTSIDE scroll container */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="h-full overflow-y-auto" role="log" aria-live="polite" aria-label="Chat messages" style={{ contentVisibility: 'auto' }}>
          <div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
            {isEmpty ? <Suggestions onPick={(t) => sendText(t)} /> : null}
            {messages.map((m, idx) => (
              <MemoizedMessageBubble key={m.id} message={m} addToolOutput={addToolOutput} isStreaming={status === "streaming"} isLast={idx === messages.length - 1} />
            ))}
            {status === "submitted" ? (
              <div className="flex items-center gap-2 text-sm text-stone animate-fade-in">
                <Spinner className="size-4" /> Thinking…
              </div>
            ) : null}
            {error && status === "error" ? (
              <div className="flex items-center gap-3 rounded-xl border border-clay/30 bg-clay/5 px-4 py-3 text-sm text-clay animate-fade-in">
                <AlertCircle className="size-4 shrink-0" />
                <span className="flex-1">Failed to get a response. Check your connection and try again.</span>
                {lastFailedInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-clay/30 text-clay hover:bg-clay/10"
                    onClick={() => sendText(lastFailedInput)}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Scroll-to-bottom — positioned relative to the wrapper, NOT inside scroll */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-forest/90 text-white px-4 py-2 text-xs font-medium shadow-lg backdrop-blur-sm hover:bg-forest smooth-hover animate-fade-in"
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="size-3" /> New messages
          </button>
        )}
      </div>

      {/* Quick action chips */}
      <QuickActions onPick={(prompt) => sendText(prompt)} />

      {/* Input bar */}
      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-card px-4 py-3 md:px-6 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))]"
      >
        <div className="mx-auto w-full max-w-3xl">
          {/* Image preview strip */}
          {pendingImages.length > 0 && (
            <div className="flex gap-2 mb-2 overflow-x-auto pb-1">
              {pendingImages.map((img, i) => (
                <div key={i} className="relative shrink-0 group">
                  <img
                    src={img.url}
                    alt={img.name}
                    className="size-16 rounded-xl object-cover border border-border"
                  />
                  <button
                    type="button"
                    onClick={() => removeImage(i)}
                    className="absolute -top-1.5 -right-1.5 flex size-5 items-center justify-center rounded-full bg-clay text-white text-[10px] opacity-0 group-hover:opacity-100 hover:bg-clay/80 smooth-hover shadow-sm"
                    aria-label={`Remove ${img.name}`}
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
              disabled={isStreaming || pendingImages.length >= MAX_IMAGES}
              aria-label="Attach image or take photo"
              className="text-stone hover:text-forest rounded-full size-10 shrink-0"
            >
              <Camera className="size-5" />
            </Button>
            <Textarea
              ref={textareaRef}
              value={input}
              onChange={handleTextareaChange}
              onKeyDown={(e) => {
                // Desktop: Enter sends, Shift+Enter newline
                // Mobile: Enter always inserts newline (send via button)
                if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
                  e.preventDefault()
                  if (!isStreaming) onSubmit(e)
                }
              }}
              placeholder={pendingImages.length > 0 ? "Add a message about the image…" : "Ask NutriAI anything…"}
              rows={1}
              className="min-h-[48px] max-h-[160px] flex-1 resize-none rounded-2xl border-cream3 bg-cream2 placeholder:text-fog focus:border-sage focus:ring-sage/20"
              aria-label="Type a message to NutriAI"
            />
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                onClick={() => stop()}
                aria-label="Stop generating"
                className="bg-clay hover:bg-clay/80 text-white rounded-full size-12 shrink-0"
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() && pendingImages.length === 0}
                aria-label="Send message"
                className="bg-forest hover:bg-sage text-white rounded-full size-12 shrink-0"
              >
                <Send className="size-4" />
              </Button>
            )}
          </div>
        </div>
      </form>

      {/* Rename Dialog */}
      <Dialog open={renameOpen} onOpenChange={setRenameOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Rename conversation</DialogTitle>
            <DialogDescription>Give this chat a descriptive name.</DialogDescription>
          </DialogHeader>
          <Input
            value={renameValue}
            onChange={(e) => setRenameValue(e.target.value)}
            placeholder="Chat name…"
            maxLength={120}
            onKeyDown={(e) => { if (e.key === "Enter") handleRename() }}
            autoFocus
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setRenameOpen(false)} disabled={actionPending}>Cancel</Button>
            <Button onClick={handleRename} disabled={actionPending || !renameValue.trim()} className="bg-forest hover:bg-sage text-white">
              {actionPending ? <><Spinner className="size-4 mr-1" /> Saving…</> : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this conversation?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete this chat and all its messages. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={actionPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} disabled={actionPending} className="bg-clay hover:bg-clay/90 text-white">
              {actionPending ? <><Spinner className="size-4 mr-1" /> Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ── Suggestions (empty chat state) ── */
function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    { title: "Log breakfast", body: "Two eggs, toast, and an avocado.", emoji: "🍳" },
    { title: "Plan dinner", body: "Suggest a dinner using what's in my pantry.", emoji: "🍽️" },
    { title: "Progress check", body: "How am I doing on protein today?", emoji: "💪" },
    { title: "Add groceries", body: "Add rice, milk, spinach, and eggs to my pantry.", emoji: "🛒" },
  ]

  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 bg-mint/40 rounded-full blur-xl" />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-forest text-white shadow-lg nutri-pulse-ring">
          <Leaf className="size-7" />
        </div>
      </div>
      <div>
        <h2 className="font-display text-2xl font-bold text-ink">How can I help today?</h2>
        <p className="text-sm text-stone mt-2">
          Tell me what you ate, what you bought, or ask for a meal idea.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={s.title}
            onClick={() => onPick(s.body)}
            className="group flex items-start gap-3 rounded-2xl border border-border bg-card px-4 py-3 text-left smooth-hover hover:border-sage/30 hover:shadow-sm hover:-translate-y-0.5 animate-fade-in-up"
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <span className="text-xl mt-0.5">{s.emoji}</span>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-sage">{s.title}</p>
              <p className="text-sm text-ink mt-0.5">{s.body}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Message Bubble (memoized to prevent re-renders during streaming) ── */
function MessageBubble({
  message,
  addToolOutput,
  isStreaming = false,
  isLast = false,
}: {
  message: UIMessage
  addToolOutput: AddToolOutput
  isStreaming?: boolean
  isLast?: boolean
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  if (!isUser && !isAssistant) return null

  // Show streaming cursor on the last assistant message while streaming
  const showCursor = isStreaming && isLast && isAssistant

  return (
    <div
      className={cn(
        "flex gap-3 animate-slide-up",
        isUser ? "flex-row-reverse" : "flex-row"
      )}
    >
      <div
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-full text-sm",
          isUser ? "bg-sage text-white" : "bg-mint text-forest"
        )}
      >
        {isUser ? <User className="size-4" /> : <Leaf className="size-4" />}
      </div>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {message.parts.map((part, i) => {
          // Text parts
          if (part.type === "text") {
            if (!part.text?.trim()) return null
            return (
              <div
                key={i}
                className={cn(
                  "group/msg relative max-w-[85ch] px-4 py-2.5 text-sm leading-relaxed shadow-sm break-words overflow-hidden",
                  isUser
                    ? "bubble-user bg-forest text-white"
                    : "bubble-ai bg-card text-ink border border-border"
                )}
              >
                {isUser ? <span className="whitespace-pre-wrap break-words">{part.text}</span> : <AssistantMarkdown text={part.text} />}
                {showCursor && i === message.parts.length - 1 && (
                  <span className="inline-block w-[3px] h-[1.1em] bg-forest/70 ml-0.5 align-text-bottom animate-pulse" aria-hidden="true" />
                )}
                <CopyButton text={part.text} isUser={isUser} />
              </div>
            )
          }

          // File/image parts — show as inline thumbnails in the message
          if (part.type === "file" || (part as any).type === "image") {
            const fileUrl = (part as any).url || (part as any).data
            const mimeType = (part as any).mediaType || (part as any).mimeType || "image/jpeg"
            if (fileUrl && mimeType.startsWith("image/")) {
              return (
                <img
                  key={i}
                  src={fileUrl}
                  alt="Attached image"
                  className="max-w-[240px] max-h-[200px] rounded-xl border border-border/50 object-cover shadow-sm"
                />
              )
            }
            return null
          }

          // Skip non-visible parts
          if (part.type === "reasoning" || part.type === "step-start" || (part.type as string) === "source") return null

          // Tool invocation parts — handle both AI SDK v5 ("tool-invocation") and v6 ("tool-{name}") formats
          if (part.type === "tool-invocation" || (part.type.startsWith("tool-") && part.type !== "tool-invocation")) {
            const raw = part as any

            // Live SDK v6: type is "tool-{toolName}", data at part level or in toolInvocation
            // Live SDK v5: type is "tool-invocation", data in toolInvocation wrapper
            // DB JSON: data may be flattened at the part level
            const inv = raw.toolInvocation ?? raw
            const toolName: string | undefined =
              inv.toolName ?? (part.type.startsWith("tool-") && part.type !== "tool-invocation"
                ? part.type.replace(/^tool-/, "")
                : undefined)
            const toolCallId: string | undefined = inv.toolCallId ?? raw.toolCallId

            if (!toolName || !toolCallId) return null

            const rawState: string = inv.state ?? raw.state ?? "result"
            let cardState: "input-streaming" | "input-available" | "output-available" | "output-error"
            if (rawState === "partial-call" || rawState === "input-streaming") {
              cardState = "input-streaming"
            } else if (rawState === "call" || rawState === "input-available") {
              cardState = "input-available"
            } else {
              cardState = "output-available"
            }

            const toolPart: ToolUIPart = {
              type: `tool-${toolName}`,
              toolCallId,
              state: cardState,
              input: (inv.args ?? inv.input ?? raw.args) as Record<string, unknown> | undefined,
              output: (rawState === "result" || rawState === "output-available") ? (inv.result ?? inv.output ?? raw.output) : undefined,
            }

            if ((CLIENT_TOOL_NAMES as readonly string[]).includes(toolName)) {
              return (
                <ClientToolRenderer
                  key={i}
                  toolName={toolName}
                  part={toolPart}
                  addToolOutput={addToolOutput}
                />
              )
            }

            return <ToolTrace key={i} part={toolPart} />
          }

          // Catch-all: unknown part types — don't silently drop
          return null
        })}
      </div>
    </div>
  )
}

const MemoizedMessageBubble = memo(MessageBubble, (prev, next) => {
  if (prev.message.id !== next.message.id) return false
  if (prev.isLast !== next.isLast) return false
  if (prev.isStreaming !== next.isStreaming) return false
  // During streaming, the last message changes per token — must re-render
  if (next.isLast && next.isStreaming) return false
  if (prev.message.parts.length !== next.message.parts.length) return false
  // Deep-compare parts to detect all state transitions:
  // - Text content changes (continuation text after tool calls)
  // - Tool state changes (input-available → output-available)
  // - Tool output appearing (state may remain same but result populated)
  for (let i = 0; i < prev.message.parts.length; i++) {
    const pp = prev.message.parts[i] as any
    const np = next.message.parts[i] as any
    // Text content changed (catches continuation text updates)
    if (pp.type === "text" && np.type === "text" && pp.text !== np.text) return false
    // Tool state changed
    const pState = pp?.toolInvocation?.state ?? pp?.state
    const nState = np?.toolInvocation?.state ?? np?.state
    if (pState !== nState) return false
    // Tool output appeared (state might be same but output populated)
    const pHasOutput = !!(pp?.toolInvocation?.result ?? pp?.toolInvocation?.output ?? pp?.output)
    const nHasOutput = !!(np?.toolInvocation?.result ?? np?.toolInvocation?.output ?? np?.output)
    if (pHasOutput !== nHasOutput) return false
  }
  return true
})

/* ── Tool types and renderers ── */
type ToolUIPart = {
  type: string
  toolCallId: string
  state: "input-streaming" | "input-available" | "output-available" | "output-error"
  input?: Record<string, unknown>
  output?: unknown
  errorText?: string
}

function ClientToolRenderer({
  toolName,
  part,
  addToolOutput,
}: {
  toolName: string
  part: ToolUIPart
  addToolOutput: AddToolOutput
}) {
  if (part.state === "input-streaming" || part.input == null) {
    return (
      <div className="w-full max-w-[85ch] rounded-2xl border border-dashed border-ghost bg-cream2/50 px-4 py-3 text-xs text-stone">
        <Spinner className="mr-2 inline size-3" /> Preparing…
      </div>
    )
  }

  const hasOutput = part.state === "output-available" || part.state === "output-error" || part.output != null
  const output = hasOutput ? (part.output as unknown) : null

  const submit = (value: unknown) => {

    addToolOutput({ tool: toolName, toolCallId: part.toolCallId, output: value })
  }

  switch (toolName) {
    case "ask_user":
      return <AskUserCard input={part.input as unknown as AskUserInput} output={output as AskUserOutput | null} onSubmit={submit} />
    case "choose_option":
      return <ChooseOptionCard input={part.input as unknown as ChooseOptionInput} output={output as ChooseOptionOutput | null} onSubmit={submit} />
    case "propose_meal_log":
      return <ProposeMealCard input={part.input as unknown as ProposeMealInput} output={output as ProposeMealOutput | null} onSubmit={submit} />
    case "propose_pantry_items":
      return <ProposePantryCard input={part.input as unknown as ProposePantryInput} output={output as ProposePantryOutput | null} onSubmit={submit} />
    case "propose_swiggy_order":
      return <SwiggyOrderReviewCard input={part.input as unknown as SwiggyOrderInput} output={output as SwiggyOrderOutput | null} onSubmit={submit} />
    case "propose_restaurant_pick":
      return <RestaurantPickerCard input={part.input as unknown as RestaurantPickInput} output={output as RestaurantPickOutput | null} onSubmit={submit} />
    case "propose_menu_selection":
      return <MenuSelectorCard input={part.input as unknown as MenuSelectionInput} output={output as MenuSelectionOutput | null} onSubmit={submit} />
    case "propose_pantry_restock":
      return <PantryRestockCard input={part.input as unknown as PantryRestockInput} output={output as PantryRestockOutput | null} onSubmit={submit} />
    default:
      return <ToolTrace part={part} />
  }
}

function ToolTrace({ part }: { part: ToolUIPart }) {
  const toolName = part.type.replace(/^tool-/, "")
  const title = prettyToolName(toolName)
  const state = part.state
  const isDone = state === "output-available"
  const isError = state === "output-error"
  const isRunning = state === "input-available"

  // Compact output summary for the collapsed view
  const summary = isDone && part.output
    ? summarizeOutput(part.output)
    : isError
      ? "Failed"
      : isRunning
        ? "Running…"
        : "Working…"

  return (
    <details className="group w-full max-w-[85ch] rounded-xl border border-border/60 bg-cream2/40 text-xs smooth-hover hover:border-border">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2 list-none select-none [&::-webkit-details-marker]:hidden">
        {isDone ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-mint text-forest">
            <Check className="size-3" />
          </span>
        ) : isError ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-clay/10 text-clay">
            <AlertCircle className="size-3" />
          </span>
        ) : (
          <Spinner className="size-4 text-stone" />
        )}
        <span className="font-medium text-ink">{title}</span>
        <span className="text-[11px] text-fog truncate flex-1">{summary}</span>
        <ChevronDown className="size-3.5 text-stone smooth-hover group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/40 px-3 py-2.5 space-y-2">
        {part.input ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-1">Input</p>
            <pre className="overflow-x-auto rounded-lg bg-card p-2 text-[11px] leading-snug border border-border/60 max-h-[200px]">{JSON.stringify(part.input, null, 2)}</pre>
          </div>
        ) : null}
        {part.output !== undefined ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-1">Result</p>
            <pre className="overflow-x-auto rounded-lg bg-card p-2 text-[11px] leading-snug border border-border/60 max-h-[200px]">{JSON.stringify(part.output, null, 2)}</pre>
          </div>
        ) : null}
        {part.errorText ? <p className="text-clay text-xs">{part.errorText}</p> : null}
      </div>
    </details>
  )
}

function prettyToolName(name: string): string {
  return name.split("_").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join(" ")
}

function summarizeOutput(output: unknown): string {
  if (!output || typeof output !== 'object') return ''
  const o = output as Record<string, unknown>
  if (o.ok === true) {
    if (o.meal_id) return 'Meal logged ✓'
    if (o.inserted && Array.isArray(o.inserted)) return `${o.inserted.length} item(s) added ✓`
    if (o.updated) return 'Updated ✓'
    if (o.meals && Array.isArray(o.meals)) return `${o.meals.length} meal(s)`
    if (o.items && Array.isArray(o.items)) return `${o.items.length} item(s)`
    if (o.targets) return 'Targets loaded'
    if (o.totals) return 'Totals loaded'
    return 'Done ✓'
  }
  if (o.ok === false) return o.error ? String(o.error).slice(0, 40) : 'Failed'
  return ''
}

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="prose-chat overflow-hidden">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-forest">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2 hover:no-underline break-all">{children}</a>
          ),
          code: ({ children }) => <code className="rounded bg-cream2 px-1 py-0.5 font-mono text-[0.85em] break-all">{children}</code>,
          pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-cream2 p-2 text-xs">{children}</pre>,
          table: ({ children }) => <div className="overflow-x-auto -mx-1"><table className="min-w-full text-xs">{children}</table></div>,
          th: ({ children }) => <th className="border-b border-border px-2 py-1 text-left font-semibold text-ink">{children}</th>,
          td: ({ children }) => <td className="border-b border-border/50 px-2 py-1">{children}</td>,
          h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          hr: () => <div className="my-2 h-px bg-border" />,
          blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-sage/30 pl-3 text-stone">{children}</blockquote>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}

/* ── Copy Button ── */
function CopyButton({ text, isUser }: { text: string; isUser: boolean }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      const textarea = document.createElement("textarea")
      textarea.value = text
      textarea.style.position = "fixed"
      textarea.style.opacity = "0"
      document.body.appendChild(textarea)
      textarea.select()
      document.execCommand("copy")
      document.body.removeChild(textarea)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-medium smooth-hover",
        /* Desktop: show on hover, positioned inline at end of bubble */
        "md:opacity-0 md:group-hover/msg:opacity-100 md:focus:opacity-100",
        /* Mobile: always visible */
        "mt-1",
        copied
          ? "bg-sage/10 text-sage"
          : isUser
            ? "bg-white/10 text-white/70 hover:bg-white/20 hover:text-white"
            : "bg-cream2 text-stone hover:bg-cream3 hover:text-ink",
      )}
      aria-label="Copy message"
    >
      {copied ? (
        <><Check className="size-3" /> Copied</>
      ) : (
        <><Copy className="size-3" /> Copy</>
      )}
    </button>
  )
}
