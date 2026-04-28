import Link from "next/link"
import { getAuthUser } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { PantryList } from "./pantry-list"
import { PantrySummary } from "./pantry-summary"
import { MessageCircle, Plus, Search, Sparkles } from "lucide-react"
import type { PantryItem } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function PantryPage() {
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  const { data: items } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id)
    .order("name")
    .returns<PantryItem[]>()

  const pantry = items ?? []

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Pantry</h1>
          <p className="text-stone text-sm mt-1">
            Everything in your kitchen — NutriAI uses this to plan your meals.
          </p>
        </div>
        <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 w-fit">
          <Link href="/chat">
            <MessageCircle className="size-4" /> Add via chat
          </Link>
        </Button>
      </div>

      {/* Stats */}
      {pantry.length > 0 && <PantrySummary items={pantry} />}

      {/* CTA card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint2 text-sage">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink">Manage your pantry in chat</p>
            <p className="text-sm text-stone mt-0.5">
              Say &ldquo;add 1 kg rice, 1 L milk and 2 dozen eggs&rdquo; — nutrition, categories, and expiry are filled automatically.
            </p>
          </div>
          <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 w-fit shrink-0">
            <Link href="/chat">
              <MessageCircle className="size-4" /> Start a pantry chat
            </Link>
          </Button>
        </div>
      </div>

      {/* Items grid */}
      <PantryList items={pantry} />
    </div>
  )
}
