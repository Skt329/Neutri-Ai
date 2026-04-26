import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { MealsList } from "./meals-list"
import { sumTotals } from "@/lib/nutrition"
import { MessageCircle, Sparkles, Clock } from "lucide-react"
import type { MealLog, NutritionTargets } from "@/lib/types"
import { MacroStatCards } from "@/components/macro-stat-cards"
import { MealTimeline } from "@/components/meal-timeline"

export const dynamic = "force-dynamic"

export default async function MealsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const now = new Date()
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()

  const [{ data: meals }, { data: targets }] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(200)
      .returns<MealLog[]>(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle<NutritionTargets>(),
  ])

  const todays = (meals ?? []).filter((m) => m.logged_at >= dayStart)
  const totals = sumTotals(todays)

  return (
    <>
      <PageHeader
        title="Meals"
        description="Your food diary, organized around your day."
        actions={
          <Button asChild>
            <Link href="/chat">
              <MessageCircle className="mr-2 size-4" />
              Log via chat
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-4 md:p-8">
        <MacroStatCards totals={totals} targets={targets ?? null} />

        <Card className="relative overflow-hidden border-primary/20">
          <div
            aria-hidden
            className="absolute inset-0 opacity-[0.06]"
            style={{
              background:
                "radial-gradient(circle at 12% 20%, var(--macro-protein) 0, transparent 45%), radial-gradient(circle at 88% 80%, var(--macro-carbs) 0, transparent 45%)",
            }}
          />
          <CardHeader className="relative">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                  <Sparkles className="size-5" />
                </div>
                <div>
                  <CardTitle className="text-base">Log with NutriAI</CardTitle>
                  <CardDescription className="mt-0.5">
                    Just describe your meal — macros, portions and meal type are filled in for you.
                  </CardDescription>
                </div>
              </div>
              <Button asChild>
                <Link href={`/chat?prefill=${encodeURIComponent("I just had ")}`}>
                  <MessageCircle className="mr-2 size-4" />
                  Start a meal chat
                </Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base">Today&apos;s timeline</CardTitle>
              <CardDescription>
                {todays.length > 0
                  ? `${todays.length} meal${todays.length === 1 ? "" : "s"} logged`
                  : "Nothing logged yet"}
              </CardDescription>
            </div>
            <div className="hidden items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[11px] text-muted-foreground sm:inline-flex">
              <Clock className="size-3" aria-hidden />
              Gap warnings after 5h
            </div>
          </CardHeader>
          <CardContent>
            <MealTimeline meals={todays} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">All meals</CardTitle>
            <CardDescription>{meals?.length ?? 0} total · grouped by day</CardDescription>
          </CardHeader>
          <CardContent>
            <MealsList meals={meals ?? []} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}
