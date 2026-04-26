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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ArrowLeft, MoreVertical, Send, Trash2, Pencil, Leaf, User, Wrench, Sparkles } from "lucide-react"
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

type AddToolOutput = (args: { tool: string; toolCallId: string; output: unknown }) => void

export function ChatView({
  conversationId,
  initialMessages,
  title,
}: {
  conversationId: string
  initialMessages: UIMessage[]
  title: string | null
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
    // After the user fills a client-tool card, auto-continue the turn so the
    // model can act on the answer (e.g. move from propose → log_meal).
    sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
    // After a successful exchange, refresh so the server-generated title /
    // sidebar list updates without a manual reload.
    onFinish: () => {
      if (!hadTitleRef.current) {
        hadTitleRef.current = true
        router.refresh()
      } else {
        // Still refresh lightly so sidebar "updated_at" ordering is fresh.
        router.refresh()
      }
    },
  })

  const [input, setInput] = useState("")
  const scrollRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    el.scrollTop = el.scrollHeight
  }, [messages, status])

  useEffect(() => {
    if (error) toast.error(error.message || "Something went wrong")
  }, [error])

  // Deep-link support: if we were sent here with ?prefill=..., auto-send it
  // once on mount and clean up the URL so a refresh doesn't resend it.
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

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    const text = input.trim()
    if (!text || disabled) return
    setInput("")
    trackEvent("chat_message_sent", {
      conversation_id: conversationId,
      message_length: text.length,
    })
    sendMessage({ text })
  }

  async function onRename() {
    const next = window.prompt("Rename chat", title ?? "")
    if (next == null) return
    try {
      trackEvent("chat_renamed", {
        conversation_id: conversationId,
        new_title: next,
      })
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
      trackEvent("chat_deleted", {
        conversation_id: conversationId,
      })
      await deleteConversation(conversationId)
    } catch (e) {
      trackError(e instanceof Error ? e : new Error("Delete failed"))
      toast.error(e instanceof Error ? e.message : "Delete failed")
    }
  }

  return (
    <div className="flex h-dvh flex-col md:h-auto md:min-h-[calc(100dvh-0px)]">
      <header className="flex items-center gap-2 border-b border-border bg-background/80 px-4 py-3 backdrop-blur md:px-8">
        <Button asChild variant="ghost" size="icon" aria-label="Back to chats">
          <Link href="/chat">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <h1 className="min-w-0 flex-1 truncate text-lg font-semibold">{title || "New chat"}</h1>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label="Chat options">
              <MoreVertical className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={onRename}>
              <Pencil className="mr-2 size-4" /> Rename
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDelete} className="text-destructive focus:text-destructive">
              <Trash2 className="mr-2 size-4" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto">
        <div className="mx-auto flex w-full max-w-3xl flex-col gap-5 p-4 md:p-8">
          {isEmpty ? <Suggestions onPick={(t) => sendMessage({ text: t })} /> : null}
          {messages.map((m) => (
            <MessageBubble key={m.id} message={m} addToolOutput={addToolOutput} />
          ))}
          {status === "submitted" ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Spinner className="size-4" /> Thinking…
            </div>
          ) : null}
        </div>
      </div>

      <form
        onSubmit={onSubmit}
        className="sticky bottom-0 border-t border-border bg-background/90 px-4 py-3 backdrop-blur md:px-8"
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
            placeholder="Tell NutriAI what you ate or bought…"
            rows={1}
            className="min-h-[48px] max-h-[160px] flex-1 resize-none"
            aria-label="Message"
          />
          <Button type="submit" size="icon" disabled={disabled || !input.trim()} aria-label="Send">
            {disabled ? <Spinner className="size-4" /> : <Send className="size-4" />}
          </Button>
        </div>
      </form>
    </div>
  )
}

