import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import { MealTimeline } from "@/components/meal-timeline"
import { CalorieHero } from "@/components/calorie-hero"
import { StreakBadge } from "@/components/streak-badge"
import { DeficitAlertCard } from "@/components/deficit-alert-card"
import { WeeklyReportCard } from "@/components/weekly-report-card"
import { computeStreakInfo } from "@/lib/streaks"
import { buildDeficitAlerts } from "@/lib/deficit-alerts"
import { buildWeeklyStats } from "@/lib/weekly-stats"
import { computeMealGap } from "@/lib/meal-gaps"
import { sumTotals, startOfLocalDayISO } from "@/lib/nutrition"
import { MessageCircle, ChefHat, Sparkles, User } from "lucide-react"
import type { MealLog, NutritionTargets, Profile, WeightLog, DeficitAlert } from "@/lib/types"

export const dynamic = "force-dynamic"

export default async function DashboardPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: targets }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
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
  const weekStart = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
  const weightWindow = new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()

  const [{ data: meals7d }, { data: todayMeals }, { data: weights }] = await Promise.all([
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", weekStart)
      .order("logged_at", { ascending: false })
      .returns<MealLog[]>(),
    supabase
      .from("meal_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", dayStart)
      .order("logged_at", { ascending: false })
      .returns<MealLog[]>(),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .gte("logged_at", weightWindow)
      .order("logged_at", { ascending: true })
      .returns<WeightLog[]>(),
  ])

  const mealsToday: MealLog[] = todayMeals ?? []
  const totals = sumTotals(mealsToday)
  const streak = computeStreakInfo((meals7d ?? []).map((m) => m.logged_at), timezone)
  const alerts: DeficitAlert[] = buildDeficitAlerts({ meals: mealsToday, targets: targets ?? null })
  const gap = computeMealGap(mealsToday, new Date())
  if (gap?.warn) {
    alerts.unshift({
      kind: "gap",
      severity: "warning",
      title: `${Math.round(gap.hours)}h since your last meal`,
      message: gap.message,
      quickFix: "A quick snack now keeps energy steady and avoids an evening calorie blowout.",
    })
  }
  const stats = buildWeeklyStats({
    meals: meals7d ?? [],
    weights: weights ?? [],
    targets: targets ?? null,
    timezone,
  })

  const firstName = profile?.full_name?.split(" ")[0] ?? "there"
  const now = new Date()
  const greeting = now.getHours() < 12 ? "Good morning" : now.getHours() < 18 ? "Good afternoon" : "Good evening"

  return (
    <>
      <PageHeader
        title={`${greeting}, ${firstName}`}
        description={targets ? `${targets.calories} kcal target today` : "Let's set up your nutrition plan"}
        actions={
          <Button asChild>
            <Link href="/chat">
              <Sparkles className="mr-2 size-4" /> Ask NutriAI
            </Link>
          </Button>
        }
      />

      <div className="flex flex-col gap-6 p-4 md:p-8">
        {/* Hero grid: calorie ring + streak + quick actions */}
        <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <section
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-5 sm:p-6"
            style={{
              backgroundImage:
                "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--macro-protein) 10%, transparent) 0, transparent 50%)",
            }}
          >
            <p className="mb-4 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Today · {now.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
            </p>
            {targets ? (
              <CalorieHero
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
          <div className="flex flex-col gap-4">
            <StreakBadge streak={streak} />
            <QuickActions />
          </div>
        </div>

        {alerts.length > 0 ? <DeficitAlertCard alerts={alerts} /> : null}

        <WeeklyReportCard stats={stats} />

        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Today&apos;s meals</h2>
            <Link href="/meals" className="text-xs font-medium text-primary hover:underline">
              View all
            </Link>
          </div>
          <MealTimeline meals={mealsToday} />
        </section>
      </div>
    </>
  )
}

function NoTargets() {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border p-8 text-center">
      <p className="text-sm text-muted-foreground">No nutrition targets yet.</p>
      <Button asChild variant="outline" size="sm">
        <Link href="/profile">
          <User className="mr-2 size-4" />
          Finish your profile
        </Link>
      </Button>
    </div>
  )
}

function QuickActions() {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-border bg-card p-3">
      <Button asChild variant="ghost" className="justify-start">
        <Link href="/chat">
          <MessageCircle className="mr-2 size-4" /> Log what you ate
        </Link>
      </Button>
      <Button asChild variant="ghost" className="justify-start">
        <Link href={`/chat?prefill=${encodeURIComponent("What can I cook with what's in my pantry?")}`}>
          <ChefHat className="mr-2 size-4" /> What can I cook?
        </Link>
      </Button>
      <Button asChild variant="ghost" className="justify-start">
        <Link href="/pantry">
          <Sparkles className="mr-2 size-4" /> Update pantry
        </Link>
      </Button>
    </div>
  )
}
