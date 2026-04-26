"use client"

import Image from "next/image"
import Link from "next/link"
import { useMemo, useState, useTransition } from "react"
import type { PantryItem } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Trash2, MessageCircle, AlertTriangle, ChevronDown, Flame, Drumstick, Wheat, Droplet, Salad, Package } from "lucide-react"
import { deletePantryItem } from "./actions"
import { toast } from "sonner"
import { formatDate, formatNumber } from "@/lib/format"
import { Empty, EmptyDescription, EmptyHeader, EmptyMedia, EmptyTitle } from "@/components/ui/empty"
import { CATEGORY_META, normalizeCategory, PANTRY_CATEGORIES, type PantryCategory } from "@/lib/categories"
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
      (c) => [c, (map.get(c) ?? []).sort((a, b) => a.name.localeCompare(b.name))] as const,
    )
  }, [items])

  if (items.length === 0) {
    return (
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Package className="size-5" aria-hidden />
          </EmptyMedia>
          <EmptyTitle>Your pantry is empty</EmptyTitle>
          <EmptyDescription>
            Tell NutriAI what you have in the kitchen and it&apos;ll tag each item with full nutrition for you.
          </EmptyDescription>
        </EmptyHeader>
        <Button asChild className="mt-4">
          <Link href="/chat">
            <MessageCircle className="mr-2 size-4" /> Add via chat
          </Link>
        </Button>
      </Empty>
    )
  }

  return (
    <div className="flex flex-col gap-6">
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
      className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay: `${index * 60}ms`, animationFillMode: "backwards" }}
    >
      <div className="relative flex items-center gap-3 px-4 py-3">
        <div className="absolute inset-0" aria-hidden>
          <Image
            src={meta.photo}
            alt=""
            fill
            sizes="(min-width: 768px) 720px, 100vw"
            className="object-cover opacity-70"
            aria-hidden
          />
          <div
            className="absolute inset-0"
            style={{
              background: `linear-gradient(90deg, color-mix(in oklab, ${meta.tint} 85%, var(--card)) 0%, color-mix(in oklab, ${meta.tint} 35%, var(--card)) 55%, var(--card) 100%)`,
            }}
          />
        </div>
        <div className="relative flex flex-1 items-center gap-3">
          <CategoryIcon category={category} size="md" className="shadow-sm" />
          <div>
            <h3 className="text-sm font-semibold">{meta.label}</h3>
            <p className="text-xs text-muted-foreground">
              {items.length} item{items.length === 1 ? "" : "s"}
            </p>
          </div>
        </div>
      </div>
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
      if (res && "ok" in res && res.ok === false) toast.error(res.error)
    })
  }
  const qty =
    item.quantity != null ? `${formatNumber(item.quantity, 2)}${item.unit ? ` ${item.unit}` : ""}` : null
  const expiring = isExpiringSoon(item.expires_on)
  const hasNutrition = item.calories_kcal != null

  // Calculate total nutrition from basis + quantity
  const mult = hasNutrition ? basisCount(item) : null
  const totalCalories = mult != null && item.calories_kcal != null ? item.calories_kcal * mult : null

  return (
    <li
      className="transition-colors animate-in fade-in duration-300"
      style={{ animationDelay: `${index * 30}ms`, animationFillMode: "backwards" }}
    >
      <div className="flex items-stretch gap-1 pr-2 transition-colors hover:bg-accent/20">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex flex-1 items-center gap-3 px-4 py-3 text-left"
          aria-expanded={expanded}
        >
          <CategoryIcon category={item.category} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium capitalize">{item.name}</p>
            <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-muted-foreground">
              {qty ? <span className="tabular-nums">{qty}</span> : null}
              {qty && item.expires_on ? <span className="text-muted-foreground/40">·</span> : null}
              {item.expires_on ? (
                <span
                  className={cn(
                    "inline-flex items-center gap-1",
                    expiring ? "text-[oklch(0.55_0.20_25)] font-medium" : "",
                  )}
                >
                  {expiring ? <AlertTriangle className="size-3" aria-hidden /> : null}
                  expires {formatDate(item.expires_on)}
                </span>
              ) : null}
              {totalCalories != null ? (
                <>
                  <span className="text-muted-foreground/40">·</span>
                  <span className="tabular-nums font-medium text-foreground/70">
                    {formatNumber(totalCalories)} kcal total
                  </span>
                </>
              ) : null}
            </div>
            {hasNutrition ? (
              <div className="mt-1.5 flex flex-wrap gap-1">
                <MacroPill icon={Flame} label={`${formatNumber(item.calories_kcal ?? 0)} kcal`} tint="oklch(0.72 0.18 40)" />
                <MacroPill icon={Drumstick} label={`P ${formatNumber(item.protein_g ?? 0)}g`} tint="oklch(0.70 0.17 20)" />
                <MacroPill icon={Wheat} label={`C ${formatNumber(item.carbs_g ?? 0)}g`} tint="oklch(0.82 0.13 80)" />
                <MacroPill icon={Droplet} label={`F ${formatNumber(item.fat_g ?? 0)}g`} tint="oklch(0.78 0.13 60)" />
              </div>
            ) : (
              <p className="mt-1 text-[11px] italic text-muted-foreground/70">
                No nutrition info — ask NutriAI to fill it in.
              </p>
            )}
          </div>
          <ChevronDown
            className={cn("size-4 shrink-0 text-muted-foreground transition-transform", expanded && "rotate-180")}
            aria-hidden
          />
        </button>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Remove ${item.name}`}
          disabled={pending}
          onClick={onDelete}
          className="my-auto text-muted-foreground hover:text-destructive"
        >
          <Trash2 className="size-4" />
        </Button>
      </div>

      {expanded && hasNutrition ? (
        <div className="border-t border-dashed border-border/60 bg-muted/30 px-4 py-3 text-xs">
          <div className="mb-2 flex items-center gap-2">
            <Badge variant="outline" className="font-normal">
              {describeBasis(item)}
            </Badge>
            {mult != null ? (
              <span className="text-muted-foreground">
                × {formatNumber(mult, 2)} {pluralBasisLabel(item.nutrition_basis, mult)}
              </span>
            ) : (
              <span className="text-muted-foreground">
                Totals need a unit like g / ml / pcs to be calculated.
              </span>
            )}
          </div>
          <dl className="grid grid-cols-2 gap-2 sm:grid-cols-5">
            <NutritionCell icon={Flame} label="Calories" value={`${formatNumber(item.calories_kcal ?? 0)} kcal`} tint="oklch(0.72 0.18 40)" />
            <NutritionCell icon={Drumstick} label="Protein" value={`${formatNumber(item.protein_g ?? 0)} g`} tint="oklch(0.70 0.17 20)" />
            <NutritionCell icon={Wheat} label="Carbs" value={`${formatNumber(item.carbs_g ?? 0)} g`} tint="oklch(0.82 0.13 80)" />
            <NutritionCell icon={Droplet} label="Fat" value={`${formatNumber(item.fat_g ?? 0)} g`} tint="oklch(0.78 0.13 60)" />
            <NutritionCell icon={Salad} label="Fiber" value={`${formatNumber(item.fiber_g ?? 0)} g`} tint="oklch(0.78 0.16 140)" />
          </dl>
        </div>
      ) : null}
    </li>
  )
}

function MacroPill({ icon: Icon, label, tint }: { icon: typeof Flame; label: string; tint: string }) {
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full bg-muted/60 px-2 py-0.5 text-[11px] tabular-nums text-foreground/80"
    >
      <Icon className="size-2.5" style={{ color: tint }} aria-hidden />
      {label}
    </span>
  )
}

function NutritionCell({
  icon: Icon,
  label,
  value,
  tint,
}: {
  icon: typeof Flame
  label: string
  value: string
  tint: string
}) {
  return (
    <div className="flex flex-col gap-0.5 rounded-lg bg-background/70 px-2.5 py-2">
      <div className="flex items-center gap-1">
        <Icon className="size-3" style={{ color: tint }} aria-hidden />
        <dt className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</dt>
      </div>
      <dd className="text-sm font-semibold tabular-nums">{value}</dd>
    </div>
  )
}

function pluralBasisLabel(basis: PantryItem["nutrition_basis"], n: number): string {
  switch (basis) {
    case "per_100g":
      return "× 100 g"
    case "per_100ml":
      return "× 100 ml"
    case "per_piece":
      return n === 1 ? "piece" : "pieces"
    case "per_serving":
      return n === 1 ? "serving" : "servings"
    default:
      return ""
  }
}

function isExpiringSoon(date: string | null): boolean {
  if (!date) return false
  const d = new Date(date)
  const diff = d.getTime() - Date.now()
  return diff < 1000 * 60 * 60 * 24 * 3
}
