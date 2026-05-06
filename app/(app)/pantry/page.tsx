import Link from "next/link"
import { getAuthUser } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { PantryList } from "./pantry-list"
import { PantrySummary } from "./pantry-summary"
import { getCachedPantryItems } from "@/lib/supabase/queries"
import { MessageCircle, Sparkles, ScanBarcode } from "lucide-react"

export const metadata = {
  title: "Pantry — NutriAI",
  description: "Manage your kitchen inventory — NutriAI uses your pantry to suggest meals you can cook.",
}

export default async function PantryPage() {
  const { user } = await getAuthUser()
  if (!user) return null

  const pantry = await getCachedPantryItems(user.id)

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
        <div className="flex items-center gap-2">
          <Button asChild variant="outline" className="gap-2 rounded-full px-4 w-fit border-sage/30 text-sage hover:bg-mint/10">
            <Link href="/barcode">
              <ScanBarcode className="size-4" /> Scan to Add
            </Link>
          </Button>
          <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 w-fit">
            <Link href="/chat">
              <MessageCircle className="size-4" /> Add via chat
            </Link>
          </Button>
        </div>
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
