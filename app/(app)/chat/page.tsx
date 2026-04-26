import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MessageCircle, Plus } from "lucide-react"
import { formatDate } from "@/lib/format"
import { createConversation } from "./actions"
import { Empty, EmptyContent, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"

export const dynamic = "force-dynamic"

export default async function ChatIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  // Deep-link: when another page sends the user here with ?prefill=...,
  // immediately start a new conversation carrying the prompt forward. The
  // chat view will auto-send it on mount so the assistant responds right away.
  const params = await searchParams
  if (params.prefill) {
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: null })
      .select("id")
      .single()
    if (!error && data) {
      redirect(`/chat/${data.id}?prefill=${encodeURIComponent(params.prefill)}`)
    }
  }

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })

  return (
    <>
      <PageHeader
        title="Chat"
        description="Talk to NutriAI. Log meals, ask what to eat, or plan your day."
        actions={
          <form action={createConversation}>
            <Button type="submit">
              <Plus className="mr-2 size-4" /> New chat
            </Button>
          </form>
        }
      />
      <div className="flex flex-col gap-4 p-4 md:p-8">
        {convos && convos.length > 0 ? (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {convos.map((c) => (
              <li key={c.id}>
                <Link href={`/chat/${c.id}`}>
                  <Card className="transition-colors hover:border-primary/50">
                    <CardContent className="flex items-start gap-3 pt-6">
                      <div className="flex size-9 flex-none items-center justify-center rounded-md bg-primary/10 text-primary">
                        <MessageCircle className="size-4" aria-hidden />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{c.title || "Untitled chat"}</p>
                        <p className="text-xs text-muted-foreground">Updated {formatDate(c.updated_at)}</p>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <Empty>
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <MessageCircle className="size-5" aria-hidden />
              </EmptyMedia>
              <EmptyTitle>No chats yet</EmptyTitle>
              <EmptyDescription>Start a conversation to log meals or get advice.</EmptyDescription>
            </EmptyHeader>
            <EmptyContent>
              <form action={createConversation}>
                <Button type="submit">
                  <Plus className="mr-2 size-4" /> Start new chat
                </Button>
              </form>
            </EmptyContent>
          </Empty>
        )}
      </div>
    </>
  )
}
