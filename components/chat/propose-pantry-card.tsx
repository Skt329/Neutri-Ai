"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { X, Trash2, Sparkles, Package, Flame, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  CATEGORY_META,
  PANTRY_CATEGORIES,
  type PantryCategory,
} from "@/lib/categories"
import { CategoryIcon } from "@/components/category-icon"
import { ToolCardShell, MacroInputMini, formatBasisLabel } from "./tool-card-shared"

// ─── Types ────────────────────────────────────────────────────────────────

export type NutritionBasis = "per_100g" | "per_100ml" | "per_piece" | "per_serving"

export type ProposePantryItem = {
  name: string
  quantity: number | null
  unit: string | null
  category: PantryCategory
  expires_on: string | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  nutrition_basis: NutritionBasis | null
}
export type ProposePantryInput = { items: ProposePantryItem[] }
export type ProposePantryOutput = { confirmed: boolean; items: ProposePantryItem[] | null }

// ─── PantryDraftRow ───────────────────────────────────────────────────────

function PantryDraftRow({
  item,
  onPatch,
  onRemove,
}: {
  item: ProposePantryItem
  onPatch: (patch: Partial<ProposePantryItem>) => void
  onRemove: () => void
}) {
  const [showNutrition, setShowNutrition] = useState(false)
  const hasNutrition = item.calories_kcal != null
  return (
    <li className="flex flex-col gap-2 rounded-lg border border-border/60 bg-background/60 p-2.5">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="flex flex-1 items-center gap-2">
          <CategoryIcon category={item.category} size="sm" />
          <Input
            value={item.name}
            onChange={(e) => onPatch({ name: e.target.value })}
            placeholder="Item name"
            className="h-8 flex-1 capitalize"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={item.quantity ?? ""}
            onChange={(e) => onPatch({ quantity: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="qty"
            className="h-8 w-16 sm:w-20"
          />
          <Input
            value={item.unit ?? ""}
            onChange={(e) => onPatch({ unit: e.target.value || null })}
            placeholder="unit"
            className="h-8 w-16 sm:w-20"
          />
          <Select value={item.category} onValueChange={(v) => onPatch({ category: v as PantryCategory })}>
            <SelectTrigger className="h-8 w-full sm:w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PANTRY_CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {CATEGORY_META[c].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="size-8 text-muted-foreground hover:text-destructive"
            onClick={onRemove}
            aria-label="Remove"
          >
            <Trash2 className="size-3.5" />
          </Button>
        </div>
      </div>

      {/* Nutrition strip */}
      <button
        type="button"
        onClick={() => setShowNutrition((v) => !v)}
        className="flex items-center gap-2 text-left text-[11px] text-muted-foreground hover:text-foreground"
        aria-expanded={showNutrition}
      >
        <Flame className="size-3" aria-hidden />
        {hasNutrition ? (
          <span className="tabular-nums">
            {formatBasisLabel(item.nutrition_basis)}: {Math.round(item.calories_kcal ?? 0)} kcal · P{" "}
            {Math.round(item.protein_g ?? 0)}g · C {Math.round(item.carbs_g ?? 0)}g · F{" "}
            {Math.round(item.fat_g ?? 0)}g
          </span>
        ) : (
          <span>Add nutrition</span>
        )}
        <ChevronDown className={cn("size-3 transition-transform", showNutrition && "rotate-180")} aria-hidden />
      </button>

      {showNutrition ? (
        <div className="flex flex-col gap-2 rounded-md bg-muted/40 p-2">
          <div className="flex items-center gap-2">
            <span className="w-14 text-[10px] uppercase tracking-wider text-muted-foreground">Basis</span>
            <Select
              value={item.nutrition_basis ?? "per_100g"}
              onValueChange={(v) => onPatch({ nutrition_basis: v as NutritionBasis })}
            >
              <SelectTrigger className="h-7 w-full text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="per_100g">per 100 g</SelectItem>
                <SelectItem value="per_100ml">per 100 ml</SelectItem>
                <SelectItem value="per_piece">per piece</SelectItem>
                <SelectItem value="per_serving">per serving</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 gap-1.5 sm:grid-cols-5">
            <MacroInputMini
              label="kcal"
              value={item.calories_kcal}
              onChange={(v) => onPatch({ calories_kcal: v })}
            />
            <MacroInputMini label="P g" value={item.protein_g} onChange={(v) => onPatch({ protein_g: v })} />
            <MacroInputMini label="C g" value={item.carbs_g} onChange={(v) => onPatch({ carbs_g: v })} />
            <MacroInputMini label="F g" value={item.fat_g} onChange={(v) => onPatch({ fat_g: v })} />
            <MacroInputMini label="Fib g" value={item.fiber_g} onChange={(v) => onPatch({ fiber_g: v })} />
          </div>
        </div>
      ) : null}
    </li>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export function ProposePantryCard({
  input,
  output,
  onSubmit,
}: {
  input: ProposePantryInput
  output: ProposePantryOutput | null
  onSubmit: (output: ProposePantryOutput) => void
}) {
  const [items, setItems] = useState<ProposePantryInput["items"]>(() => input.items.map((it) => ({ ...it })))
  const submittedRef = useRef(false)

  if (output) {
    return (
      <ToolCardShell
        title={output.confirmed ? "Added to pantry" : "Pantry update cancelled"}
        icon={<Package className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed ? (
          <ul className="flex flex-col gap-2">
            {(output.items ?? input.items).map((it, i) => (
              <li key={i} className="flex flex-col gap-1 rounded-md bg-muted/40 px-2.5 py-2">
                <div className="flex items-center gap-2 text-sm">
                  <CategoryIcon category={it.category} size="sm" />
                  <span className="flex-1 truncate capitalize">{it.name}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {it.quantity != null ? `${it.quantity}${it.unit ? ` ${it.unit}` : ""}` : ""}
                  </span>
                  <Badge variant="outline" className="capitalize">
                    {CATEGORY_META[it.category].label}
                  </Badge>
                </div>
                {it.calories_kcal != null ? (
                  <p className="pl-7 text-[11px] tabular-nums text-muted-foreground">
                    {formatBasisLabel(it.nutrition_basis)}: {Math.round(it.calories_kcal)} kcal · P{" "}
                    {Math.round(it.protein_g ?? 0)}g · C {Math.round(it.carbs_g ?? 0)}g · F{" "}
                    {Math.round(it.fat_g ?? 0)}g
                  </p>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-muted-foreground">Nothing was saved.</p>
        )}
      </ToolCardShell>
    )
  }

  function updateItem(i: number, patch: Partial<ProposePantryInput["items"][number]>) {
    setItems((list) => list.map((it, idx) => (idx === i ? { ...it, ...patch } : it)))
  }
  function removeItem(i: number) {
    setItems((list) => list.filter((_, idx) => idx !== i))
  }

  return (
    <ToolCardShell title="Review pantry additions" icon={<Package className="size-4" />}>
      <ul className="flex flex-col gap-3">
        {items.map((it, i) => (
          <PantryDraftRow
            key={i}
            item={it}
            onPatch={(patch) => updateItem(i, patch)}
            onRemove={() => removeItem(i)}
          />
        ))}
      </ul>
      <div className="mt-4 flex items-center justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          disabled={submittedRef.current}
          onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: false, items: null }) }}
        >
          <X className="mr-1.5 size-4" /> Cancel
        </Button>
        <Button
          size="sm"
          disabled={items.length === 0 || items.some((i) => !i.name.trim()) || submittedRef.current}
          onClick={() => {
            if (submittedRef.current) return
            submittedRef.current = true
            onSubmit({
              confirmed: true,
              items: items.map((it) => ({ ...it, name: it.name.trim() })),
            })
          }}
        >
          <Sparkles className="mr-1.5 size-4" /> Add {items.length} item{items.length === 1 ? "" : "s"}
        </Button>
      </div>
    </ToolCardShell>
  )
}
