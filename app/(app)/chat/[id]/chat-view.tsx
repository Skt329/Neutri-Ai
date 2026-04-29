"use client"

import { useState, useEffect, useRef } from "react"
import { useChat } from "@ai-sdk/react"
import { DefaultChatTransport, lastAssistantMessageIsCompleteWithToolCalls, type UIMessage } from "ai"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Spinner } from "@/components/ui/spinner"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreVertical, Send, Trash2, Pencil, Leaf, User, Wrench, Sparkles, Image, Paperclip, Check, AlertCircle, ChevronDown } from "lucide-react"
import { toast } from "sonner"
import { deleteConversation, renameConversation } from "../actions"
import { cn } from "@/lib/utils"
import { trackEvent, trackError } from "@/lib/posthog"
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
  const { messages, sendMessage, status, error, addToolOutput } = useChat({
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
      if (!hadTitleRef.current) {
        hadTitleRef.current = true
        router.refresh()
      } else {
        router.refresh()
      }
    },
    onError: (err) => {
      // Surface descriptive messages for common failures
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
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, status])

  // Track failed sends for retry
  useEffect(() => {
    if (error && status === "error") {
      // error occurred — keep lastFailedInput for retry
    }
  }, [error, status])

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

  const disabled = status === "streaming" || status === "submitted"
  const isEmpty = messages.length === 0

  function sendText(text: string) {
    if (!text.trim() || disabled) return
    setLastFailedInput(text)
    setInput("")
    trackEvent("chat_message_sent", {
      conversation_id: conversationId,
      message_length: text.length,
    })
    sendMessage({ text })
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    sendText(input)
  }

  async function onRename() {
    const next = window.prompt("Rename chat", title ?? "")
    if (next == null) return
    try {
      trackEvent("chat_renamed", { conversation_id: conversationId, new_title: next })
      await renameConversation(conversationId, next)
      router.refresh()
    } catch (e) {
      trackError(e instanceof Error ? e : new Error("Rename failed"))
      toast.error(e instanceof Error ? e.message : "Rename failed")
    }
  }

  async function onDelete() {
    if (!window.confirm("Delete this chat? This cannot be undone.")) return
    try {
      trackEvent("chat_deleted", { conversation_id: conversationId })
      await deleteConversation(conversationId)
    } catch (e) {
      trackError(e instanceof Error ? e : new Error("Delete failed"))
      toast.error(e instanceof Error ? e.message : "Delete failed")
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
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-clay focus:text-clay">
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
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-clay focus:text-clay">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Messages area */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-4 p-4 md:p-6">
          {isEmpty ? <Suggestions onPick={(t) => sendText(t)} /> : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} addToolOutput={addToolOutput} />
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
                  onClick={() => {
                    sendText(lastFailedInput)
                  }}
                >
                  Retry
                </Button>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>

      {/* Quick action chips */}
      <QuickActions onPick={(prompt) => sendText(prompt)} />

      {/* Input bar */}
      <form
        onSubmit={onSubmit}
        className="border-t border-border bg-card px-4 py-3 md:px-6"
      >
        <div className="mx-auto flex w-full max-w-3xl items-end gap-2">
          <Textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault()
                if (!disabled) onSubmit(e)
              }
            }}
            placeholder="Ask NutriAI anything…"
            rows={1}
            className="min-h-[48px] max-h-[160px] flex-1 resize-none rounded-2xl border-cream3 bg-cream2 placeholder:text-fog focus:border-sage focus:ring-sage/20"
            aria-label="Message"
          />
          <Button
            type="submit"
            size="icon"
            disabled={disabled || !input.trim()}
            aria-label="Send"
            className="bg-forest hover:bg-sage text-white rounded-full size-12 shrink-0"
          >
            {disabled ? <Spinner className="size-4" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
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

/* ── Message Bubble ── */
function MessageBubble({
  message,
  addToolOutput,
}: {
  message: UIMessage
  addToolOutput: AddToolOutput
}) {
  const isUser = message.role === "user"
  const isAssistant = message.role === "assistant"
  if (!isUser && !isAssistant) return null

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
                  "max-w-[85ch] px-4 py-2.5 text-sm leading-relaxed shadow-sm",
                  isUser
                    ? "bubble-user bg-forest text-white"
                    : "bubble-ai bg-card text-ink border border-border"
                )}
              >
                {isUser ? part.text : <AssistantMarkdown text={part.text} />}
              </div>
            )
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

  const hasOutput = part.state === "output-available" || part.state === "output-error"
  const output = hasOutput ? (part.output as unknown) : null

  const submit = (value: unknown) => {
    trackEvent("tool_executed", { tool_name: toolName, tool_call_id: part.toolCallId })
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
    <div className="prose-chat">
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
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-sage underline underline-offset-2 hover:no-underline">{children}</a>
          ),
          code: ({ children }) => <code className="rounded bg-cream2 px-1 py-0.5 font-mono text-[0.85em]">{children}</code>,
          pre: ({ children }) => <pre className="my-2 overflow-x-auto rounded-lg bg-cream2 p-2 text-xs">{children}</pre>,
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
