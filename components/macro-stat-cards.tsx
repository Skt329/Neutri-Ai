import { Drumstick, Flame, Wheat, Droplets } from "lucide-react"
import type { DailyTotals, NutritionTargets } from "@/lib/types"
import { MACRO_META } from "@/lib/macro-colors"

export function MacroStatCards({
  totals,
  targets,
}: {
  totals: DailyTotals
  targets: NutritionTargets | null
}) {
  const cards = [
    {
      label: "Calories",
      icon: Flame,
      color: MACRO_META.calories.color,
      value: Math.round(totals.calories),
      target: targets?.calories ?? null,
      unit: "kcal",
    },
    {
      label: "Protein",
      icon: Drumstick,
      color: MACRO_META.protein.color,
      value: Math.round(totals.protein_g),
      target: targets?.protein_g ?? null,
      unit: "g",
    },
    {
      label: "Carbs",
      icon: Wheat,
      color: MACRO_META.carbs.color,
      value: Math.round(totals.carbs_g),
      target: targets?.carbs_g ?? null,
      unit: "g",
    },
    {
      label: "Fat",
      icon: Droplets,
      color: MACRO_META.fat.color,
      value: Math.round(totals.fat_g),
      target: targets?.fat_g ?? null,
      unit: "g",
    },
  ]

  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
      {cards.map((c) => {
        const pct = c.target ? Math.min(100, (c.value / c.target) * 100) : 0
        return (
          <div
            key={c.label}
            className="relative overflow-hidden rounded-2xl border border-border bg-card p-4"
          >
            <div
              aria-hidden
              className="absolute -right-4 -top-4 size-20 rounded-full opacity-[0.08]"
              style={{ backgroundColor: c.color }}
            />
            <div className="relative flex items-center gap-2">
              <div
                className="flex size-7 items-center justify-center rounded-full"
                style={{ backgroundColor: `color-mix(in oklch, ${c.color} 15%, transparent)` }}
              >
                <c.icon className="size-3.5" style={{ color: c.color }} aria-hidden />
              </div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {c.label}
              </span>
            </div>
            <div className="relative mt-2 flex items-baseline gap-1.5">
              <span className="text-2xl font-semibold tabular-nums">{c.value}</span>
              {c.target ? (
                <span className="text-xs text-muted-foreground">
                  / {c.target} {c.unit}
                </span>
              ) : (
                <span className="text-xs text-muted-foreground">{c.unit}</span>
              )}
            </div>
            <div className="relative mt-2 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full transition-[width] duration-700 ease-out"
                style={{ width: `${pct}%`, backgroundColor: c.color }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
