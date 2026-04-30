import Link from "next/link"
import { getAuthUser } from "@/lib/supabase/auth"
import { Button } from "@/components/ui/button"
import { MealsList } from "./meals-list"
import { sumTotals } from "@/lib/nutrition"
import { MessageCircle, Sparkles, Clock, Flame, Drumstick, Wheat, Droplet } from "lucide-react"
import type { MealLog, NutritionTargets } from "@/lib/types"
import { formatNumber } from "@/lib/format"

export const metadata = {
  title: "Meals — NutriAI",
  description: "Your complete food diary — log meals, track macros, and monitor daily nutrition targets.",
}

export const dynamic = "force-dynamic"

export default async function MealsPage() {
  const { user, supabase } = await getAuthUser()
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

  const macroStats = [
    { icon: Flame, label: "Calories", value: formatNumber(totals.calories), target: targets ? formatNumber(targets.calories) : null, unit: "kcal", color: "var(--macro-cal)" },
    { icon: Drumstick, label: "Protein", value: formatNumber(totals.protein_g), target: targets ? formatNumber(targets.protein_g) : null, unit: "g", color: "var(--macro-protein)" },
    { icon: Wheat, label: "Carbs", value: formatNumber(totals.carbs_g), target: targets ? formatNumber(targets.carbs_g) : null, unit: "g", color: "var(--macro-carbs)" },
    { icon: Droplet, label: "Fat", value: formatNumber(totals.fat_g), target: targets ? formatNumber(targets.fat_g) : null, unit: "g", color: "var(--macro-fat)" },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Meals</h1>
          <p className="text-stone text-sm mt-1">Your food diary, organized around your day.</p>
        </div>
        <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 w-fit">
          <Link href="/chat">
            <MessageCircle className="size-4" /> Log via chat
          </Link>
        </Button>
      </div>

      {/* Today's macro stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {macroStats.map(({ icon: Icon, label, value, target, unit, color }, i) => (
          <div
            key={label}
            className="bg-card border border-border rounded-2xl p-3 animate-fade-in-up"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <div className="flex items-center gap-1.5 mb-1">
              <Icon className="size-3.5" style={{ color }} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="font-display text-xl font-bold text-ink tabular-nums">{value}</span>
              {target && <span className="text-xs text-fog">/ {target}</span>}
              <span className="text-xs text-fog">{unit}</span>
            </div>
          </div>
        ))}
      </div>

      {/* CTA card */}
      <div className="bg-card rounded-2xl border border-border p-5 mb-6 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-mint2 text-sage">
            <Sparkles className="size-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-ink">Log with NutriAI</p>
            <p className="text-sm text-stone mt-0.5">
              Just describe your meal — macros, portions and meal type are filled in for you.
            </p>
          </div>
          <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-5 w-fit shrink-0">
            <Link href={`/chat?prefill=${encodeURIComponent("I just had ")}`}>
              <MessageCircle className="size-4" /> Start a meal chat
            </Link>
          </Button>
        </div>
      </div>

      {/* All meals */}
      <div className="bg-card rounded-2xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: '300ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="font-semibold text-ink">All meals</p>
            <p className="text-xs text-fog">{meals?.length ?? 0} total · grouped by day</p>
          </div>
          <div className="hidden sm:flex items-center gap-1.5 rounded-full bg-cream2 px-2.5 py-1 text-[11px] text-fog">
            <Clock className="size-3" />
            Gap warnings after 5h
          </div>
        </div>
        <MealsList meals={meals ?? []} />
      </div>
    </div>
  )
}
