"use client"

import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import type { PantryItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Trash2, MessageCircle, AlertTriangle, ChevronDown, Flame, Drumstick, Wheat, Droplet, Salad, Package } from "lucide-react"
import { deletePantryItem } from "./actions"
import { toast } from "sonner"
import { formatDate, formatNumber } from "@/lib/format"
import { normalizeCategory, PANTRY_CATEGORIES, CATEGORY_META, type PantryCategory } from "@/lib/categories"
import { CategoryIcon } from "@/components/category-icon"
import { cn } from "@/lib/utils"
import { basisCount, describeBasis } from "@/lib/pantry-nutrition"


export function PantryList({ items }: { items: PantryItem[] }) {
  const grouped = useMemo(() => {
    const map = new Map<PantryCategory, PantryItem[]>()
    for (const it of items) {
      const cat = normalizeCategory(it.category)
      const list = map.get(cat) ?? []
      list.push(it)
      map.set(cat, list)
    }
    return PANTRY_CATEGORIES.filter((c) => map.has(c)).map(
      (c) => [c, (map.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name))] as const
    )
  }, [items])

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-6 py-16 text-center animate-fade-in-up">
        <div className="relative">
          <div className="absolute inset-0 bg-mint/40 rounded-full blur-xl" />
          <div className="relative flex size-16 items-center justify-center rounded-full bg-forest text-white shadow-lg">
            <Package className="size-7" />
          </div>
        </div>
        <div>
          <h2 className="font-display text-xl font-bold text-ink">Your pantry is empty</h2>
          <p className="text-stone text-sm mt-2 max-w-xs">
            Tell NutriAI what you have in the kitchen — it&apos;ll tag each item with full nutrition for you.
          </p>
        </div>
        <Button asChild className="bg-forest hover:bg-sage text-white rounded-full px-5">
          <Link href="/chat">
            <MessageCircle className="mr-2 size-4" /> Add via chat
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {grouped.map(([category, list], sectionIdx) => (
        <CategorySection key={category} category={category} items={list} index={sectionIdx} />
      ))}
    </div>
  )
}

function CategorySection({
  category,
  items,
  index,
}: {
  category: PantryCategory
  items: PantryItem[]
  index: number
}) {
  const meta = CATEGORY_META[category]

  return (
    <section
      className="rounded-2xl border border-border bg-card overflow-hidden animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Category header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-cream2/50">
        <CategoryIcon category={category} size="md" />
        <div>
          <h3 className="text-sm font-semibold text-ink">{meta.label}</h3>
          <p className="text-xs text-fog">
            {items.length} item{items.length === 1 ? "" : "s"}
          </p>
        </div>
      </div>
      {/* Items */}
      <ul className="divide-y divide-border/60">
        {items.map((item, i) => (
          <PantryRow key={item.id} item={item} index={i} />
        ))}
      </ul>
    </section>
  )
}

function PantryRow({ item, index }: { item: PantryItem; index: number }) {
  const [pending, startTransition] = useTransition()
  const [expanded, setExpanded] = useState(false)

  function onDelete(e: React.MouseEvent) {
    e.stopPropagation()
    if (!window.confirm(`Remove "${item.name}"?`)) return
    startTransition(async () => {
      const res = await deletePantryItem(item.id)
      if (res && "ok" in res && res.ok === false) {
        toast.error(res.error)
      }
    })
  }

  const qty = item.quantity != null ? `${formatNumber(item.quantity, 2)}${item.unit ? ` ${item.unit}` : ""}` : null
  const expiring = isExpiringSoon(item.expires_on)
  const hasNutrition = item.calories_kcal != null
  const mult = hasNutrition ? basisCount(item) : null
  const totalCalories = mult != null && item.calories_kcal != null ? item.calories_kcal * mult : null

  return (
    <li className="smooth-hover">
      <div className="flex items-stretch gap-1 pr-2 hover:bg-cream2/30 smooth-hover">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize text-ink">{item.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-stone">
              {qty && <span className="tabular-nums">{qty}</span>}
              {qty && item.expires_on && <span className="text-fog">·</span>}
              {item.expires_on && (
                <span className={cn("inline-flex items-center gap-1", expiring && "text-clay font-medium")}>
                  {expiring && <AlertTriangle className="size-3" />}
                  expires {formatDate(item.expires_on)}
                </span>
              )}
              {totalCalories != null && (
                <>
                  <span className="text-fog">·</span>
                  <span className="tabular-nums font-medium text-ink/70">
                    {formatNumber(totalCalories)} kcal
                  </span>
                </>
              )}
            </div>
            {hasNutrition && (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <MacroPill icon={Flame} label={`${formatNumber(item.calories_kcal ?? 0)} kcal`} color="var(--macro-cal)" />
                <MacroPill icon={Drumstick} label={`P ${formatNumber(item.protein_g ?? 0)}g`} color="var(--macro-protein)" />
                <MacroPill icon={Wheat} label={`C ${formatNumber(item.carbs_g ?? 0)}g`} color="var(--macro-carbs)" />
                <MacroPill icon={Droplet} label={`F ${formatNumber(item.fat_g ?? 0)}g`} color="var(--macro-fat)" />
              </div>
            )}
          </div>
          <ChevronDown
            className={cn("size-4 shrink-0 text-fog smooth-hover", expanded && "rotate-180")}
          />
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${item.name}`}
          disabled={pending}
          onClick={onDelete}
          className="my-auto text-fog hover:text-clay"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {expanded && hasNutrition && (
        <div className="border-t border-dashed border-border/60 bg-cream2/30 px-4 py-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <span className="rounded-full bg-cream3 px-2 py-0.5 text-stone font-medium">{describeBasis(item)}</span>
            {mult != null && (
              <span className="text-fog">× {formatNumber(mult, 2)}</span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <NutritionCell icon={Flame} label="Calories" value={`${formatNumber(item.calories_kcal ?? 0)} kcal`} color="var(--macro-cal)" />
            <NutritionCell icon={Drumstick} label="Protein" value={`${formatNumber(item.protein_g ?? 0)} g`} color="var(--macro-protein)" />
            <NutritionCell icon={Wheat} label="Carbs" value={`${formatNumber(item.carbs_g ?? 0)} g`} color="var(--macro-carbs)" />
            <NutritionCell icon={Droplet} label="Fat" value={`${formatNumber(item.fat_g ?? 0)} g`} color="var(--macro-fat)" />
            <NutritionCell icon={Salad} label="Fiber" value={`${formatNumber(item.fiber_g ?? 0)} g`} color="var(--macro-fiber)" />
          </dl>
        </div>
      )}
    </li>
  )
}

function MacroPill({ icon: Icon, label, color }: { icon: typeof Flame; label: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-cream2 px-2 py-0.5 text-[11px] tabular-nums text-ink/70">
      <Icon className="size-2.5" style={{ color }} />
      {label}
    </span>
  )
}

function NutritionCell({ icon: Icon, label, value, color }: { icon: typeof Flame; label: string; value: string; color: string }) {
  return (
    <div className="flex flex-col gap-0.5 rounded-xl bg-card px-2.5 py-2">
      <div className="flex items-center gap-1">
        <Icon className="size-3" style={{ color }} />
        <dt className="text-[10px] font-medium uppercase tracking-wider text-fog">{label}</dt>
      </div>
      <dd className="text-sm font-semibold tabular-nums text-ink">{value}</dd>
    </div>
  )
}

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const diff = d.getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 * 3
}
