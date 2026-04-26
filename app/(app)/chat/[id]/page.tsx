import { notFound } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatView } from "./chat-view"
import type { UIMessage } from "ai"

export const dynamic = "force-dynamic"

export default async function ConversationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: convo } = await supabase
    .from("conversations")
    .select("id, title")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle()
  if (!convo) notFound()

  const { data: rows } = await supabase
    .from("messages")
    .select("id, role, parts, created_at")
    .eq("conversation_id", id)
    .order("created_at", { ascending: true })

  const initial: UIMessage[] = (rows ?? []).map((r) => ({
    id: r.id,
    role: r.role as UIMessage["role"],
    parts: (r.parts as UIMessage["parts"]) ?? [],
  }))

  return <ChatView conversationId={id} initialMessages={initial} title={convo.title} />
}