function Suggestions({ onPick }: { onPick: (text: string) => void }) {
  const suggestions = [
    { title: "Log breakfast", body: "Two eggs, toast, and an avocado." },
    { title: "Plan dinner", body: "Suggest a dinner using what's in my pantry." },
    { title: "Progress check", body: "How am I doing on protein today?" },
    { title: "Add groceries", body: "Add rice, milk, spinach, and eggs to my pantry." },
  ]
  
  const handlePickSuggestion = (text: string) => {
    trackEvent("suggestion_clicked", {
      suggestion_text: text,
    })
    onPick(text)
  }
  
  return (
    <div className="flex flex-col items-center gap-6 py-10 text-center">
      <div className="relative">
        <div className="absolute inset-0 animate-pulse rounded-full bg-primary/20 blur-xl" aria-hidden />
        <div className="relative flex size-16 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg">
          <Leaf className="size-7" aria-hidden />
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <h2 className="text-2xl font-semibold text-balance">How can I help today?</h2>
        <p className="text-sm text-muted-foreground">
          Tell me what you ate, what you bought, or ask for a meal idea — I&apos;ll handle the numbers.
        </p>
      </div>
      <div className="grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
        {suggestions.map((s, i) => (
          <button
            key={s.title}
            onClick={() => handlePickSuggestion(s.body)}
            className="group flex flex-col items-start gap-1 rounded-xl border border-border bg-card px-4 py-3 text-left transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow-sm"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-primary">
              <Sparkles className="size-3" /> {s.title}
            </div>
            <p className="text-sm text-foreground">{s.body}</p>
          </button>
        ))}
      </div>
    </div>
  )
}

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
        "flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-300",
        isUser ? "flex-row-reverse" : "flex-row",
      )}
    >
      <Avatar className="size-8 flex-none">
        <AvatarFallback
          className={cn(isUser ? "bg-secondary text-secondary-foreground" : "bg-primary text-primary-foreground")}
        >
          {isUser ? <User className="size-4" aria-hidden /> : <Leaf className="size-4" aria-hidden />}
        </AvatarFallback>
      </Avatar>
      <div className={cn("flex min-w-0 flex-1 flex-col gap-2", isUser ? "items-end" : "items-start")}>
        {message.parts.map((p, i) => {
          if (p.type === "text") {
            return (
              <div
                key={i}
                className={cn(
                  "max-w-[85ch] rounded-2xl px-4 py-2.5 text-sm leading-relaxed",
                  isUser
                    ? "bg-primary text-primary-foreground whitespace-pre-wrap"
                    : "bg-card text-card-foreground border border-border",
                )}
              >
                {isUser ? p.text : <AssistantMarkdown text={p.text} />}
              </div>
            )
          }
          if (p.type === "reasoning") {
            return null
          }
          if (p.type.startsWith("tool-")) {
            const toolName = p.type.replace(/^tool-/, "")
            const part = p as ToolUIPart
            if ((CLIENT_TOOL_NAMES as readonly string[]).includes(toolName)) {
              return (
                <ClientToolRenderer
                  key={i}
                  toolName={toolName}
                  part={part}
                  addToolOutput={addToolOutput}
                />
              )
            }
            return <ToolTrace key={i} part={part} />
          }
          return null
        })}
      </div>
    </div>
  )
}

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
  // Wait until the model has finished streaming the input.
  if (part.state === "input-streaming" || part.input == null) {
    return (
      <div className="w-full max-w-[85ch] rounded-xl border border-dashed border-border bg-muted/30 px-4 py-3 text-xs text-muted-foreground">
        <Spinner className="mr-2 inline size-3" /> Preparing…
      </div>
    )
  }

  const hasOutput = part.state === "output-available" || part.state === "output-error"
  const output = hasOutput ? (part.output as unknown) : null

  const submit = (value: unknown) => {
    trackEvent("tool_executed", {
      tool_name: toolName,
      tool_call_id: part.toolCallId,
    })
    addToolOutput({ tool: toolName, toolCallId: part.toolCallId, output: value })
  }

  switch (toolName) {
    case "ask_user":
      return (
        <AskUserCard
          input={part.input as unknown as AskUserInput}
          output={output as AskUserOutput | null}
          onSubmit={submit}
        />
      )
    case "choose_option":
      return (
        <ChooseOptionCard
          input={part.input as unknown as ChooseOptionInput}
          output={output as ChooseOptionOutput | null}
          onSubmit={submit}
        />
      )
    case "propose_meal_log":
      return (
        <ProposeMealCard
          input={part.input as unknown as ProposeMealInput}
          output={output as ProposeMealOutput | null}
          onSubmit={submit}
        />
      )
    case "propose_pantry_items":
      return (
        <ProposePantryCard
          input={part.input as unknown as ProposePantryInput}
          output={output as ProposePantryOutput | null}
          onSubmit={submit}
        />
      )
    default:
      return <ToolTrace part={part} />
  }
}

function ToolTrace({ part }: { part: ToolUIPart }) {
  const toolName = part.type.replace(/^tool-/, "")
  const title = prettyToolName(toolName)
  const state = part.state

  return (
    <details className="w-full max-w-[85ch] rounded-lg border border-border bg-muted/30 px-3 py-2 text-xs">
      <summary className="flex cursor-pointer items-center gap-2 list-none">
        <Wrench className="size-3.5 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <span
          className={cn(
            "ml-auto rounded-full px-2 py-0.5 text-[10px] font-medium",
            state === "output-available"
              ? "bg-primary/10 text-primary"
              : state === "output-error"
                ? "bg-destructive/10 text-destructive"
                : "bg-secondary text-secondary-foreground",
          )}
        >
          {state === "output-available"
            ? "done"
            : state === "output-error"
              ? "error"
              : state === "input-available"
                ? "running"
                : "…"}
        </span>
      </summary>
      <div className="mt-2 space-y-2">
        {part.input ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Input</p>
            <pre className="overflow-x-auto rounded bg-background p-2 text-[11px] leading-snug">
              {JSON.stringify(part.input, null, 2)}
            </pre>
          </div>
        ) : null}
        {part.output !== undefined ? (
          <div>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Result</p>
            <pre className="overflow-x-auto rounded bg-background p-2 text-[11px] leading-snug">
              {JSON.stringify(part.output, null, 2)}
            </pre>
          </div>
        ) : null}
        {part.errorText ? <p className="text-destructive">{part.errorText}</p> : null}
      </div>
    </details>
  )
}

function prettyToolName(name: string): string {
  return name
    .split("_")
    .map((s) => s.charAt(0).toUpperCase() + s.slice(1))
    .join(" ")
}

/**
 * Render assistant text as Markdown with a compact prose style that matches
 * the chat bubble. We only allow a tiny subset of elements so Gemini's
 * occasional horizontal rules or nested headings can't break the layout.
 */
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
          strong: ({ children }) => <strong className="font-semibold text-foreground">{children}</strong>,
          em: ({ children }) => <em className="italic">{children}</em>,
          a: ({ children, href }) => (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline underline-offset-2 hover:no-underline"
            >
              {children}
            </a>
          ),
          code: ({ children }) => (
            <code className="rounded bg-muted px-1 py-0.5 font-mono text-[0.85em]">{children}</code>
          ),
          pre: ({ children }) => (
            <pre className="my-2 overflow-x-auto rounded-lg bg-muted p-2 text-xs">{children}</pre>
          ),
          h1: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h2: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          h3: ({ children }) => <p className="mb-1 font-semibold">{children}</p>,
          hr: () => <div className="my-2 h-px bg-border" />,
          blockquote: ({ children }) => (
            <blockquote className="my-2 border-l-2 border-border pl-3 text-muted-foreground">{children}</blockquote>
          ),
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  )
}
