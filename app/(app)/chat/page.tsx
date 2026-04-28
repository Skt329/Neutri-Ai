import { getAuthUser } from "@/lib/supabase/auth"
import { Leaf, Sparkles, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { createConversation } from "./actions"

export const dynamic = "force-dynamic"

export default async function ChatIndexPage({
  searchParams,
}: {
  searchParams: Promise<{ prefill?: string }>
}) {
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  const params = await searchParams
  if (params.prefill) {
    const { redirect } = await import("next/navigation")
    const { data, error } = await supabase
      .from("conversations")
      .insert({ user_id: user.id, title: null })
      .select("id")
      .single()
    if (!error && data) {
      redirect(`/chat/${data.id}?prefill=${encodeURIComponent(params.prefill)}`)
    }
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
      <div className="relative animate-fade-in-up">
        <div className="absolute inset-0 bg-mint/40 rounded-full blur-2xl" />
        <div className="relative flex size-20 items-center justify-center rounded-full bg-forest text-white shadow-lg nutri-pulse-ring">
          <Leaf className="size-8" />
        </div>
      </div>
      <div className="animate-fade-in-up" style={{ animationDelay: '100ms' }}>
        <h2 className="font-display text-3xl font-bold text-ink">
          What would you like today?
        </h2>
        <p className="text-stone text-sm mt-3 max-w-md mx-auto leading-relaxed">
          Start a conversation to log meals, get recipe ideas, check your nutrition,
          or order food — all powered by AI.
        </p>
      </div>
      <form action={createConversation} className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <Button
          type="submit"
          className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-6 h-12 text-base font-semibold shadow-md hover:shadow-lg smooth-hover"
        >
          <Sparkles className="size-5" /> Start a new chat
        </Button>
      </form>

      {/* Mobile conversation list */}
      <MobileConvoList />
    </div>
  )
}

async function MobileConvoList() {
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  const { data: convos } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(10)

  if (!convos || convos.length === 0) return null

  const { default: Link } = await import("next/link")
  const { MessageCircle } = await import("lucide-react")
  const { formatDate } = await import("@/lib/format")

  return (
    <div className="w-full max-w-lg md:hidden animate-fade-in-up" style={{ animationDelay: '300ms' }}>
      <p className="text-xs font-semibold uppercase tracking-wider text-fog mb-3 text-left">Recent chats</p>
      <ul className="flex flex-col gap-2">
        {convos.map((c) => (
          <li key={c.id}>
            <Link
              href={`/chat/${c.id}`}
              className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border hover:border-sage/30 hover:shadow-sm smooth-hover"
            >
              <div className="flex size-9 items-center justify-center rounded-lg bg-mint2 text-sage shrink-0">
                <MessageCircle className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{c.title || 'Untitled'}</p>
                <p className="text-[11px] text-fog">{formatDate(c.updated_at)}</p>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  )
}
