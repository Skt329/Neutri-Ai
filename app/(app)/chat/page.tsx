import { getAuthUser } from "@/lib/supabase/auth"
import { Leaf, Sparkles, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { MobileConvoList } from "@/components/chat/mobile-convo-list"
import Link from "next/link"

export const metadata = {
  title: "Chat — NutriAI",
  description: "Start a conversation with your AI dietitian — log meals, get recipes, and track nutrition.",
}

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

  // Fetch conversations server-side — use same limit as sidebar for parity
  const { data: convos } = await supabase
    .from("conversations")
    .select("id, title, updated_at")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(50)

  return (
    <>
      {/* Desktop: centered hero (sidebar handles listing) */}
      <div className="hidden md:flex flex-1 flex-col items-center justify-center gap-8 p-8 text-center">
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
        <Link
          href="/chat/new"
          className="animate-fade-in-up inline-flex items-center gap-2 bg-forest hover:bg-sage text-white rounded-full px-6 h-12 text-base font-semibold shadow-md hover:shadow-lg smooth-hover"
          style={{ animationDelay: '200ms' }}
        >
          <Sparkles className="size-5" /> Start a new chat
        </Link>
      </div>

      {/* Mobile: full-height chat list view */}
      <div className="flex flex-col flex-1 min-h-0 md:hidden">
        {/* Mobile header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
          <h1 className="font-display text-lg font-bold text-ink">Chats</h1>
          <Button asChild size="icon" className="bg-forest hover:bg-sage text-white rounded-full size-10">
            <Link href="/chat/new" aria-label="New chat">
              <Plus className="size-5" />
            </Link>
          </Button>
        </div>
        <MobileConvoList conversations={convos ?? []} />
      </div>
    </>
  )
}
