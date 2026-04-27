import Link from "next/link"
import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Button } from "@/components/ui/button"
import { Plus, MessageCircle } from "lucide-react"
import { createConversation } from "./actions"

export const dynamic = "force-dynamic"

// Conversation starter suggestions
const starterCards = [
  {
    title: "Quick Pantry Snack Ideas",
    description: "Find easy snacks from ingredients you have",
    icon: "🥜",
  },
  {
    title: "Dinner Menu from Pantry",
    description: "Plan dinner with available ingredients",
    icon: "🍽️",
  },
  {
    title: "Log Your Food Intake",
    description: "Record meals and track macros",
    icon: "📝",
  },
  {
    title: "High-Protein Pantry Dinner Idea",
    description: "Get protein-rich meal suggestions",
    icon: "💪",
  },
  {
    title: "Protein Ingredients & Recipes",
    description: "Explore high-protein options",
    icon: "🥚",
  },
]

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
  // immediately start a new conversation carrying the prompt forward.
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
    <div className="flex flex-col h-full bg-background">
      {/* Header */}
      <div className="px-6 py-5 border-b border-border bg-card flex items-center justify-between">
        <div>
          <h1 className="font-serif text-2xl font-bold">Chat</h1>
          <p className="text-sm text-muted-foreground">Talk to NutriAI. Log meals, ask what to eat, or plan your day.</p>
        </div>
        <form action={createConversation}>
          <Button type="submit" className="bg-sage hover:bg-sage2 text-white gap-2 h-10">
            <Plus className="w-4 h-4" />
            New chat
          </Button>
        </form>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-6">
        {convos && convos.length > 0 ? (
          // Show existing conversations
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {convos.map((c) => (
              <Link key={c.id} href={`/chat/${c.id}`}>
                <div className="bg-card border border-border rounded-xl p-4 hover:border-primary/50 hover:shadow-md transition-all cursor-pointer">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-sage/20 flex items-center justify-center flex-shrink-0 text-sage">
                      <MessageCircle className="w-4 h-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium truncate text-foreground">{c.title || "Untitled chat"}</p>
                      <p className="text-xs text-muted-foreground">
                        Updated {new Date(c.updated_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          // Empty state with starter cards
          <div className="space-y-8">
            <div className="text-center space-y-2 mb-8">
              <h2 className="font-serif text-3xl font-bold">Welcome to NutriAI</h2>
              <p className="text-muted-foreground">No conversations yet. Start a new chat!</p>
            </div>

            {/* Starter Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-4xl mx-auto">
              {starterCards.map((card, idx) => (
                <form key={idx} action={createConversation}>
                  <button
                    type="submit"
                    className="w-full bg-card border border-border rounded-xl p-5 hover:border-sage/50 hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <span className="text-2xl group-hover:scale-110 transition-transform">{card.icon}</span>
                      <div>
                        <h3 className="font-semibold text-foreground group-hover:text-sage transition-colors">{card.title}</h3>
                        <p className="text-sm text-muted-foreground">{card.description}</p>
                      </div>
                    </div>
                  </button>
                </form>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

