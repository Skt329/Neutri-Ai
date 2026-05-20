"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, X, Plus, Trash2, ClipboardCheck } from "lucide-react"
import { MEAL_TYPE_META, MEAL_TYPES, type MealType } from "@/lib/categories"
import { MealTypeIcon } from "@/components/category-icon"
import { ToolCardShell, MacroInput } from "./tool-card-shared"

// ─── Types ────────────────────────────────────────────────────────────────

export type ProposeMealInput = {
  description: string
  meal_type: MealType
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  items: { name: string; quantity: string | null }[]
  notes: string | null
}
export type ProposeMealOutput = { confirmed: boolean; meal: ProposeMealInput | null }

// ─── MealSummary (resolved state) ─────────────────────────────────────────

function MealSummary({ meal }: { meal: ProposeMealInput }) {
  return (
    <div className="flex items-start gap-3">
      <MealTypeIcon type={meal.meal_type} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {MEAL_TYPE_META[meal.meal_type].label}
        </p>
        <p className="mt-0.5 text-sm font-semibold break-words">{meal.description}</p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {Math.round(meal.calories)} kcal · P {Math.round(meal.protein_g)}g · C {Math.round(meal.carbs_g)}g · F{" "}
          {Math.round(meal.fat_g)}g
        </p>
      </div>
    </div>
  )
}

// ─── Component ────────────────────────────────────────────────────────────

export function ProposeMealCard({
  input,
  output,
  onSubmit,
}: {
  input: ProposeMealInput
  output: ProposeMealOutput | null
  onSubmit: (output: ProposeMealOutput) => void
}) {
  const [draft, setDraft] = useState<ProposeMealInput>(() => ({ ...input, items: [...input.items] }))
  const [editing, setEditing] = useState(false)
  const submittedRef = useRef(false)

  if (output) {
    const meal = output.meal ?? input
    return (
      <ToolCardShell
        title="Meal"
        icon={<ClipboardCheck className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        <MealSummary meal={meal} />
        {!output.confirmed ? (
          <p className="mt-2 text-xs text-muted-foreground">You cancelled this meal.</p>
        ) : null}
      </ToolCardShell>
    )
  }

  function updateItem(i: number, patch: Partial<{ name: string; quantity: string | null }>) {
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, idx) => (idx === i ? { ...it, ...patch } : it)),
    }))
  }
  function addItem() {
    setDraft((d) => ({ ...d, items: [...d.items, { name: "", quantity: null }] }))
  }
  function removeItem(i: number) {
    setDraft((d) => ({ ...d, items: d.items.filter((_, idx) => idx !== i) }))
  }

  return (
    <ToolCardShell title="Review meal" icon={<ClipboardCheck className="size-4" />}>
      <div className="flex items-start gap-3">
        <MealTypeIcon type={draft.meal_type} size="lg" />
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <Select
              value={draft.meal_type}
              onValueChange={(v) => setDraft((d) => ({ ...d, meal_type: v as MealType }))}
            >
              <SelectTrigger className="h-8 w-auto gap-1 border-none bg-transparent px-2 text-xs font-medium uppercase tracking-wide text-muted-foreground shadow-none hover:bg-accent">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {MEAL_TYPES.map((m) => (
                  <SelectItem key={m} value={m}>
                    {MEAL_TYPE_META[m].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {editing ? (
            <Input
              value={draft.description}
              onChange={(e) => setDraft((d) => ({ ...d, description: e.target.value }))}
              className="mt-1 font-semibold"
            />
          ) : (
            <p className="mt-1 text-base font-semibold break-words">{draft.description}</p>
          )}
          {draft.notes ? <p className="mt-1 text-xs text-muted-foreground break-words">{draft.notes}</p> : null}
        </div>
      </div>

      {/* Macros */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(["calories", "protein_g", "carbs_g", "fat_g"] as const).map((k) => (
          <MacroInput
            key={k}
            label={
              k === "calories"
                ? "kcal"
                : k === "protein_g"
                  ? "Protein"
                  : k === "carbs_g"
                    ? "Carbs"
                    : "Fat"
            }
            value={draft[k]}
            onChange={(v) => setDraft((d) => ({ ...d, [k]: v }))}
          />
        ))}
      </div>

      {/* Items */}
      <div className="mt-4 flex flex-col gap-2">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Items</p>
        {draft.items.length === 0 ? (
          <p className="text-xs text-muted-foreground">No individual items — macros apply to the whole meal.</p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {draft.items.map((it, i) => (
              <li key={i} className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <Input
                  value={it.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder="Item"
                  className="h-8 flex-1 min-w-0"
                />
                <Input
                  value={it.quantity ?? ""}
                  onChange={(e) => updateItem(i, { quantity: e.target.value || null })}
                  placeholder="qty"
                  className="h-8 w-full sm:w-24"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-8 text-muted-foreground hover:text-destructive"
                  onClick={() => removeItem(i)}
                  aria-label="Remove item"
                >
                  <Trash2 className="size-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Button type="button" variant="ghost" size="sm" className="h-8 w-fit text-xs" onClick={addItem}>
          <Plus className="mr-1 size-3.5" /> Add item
        </Button>
      </div>

      <div className="mt-4 flex items-center justify-end gap-2">
        <Button variant="ghost" size="sm" disabled={submittedRef.current} onClick={() => setEditing((e) => !e)}>
          {editing ? "Done editing" : "Edit name"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={submittedRef.current}
          onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: false, meal: null }) }}
        >
          <X className="mr-1.5 size-4" /> Cancel
        </Button>
        <Button size="sm" disabled={submittedRef.current} onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: true, meal: draft }) }}>
          <Check className="mr-1.5 size-4" /> Log meal
        </Button>
      </div>
    </ToolCardShell>
  )
}
