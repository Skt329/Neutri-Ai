import type { PantryItem } from "@/lib/types"
import { computePantryTotals } from "@/lib/pantry-nutrition"
import { formatNumber } from "@/lib/format"
import { Flame, Drumstick, Wheat, Droplet, Salad, Package } from "lucide-react"

/**
 * Rich, at-a-glance nutrition summary shown at the top of the pantry page.
 * Flex layout, semantic tokens, no gradients — just colorful chips.
 */
export function PantrySummary({ items }: { items: PantryItem[] }) {
  const totals = computePantryTotals(items)
  const totalItems = items.length
  const expiring = items.filter((i) => isExpiringSoon(i.expires_on)).length
  const itemsWithNutrition = items.filter((i) => i.calories_kcal != null).length

  const stats: Array<{
    icon: typeof Flame
    label: string
    value: string
    tint: string
  }> = [
    { icon: Flame, label: "Total calories", value: `${formatNumber(totals.calories)} kcal`, tint: "oklch(0.72 0.18 40)" },
    { icon: Drumstick, label: "Protein", value: `${formatNumber(totals.protein_g)} g`, tint: "oklch(0.70 0.17 20)" },
    { icon: Wheat, label: "Carbs", value: `${formatNumber(totals.carbs_g)} g`, tint: "oklch(0.82 0.13 80)" },
    { icon: Droplet, label: "Fat", value: `${formatNumber(totals.fat_g)} g`, tint: "oklch(0.78 0.13 60)" },
    { icon: Salad, label: "Fiber", value: `${formatNumber(totals.fiber_g)} g`, tint: "oklch(0.78 0.16 140)" },
  ]

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card">
      {/* Top row — inventory counts */}
      <div className="flex flex-wrap items-center gap-4 border-b border-border/60 bg-muted/30 px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Package className="size-4" aria-hidden />
          </div>
          <div>
            <p className="text-sm font-semibold">Pantry snapshot</p>
            <p className="text-xs text-muted-foreground">
              {totalItems} item{totalItems === 1 ? "" : "s"}
              {itemsWithNutrition < totalItems
                ? ` · ${totalItems - itemsWithNutrition} missing nutrition`
                : null}
            </p>
          </div>
        </div>
        {expiring > 0 ? (
          <span className="ml-auto inline-flex items-center gap-1.5 rounded-full bg-[oklch(0.95_0.04_25)] px-3 py-1 text-xs font-medium text-[oklch(0.45_0.18_25)]">
            {expiring} expiring soon
          </span>
        ) : null}
      </div>

      {/* Macro chips */}
      <div className="grid grid-cols-2 divide-x divide-y divide-border/60 sm:grid-cols-3 md:grid-cols-5 md:divide-y-0">
        {stats.map(({ icon: Icon, label, value, tint }) => (
          <div key={label} className="flex flex-col gap-1.5 p-4">
            <div className="flex items-center gap-1.5">
              <Icon className="size-3.5" style={{ color: tint }} aria-hidden />
              <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                {label}
              </span>
            </div>
            <p className="text-lg font-semibold tabular-nums">{value}</p>
          </div>
        ))}
      </div>
    </section>
  )
}

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const diff = d.getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 * 3
}
