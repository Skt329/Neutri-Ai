import Link from "next/link"
import { AlertTriangle, Clock, Coffee, Moon, Sparkles, Sun, Utensils, type LucideIcon } from "lucide-react"
import type { MealLog, MealType } from "@/lib/types"
import { cn } from "@/lib/utils"
import { formatNumber } from "@/lib/format"
import { MACRO_META } from "@/lib/macro-colors"

const MEAL_META: Record<MealType, { label: string; icon: LucideIcon; tint: string }> = {
  breakfast: { label: "Breakfast", icon: Coffee, tint: "var(--macro-carbs)" },
  lunch: { label: "Lunch", icon: Sun, tint: "var(--macro-calories)" },
  dinner: { label: "Dinner", icon: Moon, tint: "var(--macro-protein)" },
  snack: { label: "Snack", icon: Sparkles, tint: "var(--macro-fat)" },
}

export function MealTimeline({ meals }: { meals: MealLog[] }) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-border bg-muted/30 p-8 text-center">
        <div
          className="flex size-12 items-center justify-center rounded-full"
          style={{ backgroundColor: "color-mix(in oklch, var(--macro-protein) 12%, transparent)" }}
        >
          <Utensils className="size-5" style={{ color: "var(--macro-protein)" }} aria-hidden />
        </div>
        <div>
          <p className="text-sm font-medium">Nothing logged yet today</p>
          <p className="mt-1 text-xs text-muted-foreground">Tell NutriAI what you ate and it&apos;ll show up here.</p>
        </div>
      </div>
    )
  }

  // Sort by time ascending, compute gaps between consecutive meals
  const sorted = [...meals].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime())

  return (
    <ol className="relative flex flex-col gap-3">
      <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" aria-hidden />
      {sorted.map((meal, i) => {
        const prev = sorted[i - 1]
        const gapHours = prev
          ? (new Date(meal.logged_at).getTime() - new Date(prev.logged_at).getTime()) / 3_600_000
          : null
        const warn = gapHours != null && gapHours >= 5
        return (
          <div key={meal.id} className="flex flex-col gap-2">
            {warn ? <GapMarker hours={gapHours!} /> : null}
            <TimelineItem meal={meal} index={i} />
          </div>
        )
      })}
    </ol>
  )
}

function TimelineItem({ meal, index }: { meal: MealLog; index: number }) {
  const meta = MEAL_META[meal.meal_type ?? "snack"]
  const Icon = meta.icon
  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })

  return (
    <li
      className="relative flex gap-3 animate-in fade-in slide-in-from-bottom-1 duration-500"
      style={{ animationDelay: `${index * 50}ms`, animationFillMode: "backwards" }}
    >
      <div
        className="relative z-10 flex size-8 shrink-0 items-center justify-center rounded-full ring-4 ring-background"
        style={{ backgroundColor: `color-mix(in oklch, ${meta.tint} 15%, var(--background))` }}
      >
        <Icon className="size-4" style={{ color: meta.tint }} aria-hidden />
      </div>
      <div className="min-w-0 flex-1 rounded-xl border border-border bg-card p-3 transition-colors hover:bg-accent/20">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              <span style={{ color: meta.tint }}>{meta.label}</span>
              <span className="inline-flex items-center gap-1 text-muted-foreground">
                <Clock className="size-3" aria-hidden />
                {time}
              </span>
            </div>
            <p className="mt-1 line-clamp-2 text-sm font-medium capitalize">{meal.description}</p>
            {meal.items.length > 0 ? (
              <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                {meal.items.map((i) => i.name).join(" · ")}
              </p>
            ) : null}
          </div>
          {meal.calories != null ? (
            <div className="shrink-0 text-right">
              <p className="text-sm font-semibold tabular-nums" style={{ color: MACRO_META.calories.color }}>
                {formatNumber(Math.round(meal.calories))}
              </p>
              <p className="text-[10px] text-muted-foreground">kcal</p>
            </div>
          ) : null}
        </div>
        {(meal.protein_g || meal.carbs_g || meal.fat_g) && (
          <div className="mt-2 flex gap-3 text-[11px] tabular-nums">
            {meal.protein_g != null ? (
              <span style={{ color: MACRO_META.protein.color }}>P {Math.round(meal.protein_g)}g</span>
            ) : null}
            {meal.carbs_g != null ? (
              <span style={{ color: MACRO_META.carbs.color }}>C {Math.round(meal.carbs_g)}g</span>
            ) : null}
            {meal.fat_g != null ? (
              <span style={{ color: MACRO_META.fat.color }}>F {Math.round(meal.fat_g)}g</span>
            ) : null}
          </div>
        )}
      </div>
    </li>
  )
}

function GapMarker({ hours }: { hours: number }) {
  return (
    <div className="relative flex items-center gap-2 py-1 pl-10">
      <div
        className={cn(
          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider",
          "bg-[color:var(--macro-calories)]/12 text-[color:var(--macro-calories)]",
        )}
      >
        <AlertTriangle className="size-3" aria-hidden />
        {Math.round(hours)}h gap
      </div>
      <Link
        href={`/chat?prefill=${encodeURIComponent("Suggest a quick snack I can grab")}`}
        className="text-[11px] font-medium text-primary hover:underline"
      >
        Ask for a snack
      </Link>
    </div>
  )
}
