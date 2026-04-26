"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Check,
  X,
  Plus,
  Trash2,
  Sparkles,
  ClipboardCheck,
  Package,
  HelpCircle,
  ListChecks,
  ChevronDown,
  Flame,
} from "lucide-react"
import {
  CATEGORY_META,
  MEAL_TYPE_META,
  MEAL_TYPES,
  PANTRY_CATEGORIES,
  type MealType,
  type PantryCategory,
} from "@/lib/categories"
import { CategoryIcon, MealTypeIcon } from "@/components/category-icon"

// ─── Shared types (mirror tool schemas in lib/ai/tools.ts) ────────────────

export type AskUserField = {
  name: string
  label: string
  type: "text" | "number" | "select" | "date"
  options: string[] | null
  placeholder: string | null
  defaultValue: string | null
}
export type AskUserInput = { prompt: string; fields: AskUserField[] }
export type AskUserOutput = { confirmed: boolean; values: Record<string, string | number> }

export type ChooseOptionInput = { prompt: string; options: string[]; multi: boolean }
export type ChooseOptionOutput = { confirmed: boolean; selected: string[] }

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

// ─── Shared shells ────────────────────────────────────────────────────────

function ToolCardShell({
  title,
  icon,
  children,
  variant = "active",
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  variant?: "active" | "resolved" | "cancelled"
}) {
  return (
    <div
      className={cn(
        "w-full max-w-[85ch] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm",
        "animate-in fade-in slide-in-from-bottom-1 duration-300",
        variant === "resolved" && "border-primary/30",
        variant === "cancelled" && "border-muted opacity-80",
        variant === "active" && "border-border",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <span className="text-primary">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
        {variant === "resolved" ? (
          <Badge variant="secondary" className="ml-auto gap-1">
            <Check className="size-3" /> Confirmed
          </Badge>
        ) : variant === "cancelled" ? (
          <Badge variant="outline" className="ml-auto gap-1 text-muted-foreground">
            <X className="size-3" /> Cancelled
          </Badge>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

// ─── AskUser card ─────────────────────────────────────────────────────────

export function AskUserCard({
  input,
  output,
  onSubmit,
}: {
  input: AskUserInput
  output: AskUserOutput | null
  onSubmit: (output: AskUserOutput) => void
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const init: Record<string, string> = {}
    for (const f of input.fields) init[f.name] = f.defaultValue ?? ""
    return init
  })

  if (output) {
    return (
      <ToolCardShell
        title={input.prompt}
        icon={<HelpCircle className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed ? (
          <div className="grid grid-cols-1 gap-2 text-sm sm:grid-cols-2">
            {input.fields.map((f) => (
              <div key={f.name} className="flex items-baseline justify-between gap-3 rounded-md bg-muted/40 px-3 py-2">
                <span className="text-muted-foreground">{f.label}</span>
                <span className="font-medium">{String(output.values[f.name] ?? "—")}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">You dismissed this question.</p>
        )}
      </ToolCardShell>
    )
  }

  function submit(e: React.FormEvent) {
    e.preventDefault()
    const out: Record<string, string | number> = {}
    for (const f of input.fields) {
      const raw = (values[f.name] ?? "").trim()
      if (!raw) continue
      out[f.name] = f.type === "number" ? Number(raw) : raw
    }
    onSubmit({ confirmed: true, values: out })
  }

  return (
    <ToolCardShell title={input.prompt} icon={<HelpCircle className="size-4" />}>
      <form onSubmit={submit} className="flex flex-col gap-3">
        {input.fields.map((f) => (
          <div key={f.name} className="flex flex-col gap-1.5">
            <Label htmlFor={`ask-${f.name}`} className="text-xs">
              {f.label}
            </Label>
            {f.type === "select" && f.options ? (
              <Select
                value={values[f.name]}
                onValueChange={(v) => setValues((p) => ({ ...p, [f.name]: v }))}
              >
                <SelectTrigger id={`ask-${f.name}`}>
                  <SelectValue placeholder={f.placeholder ?? "Select"} />
                </SelectTrigger>
                <SelectContent>
                  {f.options.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id={`ask-${f.name}`}
                type={f.type === "number" ? "number" : f.type === "date" ? "date" : "text"}
                inputMode={f.type === "number" ? "decimal" : undefined}
                value={values[f.name]}
                onChange={(e) => setValues((p) => ({ ...p, [f.name]: e.target.value }))}
                placeholder={f.placeholder ?? ""}
                step={f.type === "number" ? "any" : undefined}
              />
            )}
          </div>
        ))}
        <div className="mt-2 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => onSubmit({ confirmed: false, values: {} })}
          >
            Skip
          </Button>
          <Button type="submit" size="sm">
            <Check className="mr-1.5 size-4" /> Send
          </Button>
        </div>
      </form>
    </ToolCardShell>
  )
}

// ─── ChooseOption card ────────────────────────────────────────────────────

export function ChooseOptionCard({
  input,
  output,
  onSubmit,
}: {
  input: ChooseOptionInput
  output: ChooseOptionOutput | null
  onSubmit: (output: ChooseOptionOutput) => void
}) {
  const [selected, setSelected] = useState<string[]>([])

  if (output) {
    return (
      <ToolCardShell
        title={input.prompt}
        icon={<ListChecks className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed ? (
          <div className="flex flex-wrap gap-1.5">
            {output.selected.map((s) => (
              <Badge key={s} variant="secondary">
                {s}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Dismissed.</p>
        )}
      </ToolCardShell>
    )
  }

  function toggle(o: string) {
    if (input.multi) {
      setSelected((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
    } else {
      onSubmit({ confirmed: true, selected: [o] })
    }
  }

  return (
    <ToolCardShell title={input.prompt} icon={<ListChecks className="size-4" />}>
      <div className="flex flex-wrap gap-2">
        {input.options.map((o) => {
          const active = selected.includes(o)
          return (
            <button
              key={o}
              type="button"
              onClick={() => toggle(o)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors",
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-background hover:bg-accent hover:text-accent-foreground",
              )}
            >
              {active ? <Check className="size-3.5" /> : null}
              {o}
            </button>
          )
        })}
      </div>
      {input.multi ? (
        <div className="mt-3 flex items-center justify-end gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSubmit({ confirmed: false, selected: [] })}
          >
            Skip
          </Button>
          <Button
            size="sm"
            disabled={selected.length === 0}
            onClick={() => onSubmit({ confirmed: true, selected })}
          >
            <Check className="mr-1.5 size-4" /> Send ({selected.length})
          </Button>
        </div>
      ) : null}
    </ToolCardShell>
  )
}

// ─── ProposeMealLog card ──────────────────────────────────────────────────

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
            <p className="mt-1 text-base font-semibold">{draft.description}</p>
          )}
          {draft.notes ? <p className="mt-1 text-xs text-muted-foreground">{draft.notes}</p> : null}
        </div>
      </div>

      {/* Macros */}
      <div className="mt-4 grid grid-cols-4 gap-2">
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
              <li key={i} className="flex items-center gap-2">
                <Input
                  value={it.name}
                  onChange={(e) => updateItem(i, { name: e.target.value })}
                  placeholder="Item"
                  className="h-8 flex-1"
                />
                <Input
                  value={it.quantity ?? ""}
                  onChange={(e) => updateItem(i, { quantity: e.target.value || null })}
                  placeholder="qty"
                  className="h-8 w-24"
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
        <Button variant="ghost" size="sm" onClick={() => setEditing((e) => !e)}>
          {editing ? "Done editing" : "Edit name"}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => onSubmit({ confirmed: false, meal: null })}
        >
          <X className="mr-1.5 size-4" /> Cancel
        </Button>
        <Button size="sm" onClick={() => onSubmit({ confirmed: true, meal: draft })}>
          <Check className="mr-1.5 size-4" /> Log meal
        </Button>
      </div>
    </ToolCardShell>
  )
}

function MacroInput({
  label,
  value,
  onChange,
}: {
  label: string
  value: number
  onChange: (v: number) => void
}) {
  return (
    <label className="flex flex-col items-center gap-1 rounded-lg border border-border bg-background px-2 py-1.5">
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value}
        onChange={(e) => onChange(Number(e.target.value) || 0)}
        className="w-full bg-transparent text-center text-sm font-semibold tabular-nums outline-none"
        aria-label={label}
      />
      <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </label>
  )
}

function MealSummary({ meal }: { meal: ProposeMealInput }) {
  return (
    <div className="flex items-start gap-3">
      <MealTypeIcon type={meal.meal_type} size="lg" />
      <div className="min-w-0 flex-1">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">
          {MEAL_TYPE_META[meal.meal_type].label}
        </p>
        <p className="mt-0.5 text-sm font-semibold">{meal.description}</p>
        <p className="mt-1 text-xs text-muted-foreground tabular-nums">
          {Math.round(meal.calories)} kcal · P {Math.round(meal.protein_g)}g · C {Math.round(meal.carbs_g)}g · F{" "}
          {Math.round(meal.fat_g)}g
        </p>
      </div>
    </div>
  )
}

// ─── ProposePantryItems card ──────────────────────────────────────────────

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

  if (output) {
    return (
      <ToolCardShell
        title={output.confirmed ? "Added to pantry" : "Pantry update cancelled"}
        icon={<Package className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed && output.items ? (
          <ul className="flex flex-col gap-2">
            {output.items.map((it, i) => (
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
          onClick={() => onSubmit({ confirmed: false, items: null })}
        >
          <X className="mr-1.5 size-4" /> Cancel
        </Button>
        <Button
          size="sm"
          disabled={items.length === 0 || items.some((i) => !i.name.trim())}
          onClick={() =>
            onSubmit({
              confirmed: true,
              items: items.map((it) => ({ ...it, name: it.name.trim() })),
            })
          }
        >
          <Sparkles className="mr-1.5 size-4" /> Add {items.length} item{items.length === 1 ? "" : "s"}
        </Button>
      </div>
    </ToolCardShell>
  )
}

// ─── PantryDraftRow (editor for a single proposed pantry item) ────────────

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
        <div className="flex items-center gap-2">
          <Input
            type="number"
            inputMode="decimal"
            step="any"
            value={item.quantity ?? ""}
            onChange={(e) => onPatch({ quantity: e.target.value === "" ? null : Number(e.target.value) })}
            placeholder="qty"
            className="h-8 w-20"
          />
          <Input
            value={item.unit ?? ""}
            onChange={(e) => onPatch({ unit: e.target.value || null })}
            placeholder="unit"
            className="h-8 w-20"
          />
          <Select value={item.category} onValueChange={(v) => onPatch({ category: v as PantryCategory })}>
            <SelectTrigger className="h-8 w-32">
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
          <div className="grid grid-cols-5 gap-1.5">
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

function MacroInputMini({
  label,
  value,
  onChange,
}: {
  label: string
  value: number | null
  onChange: (v: number | null) => void
}) {
  return (
    <label className="flex flex-col items-center gap-0.5 rounded-md border border-border bg-background px-1.5 py-1">
      <input
        type="number"
        inputMode="decimal"
        step="any"
        value={value ?? ""}
        onChange={(e) => onChange(e.target.value === "" ? null : Number(e.target.value))}
        className="w-full bg-transparent text-center text-xs font-semibold tabular-nums outline-none"
        aria-label={label}
      />
      <span className="text-[9px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
    </label>
  )
}

function formatBasisLabel(basis: NutritionBasis | null): string {
  switch (basis) {
    case "per_100ml":
      return "per 100 ml"
    case "per_piece":
      return "per piece"
    case "per_serving":
      return "per serving"
    case "per_100g":
    default:
      return "per 100 g"
  }
}

// textarea unused — kept export minimal
export { Textarea }
