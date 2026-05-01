import { createClient } from "@/lib/supabase/server"
import { notFound } from "next/navigation"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import type { Metadata } from "next"
import { Leaf } from "lucide-react"

export const dynamic = "force-dynamic"

interface Params {
  params: Promise<{ token: string }>
}

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { token } = await params
  const supabase = await createClient()

  const { data: share } = await supabase
    .from("shared_chats")
    .select("conversation_id, conversations(title)")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle()

  const title = (share?.conversations as unknown as { title: string } | null)?.title ?? "Shared Chat"

  return {
    title: `${title} — NutriAI Shared Chat`,
    description: "A shared conversation from NutriAI.",
    robots: { index: false, follow: false },
  }
}

export default async function SharedChatPage({ params }: Params) {
  const { token } = await params
  const supabase = await createClient()

  // Look up the share record
  const { data: share } = await supabase
    .from("shared_chats")
    .select("conversation_id, user_id, conversations(title)")
    .eq("token", token)
    .eq("is_active", true)
    .maybeSingle()

  if (!share) notFound()

  const title = (share.conversations as unknown as { title: string } | null)?.title ?? "NutriAI Chat"

  // Fetch messages (read-only, no auth required — the token is the access key)
  const { data: messages } = await supabase
    .from("messages")
    .select("role, parts")
    .eq("conversation_id", share.conversation_id)
    .order("ordinal", { ascending: true })

  if (!messages || messages.length === 0) notFound()

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="mx-auto max-w-3xl flex items-center gap-3 px-4 py-4">
          <div className="flex size-9 items-center justify-center rounded-full bg-forest text-white">
            <Leaf className="size-4" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink leading-tight">{title}</h1>
            <p className="text-[11px] text-stone">Shared via NutriAI</p>
          </div>
        </div>
      </header>

      {/* Messages */}
      <main className="mx-auto max-w-3xl px-4 py-6 space-y-4">
        {messages.map((msg, idx) => {
          const isUser = msg.role === "user"
          const textParts = (msg.parts as { type: string; text?: string }[])
            ?.filter((p) => p.type === "text" && p.text?.trim())
            .map((p) => p.text!)
            .join("\n")

          if (!textParts) return null

          return (
            <div
              key={idx}
              className={`flex ${isUser ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85ch] px-4 py-2.5 text-sm leading-relaxed shadow-sm ${
                  isUser
                    ? "bubble-user bg-forest text-white"
                    : "bubble-ai bg-card text-ink border border-border"
                }`}
              >
                {isUser ? (
                  textParts
                ) : (
                  <div className="prose-chat">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                      {textParts}
                    </ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          )
        })}
      </main>

      {/* Footer */}
      <footer className="border-t border-border py-6 text-center">
        <p className="text-xs text-fog">
          This is a read-only shared chat from{" "}
          <span className="font-semibold text-stone">NutriAI</span>.
          The original user controls access.
        </p>
      </footer>
    </div>
  )
}
