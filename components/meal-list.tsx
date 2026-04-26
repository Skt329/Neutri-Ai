import { formatNumber, formatTime } from "@/lib/format"
import type { MealLog } from "@/lib/types"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { Utensils } from "lucide-react"
import { MealTypeIcon } from "@/components/category-icon"
import { MEAL_TYPE_META, type MealType } from "@/lib/categories"

export function MealList({
  meals,
  emptyTitle = "No meals logged yet",
  emptyDescription = "Describe what you ate to NutriAI and it takes care of the rest.",
}: {
  meals: MealLog[]
  emptyTitle?: string
  emptyDescription?: string
}) {
  if (meals.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Utensils className="size-5" aria-hidden />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
      </Empty>
    )
  }

  return (
    <ul className="flex flex-col gap-2">
      {meals.map((m, i) => {
        const type = (m.meal_type as MealType | null) ?? null
        const meta = type ? MEAL_TYPE_META[type] : null
        return (
          <li
            key={m.id}
            className="flex items-center gap-3 rounded-xl border border-border bg-card px-3 py-3 transition-colors hover:border-primary/30 animate-in fade-in slide-in-from-bottom-1 duration-300"
            style={{ animationDelay: `${i * 40}ms`, animationFillMode: "backwards" }}
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
                <span className="text-xs text-muted-foreground">{formatTime(m.logged_at)}</span>
              </div>
              <p className="mt-1 truncate text-sm font-medium">{m.description}</p>
              <p className="text-xs text-muted-foreground tabular-nums">
                P {formatNumber(m.protein_g)}g · C {formatNumber(m.carbs_g)}g · F {formatNumber(m.fat_g)}g
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold tabular-nums">{formatNumber(m.calories)}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">kcal</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
