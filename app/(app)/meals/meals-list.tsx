"use client"

import Link from "next/link"
import { useTransition } from "react"
import type { MealLog } from "@/lib/types"
import { formatNumber, formatTime, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Trash2, Utensils, MessageCircle } from "lucide-react"
import { deleteMeal } from "./actions"
import { toast } from "sonner"
import { MealTypeIcon } from "@/components/category-icon"
import { MEAL_TYPE_META, type MealType } from "@/lib/categories"



export function MealsList({ meals }: { meals: MealLog[] }) {
  if (meals.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-12 text-center">
        <div className="relative">
          <div className="absolute inset-0 bg-mint/40 rounded-full blur-xl" />
          <div className="relative flex size-14 items-center justify-center rounded-full bg-forest text-white shadow-lg">
            <Utensils className="size-6" />
          </div>
        </div>
        <div>
          <h3 className="font-display text-lg font-bold text-ink">No meals yet</h3>
          <p className="text-stone text-sm mt-1 max-w-xs">
            Tell NutriAI what you ate and it&apos;ll estimate macros and log it for you.
          </p>
        </div>
        <Button asChild className="bg-forest hover:bg-sage text-white rounded-full px-5">
          <Link href="/chat">
            <MessageCircle className="mr-2 size-4" /> Log via chat
          </Link>
        </Button>
      </div>
    )
  }

  const grouped = groupByDay(meals)
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([day, list], sectionIdx) => (
        <section
          key={day}
          className="flex flex-col gap-2 animate-fade-in-up"
          style={{ animationDelay: `${sectionIdx * 60}ms` }}
        >
          <h3 className="text-xs font-semibold uppercase tracking-wider text-fog">{day}</h3>
          <ul className="flex flex-col gap-2">
            {list.map((m, i) => (
              <MealRow key={m.id} meal={m} index={i} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}

function MealRow({ meal, index }: { meal: MealLog; index: number }) {
  const [pending, startTransition] = useTransition()
  const type = (meal.meal_type as MealType | null) ?? null
  const meta = type ? MEAL_TYPE_META[type] : null

  function onDelete() {
    if (!window.confirm("Delete this meal?")) return
    startTransition(async () => {
      const res = await deleteMeal(meal.id)
      if (res && "ok" in res && res.ok === false) {
        toast.error(res.error)
      } else toast.success("Meal deleted")
    })
  }

  return (
    <li
      className="group flex items-center gap-3 rounded-2xl border border-border bg-card/80 px-3 py-3 smooth-hover hover:border-sage/30 hover:shadow-sm hover:-translate-y-0.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 40}ms` }}
    >
      <MealTypeIcon type={type} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {meta ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: `color-mix(in oklab, ${meta.tint} 18%, var(--cream))`,
                color: meta.tint,
              }}
            >
              {meta.label}
            </span>
          ) : null}
          <span className="text-xs text-fog">{formatTime(meal.logged_at)}</span>
        </div>
        <p className="mt-1 break-words text-sm font-medium text-ink">{meal.description}</p>
        <p className="text-xs text-stone tabular-nums mt-0.5">
          P {formatNumber(meal.protein_g)}g · C {formatNumber(meal.carbs_g)}g · F {formatNumber(meal.fat_g)}g
        </p>
      </div>
      <div className="flex items-center gap-1">
        <div className="text-right">
          <p className="font-display text-base font-bold tabular-nums text-ink">{formatNumber(meal.calories)}</p>
          <p className="text-[10px] uppercase tracking-wide text-fog">kcal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete meal"
          disabled={pending}
          onClick={onDelete}
          className="text-fog hover:text-clay opacity-0 group-hover:opacity-100 smooth-hover"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>
    </li>
  )
}

function groupByDay(meals: MealLog[]): Record<string, MealLog[]> {
  const out: Record<string, MealLog[]> = {}
  for (const m of meals) {
    const key = formatDate(m.logged_at)
    out[key] = out[key] || []
    out[key].push(m)
  }
  return out
}
