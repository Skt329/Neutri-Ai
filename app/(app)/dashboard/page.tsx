import Link from "next/link"
import { getAuthUser } from "@/lib/supabase/auth"
import { getProfile } from "@/lib/supabase/profile"
import { Button } from "@/components/ui/button"
import { CalorieRing } from "@/components/today/calorie-ring"
import { MealSlotCard } from "@/components/today/meal-slot-card"
import { buildDeficitAlerts } from "@/lib/deficit-alerts"
import { computeMealGap } from "@/lib/meal-gaps"
import { sumTotals, startOfLocalDayISO } from "@/lib/nutrition"
import { Sparkles, MessageCircle, Lightbulb } from "lucide-react"
import type { MealLog, NutritionTargets, DeficitAlert } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const { user, supabase } = await getAuthUser()
  if (!user) return null

  const [profile, { data: targets }] = await Promise.all([
    getProfile(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle<NutritionTargets>(),
  ])

  const timezone = profile?.timezone || "UTC"
  const dayStart = startOfLocalDayISO(timezone)

  const { data: todayMeals } = await supabase
    .from("meal_logs")
    .select("*")
    .eq("user_id", user.id)
    .gte("logged_at", dayStart)
    .order("logged_at", { ascending: false })
    .returns<MealLog[]>()

  const mealsToday: MealLog[] = todayMeals ?? []
  const totals = sumTotals(mealsToday)

  // Alerts
  const alerts: DeficitAlert[] = buildDeficitAlerts({ meals: mealsToday, targets: targets ?? null })
  const gap = computeMealGap(mealsToday, new Date())
  if (gap?.warn) {
    alerts.unshift({
      kind: "gap",
      severity: "warning",
      title: `${Math.round(gap.hours)}h since your last meal`,
      message: gap.message,
      quickFix: "A quick snack now keeps energy steady.",
    })
  }

  // Categorize meals
  const mealByType = {
    breakfast: mealsToday.find((m) => m.meal_type === "breakfast") ?? null,
    lunch: mealsToday.find((m) => m.meal_type === "lunch") ?? null,
    snack: mealsToday.find((m) => m.meal_type === "snack") ?? null,
    dinner: mealsToday.find((m) => m.meal_type === "dinner") ?? null,
  }

  const firstName = profile?.full_name?.split(" ")[0] ?? "there"
  const now = new Date()
  const greeting =
    now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">
            {greeting}, {firstName}
          </h1>
          <p className="text-stone text-sm mt-1">
            {now.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          </p>
        </div>
        <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 hidden md:flex">
          <Link href="/chat">
            <Sparkles className="size-4" /> Ask NutriAI
          </Link>
        </Button>
      </div>

      {/* Main grid */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Left panel — Calorie ring */}
        <section className="bg-card rounded-3xl border border-border p-6 animate-fade-in-up">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-4">
            Today&apos;s Progress
          </p>
          {targets ? (
            <CalorieRing
              consumed={totals.calories}
              target={targets.calories}
              protein={{ consumed: totals.protein_g, target: targets.protein_g }}
              carbs={{ consumed: totals.carbs_g, target: targets.carbs_g }}
              fat={{ consumed: totals.fat_g, target: targets.fat_g }}
            />
          ) : (
            <NoTargets />
          )}
        </section>

        {/* Right panel — Meals timeline */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-stone">
              Today&apos;s meals
            </h2>
            <Link href="/meals" className="text-xs font-medium text-sage hover:text-forest smooth-hover">
              View all →
            </Link>
          </div>

          <div className="space-y-3">
            <MealSlotCard meal={mealByType.breakfast} type="breakfast" index={0} />
            <MealSlotCard meal={mealByType.lunch} type="lunch" index={1} />
            <MealSlotCard meal={mealByType.snack} type="snack" index={2} />
            <MealSlotCard meal={mealByType.dinner} type="dinner" index={3} />
          </div>

          {/* AI Nudge card */}
          {alerts.length > 0 && (
            <div className="bg-forest rounded-2xl p-5 text-white animate-fade-in-up" style={{ animationDelay: '400ms' }}>
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/10">
                  <Lightbulb className="size-5" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm">{alerts[0].title}</p>
                  <p className="text-xs text-white/70 mt-1">{alerts[0].message}</p>
                  {alerts[0].quickFix && (
                    <p className="text-xs text-white/50 mt-1 italic">{alerts[0].quickFix}</p>
                  )}
                </div>
              </div>
              <Button asChild size="sm" className="mt-3 bg-turmeric hover:bg-turmeric/90 text-ink rounded-full text-xs font-semibold">
                <Link href="/chat">
                  <MessageCircle className="size-3 mr-1.5" /> Get recipe suggestion
                </Link>
              </Button>
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

function NoTargets() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-ghost p-8 text-center">
      <p className="text-sm text-stone">No nutrition targets yet.</p>
      <Button asChild variant="outline" size="sm" className="rounded-full">
        <Link href="/profile">Finish your profile</Link>
      </Button>
    </div>
  )
}
