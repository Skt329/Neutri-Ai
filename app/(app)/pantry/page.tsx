import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { PantryList } from "./pantry-list"
import { PantrySummary } from "./pantry-summary"
import { PantryRecipesButton } from "@/components/pantry-recipes-button"
import { MessageCircle, Sparkles } from "lucide-react"
import type { PantryItem } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function PantryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const { data: items } = await supabase
    .from("pantry_items")
    .select("*")
    .eq("user_id", user.id)
    .order("name")
    .returns<PantryItem[]>()

  const pantry = items ?? []

  return (
    <>
      <PageHeader
        title="Pantry"
        description="Every item with full nutrition — NutriAI uses this to plan your meals."
        actions={
          <Button asChild>
            <Link href="/chat">
              <MessageCircle className="mr-2 size-4" /> Add via chat
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-4 md:p-8">
        {/* Nutrition snapshot */}
        {pantry.length > 0 ? <PantrySummary items={pantry} /> : null}

        {/* Pantry → Recipe bridge */}
        <PantryRecipesButton itemCount={pantry.length} />

        {/* CTA banner */}
        <Card className="relative overflow-hidden border-primary/30">
          <div
            className="absolute inset-0 opacity-[0.08]"
            style={{
              background:
                "radial-gradient(circle at 80% 20%, oklch(0.78 0.16 140) 0, transparent 40%), radial-gradient(circle at 20% 80%, oklch(0.82 0.13 80) 0, transparent 40%)",
            }}
            aria-hidden
          />
          <CardHeader className="relative">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle>Manage your pantry in chat</CardTitle>
                  <CardDescription className="mt-0.5">
                    Say &ldquo;add 1 kg rice, 1 L milk and 2 dozen eggs&rdquo; — nutrition, categories, units and expiry are filled in automatically.
                  </CardDescription>
                </div>
              </div>
              <Button asChild>
                <Link href="/chat">
                  <MessageCircle className="mr-2 size-4" /> Start a pantry chat
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        {/* Items by category */}
        <Card>
          <CardHeader>
            <CardTitle>Everything in your pantry</CardTitle>
            <CardDescription>
              Tap any item to see its detailed macros. Use the chat to edit or rename quickly.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PantryList items={pantry} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
