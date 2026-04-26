"use client"

import Link from "next/link"
import { useTransition } from "react"
import type { MealLog } from "@/lib/types"
import { formatNumber, formatTime, formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"
import { Trash2, Utensils, MessageCircle } from "lucide-react"
import { deleteMeal } from "./actions"
import { toast } from "sonner"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { MealTypeIcon } from "@/components/category-icon"
import { MEAL_TYPE_META, type MealType } from "@/lib/categories"
import { cn } from "@/lib/utils"

export function MealsList({ meals }: { meals: MealLog[] }) {
  if (meals.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Utensils className="size-5" aria-hidden />
          </EmptyMedia>
          <EmptyTitle>No meals yet</EmptyTitle>
          <EmptyDescription>
            Tell NutriAI what you ate and it&apos;ll estimate macros and log it for you.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild className="mt-4">
          <Link href="/chat">
            <MessageCircle className="mr-2 size-4" /> Log via chat
          </Link>
        </Button>
      </Empty>
    )
  }

  const grouped = groupByDay(meals)
  return (
    <div className="flex flex-col gap-6">
      {Object.entries(grouped).map(([day, list], sectionIdx) => (
        <section
          key={day}
          className="flex flex-col gap-2 animate-in fade-in slide-in-from-bottom-2 duration-500"
          style={{ animationDelay: `${sectionIdx * 40}ms`, animationFillMode: "backwards" }}
        >
          <h3 className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{day}</h3>
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
      if (res && "ok" in res && res.ok === false) toast.error(res.error)
      else toast.success("Meal deleted")
    })
  }

  return (
    <li
      className={cn(
        "group flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-all hover:border-primary/30 hover:shadow-sm",
        "animate-in fade-in slide-in-from-bottom-1 duration-300",
      )}
      style={{ animationDelay: `${index * 40}ms`, animationFillMode: "backwards" }}
    >
      <MealTypeIcon type={type} size="md" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          {meta ? (
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide"
              style={{
                backgroundColor: `color-mix(in oklab, ${meta.tint} 18%, var(--background))`,
                color: meta.tint,
              }}
            >
              {meta.label}
            </span>
          ) : null}
          <span className="text-xs text-muted-foreground">{formatTime(meal.logged_at)}</span>
        </div>
        <p className="mt-1 truncate text-sm font-medium">{meal.description}</p>
        <p className="text-xs text-muted-foreground tabular-nums">
          P {formatNumber(meal.protein_g)}g · C {formatNumber(meal.carbs_g)}g · F {formatNumber(meal.fat_g)}g
        </p>
      </div>
      <div className="flex items-center gap-1">
        <div className="text-right">
          <p className="text-sm font-semibold tabular-nums">{formatNumber(meal.calories)}</p>
          <p className="text-[10px] uppercase tracking-wide text-muted-foreground">kcal</p>
        </div>
        <Button
          variant="ghost"
          size="icon"
          aria-label="Delete meal"
          disabled={pending}
          onClick={onDelete}
          className="text-muted-foreground hover:text-destructive"
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
