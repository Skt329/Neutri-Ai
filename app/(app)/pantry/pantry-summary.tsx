import type { PantryItem } from "@/lib/types"
import { formatNumber } from "@/lib/format"
import { Package, Flame, Drumstick, Wheat, Droplet } from "lucide-react"

interface PantrySummaryProps {
  items: PantryItem[]
}

export function PantrySummary({ items }: PantrySummaryProps) {
  const totalItems = items.length
  const totalCalories = items.reduce((s, i) => s + (i.calories_kcal ?? 0), 0)
  const totalProtein = items.reduce((s, i) => s + (i.protein_g ?? 0), 0)
  const totalCarbs = items.reduce((s, i) => s + (i.carbs_g ?? 0), 0)
  const totalFat = items.reduce((s, i) => s + (i.fat_g ?? 0), 0)

  const stats = [
    { icon: Package, label: "Items", value: totalItems.toString(), color: "var(--sage)" },
    { icon: Flame, label: "Total kcal", value: formatNumber(totalCalories), color: "var(--macro-cal)" },
    { icon: Drumstick, label: "Protein", value: `${formatNumber(totalProtein)}g`, color: "var(--macro-protein)" },
    { icon: Wheat, label: "Carbs", value: `${formatNumber(totalCarbs)}g`, color: "var(--macro-carbs)" },
    { icon: Droplet, label: "Fat", value: `${formatNumber(totalFat)}g`, color: "var(--macro-fat)" },
  ]

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
      {stats.map(({ icon: Icon, label, value, color }, i) => (
        <div
          key={label}
          className="flex flex-col gap-1 bg-card border border-border rounded-2xl p-3 animate-fade-in-up"
          style={{ animationDelay: `${i * 60}ms` }}
        >
          <div className="flex items-center gap-1.5">
            <Icon className="size-3.5" style={{ color }} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">{label}</span>
          </div>
          <span className="font-display text-xl font-bold text-ink tabular-nums">{value}</span>
        </div>
      ))}
    </div>
  )
}
