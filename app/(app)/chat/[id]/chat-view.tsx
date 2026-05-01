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
import {
  ArrowLeft,
  MoreVertical,
  Send,
  Square,
  Trash2,
  Pencil,
  Leaf,
  User,
  Wrench,
  Sparkles,
  Check,
  AlertCircle,
  ChevronDown,
  ArrowDown,
} from "lucide-react"
import { toast } from "sonner"
import { deleteConversation, renameConversation } from "../actions"
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
  const scrollRef = useRef<HTMLDivElement | null>(null)
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)
  const isAutoScrollingRef = useRef(false)
  const scrollRafRef = useRef<number | null>(null)

  useEffect(() => {
    const mq = window.matchMedia("(pointer: coarse)")
    setIsTouchDevice(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsTouchDevice(e.matches)
    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [])

  useEffect(() => {
    if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current)
    scrollRafRef.current = requestAnimationFrame(() => {
      const el = scrollRef.current
      if (!el) return
      const isNearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 150
      if (isNearBottom) {
        isAutoScrollingRef.current = true
        el.scrollTop = el.scrollHeight
        requestAnimationFrame(() => { isAutoScrollingRef.current = false })
      } else {
        setShowScrollDown(true)
      }
    })
    return () => { if (scrollRafRef.current) cancelAnimationFrame(scrollRafRef.current) }
  }, [messages, status])

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
    sendMessage({ text: prefill })
    const url = new URL(window.location.href)
    url.searchParams.delete("prefill")
    window.history.replaceState(null, "", url.toString())
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

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
    if (!text.trim() || status === "streaming" || status === "submitted") return
    setLastFailedInput(text)
    setInput("")
    if (textareaRef.current) textareaRef.current.style.height = "auto"
    sendMessage({ text })
  }, [status, sendMessage])

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
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Delete failed")
      setActionPending(false)
    }
  }

  return (
    <div className="flex flex-1 flex-col min-h-0 bg-background">
      {/* ── Mobile header ── */}
      <header className="flex md:hidden items-center gap-2 border-b border-border bg-card/80 backdrop-blur-sm px-4 py-3">
        <Button asChild variant="ghost" size="icon" aria-label="Back to chats" className="text-stone hover:text-forest size-8">
          <Link href="/chat">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-sm font-semibold text-ink">
          {title || "New chat"}
        </h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat options" className="text-stone hover:text-forest size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameValue(title ?? ""); setRenameOpen(true) }}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      {/* ── Desktop header ── */}
      <div className="hidden md:flex items-center border-b border-border/60 bg-card/50 backdrop-blur-sm">
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
            <Button variant="ghost" size="icon" aria-label="Chat options" className="text-stone hover:text-forest mr-3 size-8">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => { setRenameValue(title ?? ""); setRenameOpen(true) }}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setDeleteOpen(true)} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* ── Messages area ── */}
      <div className="relative flex-1 min-h-0">
        <div ref={scrollRef} className="h-full overflow-y-auto" style={{ contentVisibility: 'auto' }}>
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-4 py-6 md:px-6">
            {isEmpty ? <Suggestions onPick={(t) => sendText(t)} /> : null}
            {messages.map((m, idx) => (
              <MemoizedMessageBubble
                key={m.id}
                message={m}
                addToolOutput={addToolOutput}
                isStreaming={status === "streaming"}
                isLast={idx === messages.length - 1}
              />
            ))}
            {status === "submitted" ? (
              <div className="flex items-center gap-2.5 text-sm text-stone animate-fade-in pl-1">
                <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-mint">
                  <Leaf className="size-3.5 text-forest" />
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="size-1.5 rounded-full bg-stone/50 animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="size-1.5 rounded-full bg-stone/50 animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="size-1.5 rounded-full bg-stone/50 animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            ) : null}
            {error && status === "error" ? (
              <div className="flex items-center gap-3 rounded-2xl border border-clay/20 bg-clay/5 px-4 py-3 text-sm text-clay animate-fade-in">
                <AlertCircle className="size-4 shrink-0" />
                <span className="flex-1 text-clay/80">Failed to get a response. Check your connection and try again.</span>
                {lastFailedInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="shrink-0 border-clay/25 text-clay hover:bg-clay/8 text-xs"
                    onClick={() => sendText(lastFailedInput)}
                  >
                    Retry
                  </Button>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>

        {/* Scroll-to-bottom */}
        {showScrollDown && (
          <button
            onClick={scrollToBottom}
            className="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-1.5 rounded-full bg-forest text-white px-4 py-2 text-xs font-medium shadow-lg hover:bg-sage smooth-hover animate-fade-in"
            aria-label="Scroll to latest messages"
          >
            <ArrowDown className="size-3" /> Latest
          </button>
        )}
      </div>

      {/* ── Quick actions + input area ── */}
      <div className="border-t border-border/60 bg-card/50 backdrop-blur-sm">
        <QuickActions onPick={(prompt) => sendText(prompt)} />

        <form
          onSubmit={onSubmit}
          className="px-4 pb-4 pt-1 md:px-6 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
        >
          <div className="mx-auto flex w-full max-w-2xl items-end gap-2">
            {/* Input wrapper with shadow */}
            <div className="relative flex-1 rounded-2xl border border-border bg-card shadow-sm focus-within:border-sage/50 focus-within:shadow-md smooth-hover">
              <Textarea
                ref={textareaRef}
                value={input}
                onChange={handleTextareaChange}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && !isTouchDevice) {
                    e.preventDefault()
                    if (!isStreaming) onSubmit(e)
                  }
                }}
                placeholder="Ask NutriAI anything…"
                rows={1}
                className="min-h-[44px] max-h-[160px] w-full resize-none border-0 bg-transparent px-4 py-3 text-sm placeholder:text-fog focus-visible:ring-0 focus-visible:outline-none"
                aria-label="Type a message to NutriAI"
              />
            </div>
            {isStreaming ? (
              <Button
                type="button"
                size="icon"
                onClick={() => stop()}
                aria-label="Stop generating"
                className="bg-clay hover:bg-clay/80 text-white rounded-xl size-11 shrink-0"
              >
                <Square className="size-3.5" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim()}
                aria-label="Send message"
                className="bg-forest hover:bg-sage disabled:opacity-30 text-white rounded-xl size-11 shrink-0"
              >
                <Send className="size-3.5" />
              </Button>
            )}
          </div>
          <p className="mx-auto mt-2 max-w-2xl text-center text-[10px] text-fog/70">
            NutriAI can make mistakes. Verify important nutrition info.
          </p>
        </form>
      </div>

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
            <AlertDialogAction onClick={handleDelete} disabled={actionPending} className="bg-destructive hover:bg-destructive/90 text-destructive-foreground">
              {actionPending ? <><Spinner className="size-4 mr-1" /> Deleting…</> : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

/* ── Suggestions (empty state) ── */
function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    { title: "Log breakfast", body: "Two eggs, toast, and an avocado.", icon: "🍳" },
    { title: "Plan dinner", body: "Suggest a dinner using what's in my pantry.", icon: "🍽️" },
    { title: "Progress check", body: "How am I doing on protein today?", icon: "💪" },
    { title: "Add groceries", body: "Add rice, milk, spinach, and eggs to my pantry.", icon: "🛒" },
  ]

  return (
    <div className="flex flex-col items-center gap-8 py-12 text-center">
      {/* Logo mark */}
      <div className="flex flex-col items-center gap-3">
        <div className="relative">
          <div className="absolute inset-0 bg-mint/50 rounded-full blur-2xl scale-150" />
          <div className="relative flex size-14 items-center justify-center rounded-2xl bg-forest text-white shadow-lg nutri-pulse-ring">
            <Leaf className="size-6" />
          </div>
        </div>
        <div>
          <h2 className="font-display text-2xl font-bold text-ink tracking-tight">How can I help?</h2>
          <p className="text-sm text-stone/70 mt-1.5 max-w-xs leading-relaxed">
            Log meals, manage your pantry, or get personalized nutrition advice.
          </p>
        </div>
      </div>

      {/* Suggestion cards */}
      <div className="grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={s.title}
            onClick={() => onPick(s.body)}
            className="group flex items-start gap-3 rounded-2xl border border-border bg-card/80 px-4 py-3.5 text-left smooth-hover hover:border-sage/25 hover:shadow-sm hover:-translate-y-0.5 animate-fade-in-up"
            style={{ animationDelay: `${i * 70}ms` }}
          >
            <span className="text-lg mt-0.5 leading-none">{s.icon}</span>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-widest text-sage/70">{s.title}</p>
              <p className="text-sm text-ink/75 mt-0.5 leading-snug">{s.body}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

/* ── Message Bubble ── */
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

  const showCursor = isStreaming && isLast && isAssistant

  return (
    <div className={cn("flex gap-3 animate-slide-up", isUser ? "flex-row-reverse" : "flex-row")}>
      {/* Avatar */}
      <div
        className={cn(
          "flex size-7 shrink-0 items-center justify-center rounded-full text-xs font-bold mt-0.5",
          isUser
            ? "bg-forest text-white"
            : "bg-mint text-forest"
        )}
      >
        {isUser ? <User className="size-3.5" /> : <Leaf className="size-3.5" />}
      </div>

      {/* Message content */}
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {message.parts.map((part, i) => {
          if (part.type === "text") {
            if (!part.text?.trim()) return null
            return (
              <div
                key={i}
                className={cn(
                  "max-w-[80ch] px-4 py-3 text-sm leading-relaxed",
                  isUser
                    ? "bubble-user bg-forest text-white"
                    : "bubble-ai bg-card text-ink border border-border/70 shadow-sm"
                )}
              >
                {isUser ? (
                  <span className="text-white/95">{part.text}</span>
                ) : (
                  <AssistantMarkdown text={part.text} />
                )}
                {showCursor && i === message.parts.length - 1 && (
                  <span
                    className="inline-block w-[2px] h-[1em] bg-forest/50 ml-0.5 align-text-bottom animate-pulse"
                    aria-hidden="true"
                  />
                )}
              </div>
            )
          }

          if (part.type === "reasoning" || part.type === "step-start" || (part.type as string) === "source") return null

          if (part.type === "tool-invocation" || (part.type.startsWith("tool-") && part.type !== "tool-invocation")) {
            const raw = part as any
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
  if (next.isLast && next.isStreaming) return false
  if (prev.message.parts.length !== next.message.parts.length) return false
  for (let i = 0; i < prev.message.parts.length; i++) {
    const pp = prev.message.parts[i] as any
    const np = next.message.parts[i] as any
    const pState = pp?.toolInvocation?.state ?? pp?.state
    const nState = np?.toolInvocation?.state ?? np?.state
    if (pState !== nState) return false
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
      <div className="w-full max-w-[80ch] rounded-2xl border border-border/50 bg-cream2/40 px-4 py-3 text-xs text-stone flex items-center gap-2">
        <Spinner className="size-3" /> Preparing…
      </div>
    )
  }

  const hasOutput = part.state === "output-available" || part.state === "output-error"
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

  const summary = isDone && part.output
    ? summarizeOutput(part.output)
    : isError
      ? "Failed"
      : isRunning
        ? "Running…"
        : "Working…"

  return (
    <details className="group w-full max-w-[80ch] rounded-xl border border-border/50 bg-cream2/30 text-xs smooth-hover hover:border-border/80 hover:bg-cream2/50">
      <summary className="flex cursor-pointer items-center gap-2 px-3 py-2.5 list-none select-none [&::-webkit-details-marker]:hidden">
        {isDone ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-mint text-forest">
            <Check className="size-3" />
          </span>
        ) : isError ? (
          <span className="flex size-5 items-center justify-center rounded-full bg-clay/10 text-clay">
            <AlertCircle className="size-3" />
          </span>
        ) : (
          <Spinner className="size-4 text-stone/60" />
        )}
        <span className="font-medium text-ink/80">{title}</span>
        <span className="text-[10px] text-fog truncate flex-1">{summary}</span>
        <ChevronDown className="size-3 text-stone/50 smooth-hover group-open:rotate-180" />
      </summary>
      <div className="border-t border-border/40 px-3 py-2.5 space-y-2">
        {part.input ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-1">Input</p>
            <pre className="overflow-x-auto rounded-lg bg-card p-2 text-[11px] leading-snug border border-border/50 max-h-[200px]">{JSON.stringify(part.input, null, 2)}</pre>
          </div>
        ) : null}
        {part.output !== undefined ? (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-1">Result</p>
            <pre className="overflow-x-auto rounded-lg bg-card p-2 text-[11px] leading-snug border border-border/50 max-h-[200px]">{JSON.stringify(part.output, null, 2)}</pre>
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
    if (o.meal_id) return 'Meal logged'
    if (o.inserted && Array.isArray(o.inserted)) return `${o.inserted.length} item(s) added`
    if (o.updated) return 'Updated'
    if (o.meals && Array.isArray(o.meals)) return `${o.meals.length} meal(s)`
    if (o.items && Array.isArray(o.items)) return `${o.items.length} item(s)`
    if (o.targets) return 'Targets loaded'
    if (o.totals) return 'Totals loaded'
    return 'Done'
  }
  if (o.ok === false) return o.error ? String(o.error).slice(0, 40) : 'Failed'
  return ''
}

function AssistantMarkdown({ text }: { text: string }) {
  return (
    <div className="prose-chat">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
          ul: ({ children }) => <ul className="my-2 list-disc space-y-1 pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-2 list-decimal space-y-1 pl-5">{children}</ol>,
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => <strong className="font-semibold text-forest">{children}</strong>,
          em: ({ children }) => <em className="italic text-stone">{children}</em>,
          a: ({ children, href }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2 hover:no-underline">{children}</a>
          ),
          code: ({ children }) => <code className="rounded-md bg-cream2 px-1.5 py-0.5 font-mono text-[0.82em] text-ink/80">{children}</code>,
          pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-xl bg-cream2 p-3 text-xs border border-border/50">{children}</pre>,
          h1: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
          h2: ({ children }) => <p className="mb-1 font-semibold text-ink">{children}</p>,
          h3: ({ children }) => <p className="mb-0.5 font-medium text-ink">{children}</p>,
          hr: () => <div className="my-3 h-px bg-border/60" />,
          blockquote: ({ children }) => <blockquote className="my-2 border-l-2 border-sage/30 pl-3 italic text-stone/80">{children}</blockquote>,
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
