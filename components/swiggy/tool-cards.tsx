"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import {
  Check,
  X,
  ShoppingCart,
  Star,
  Clock,
  Leaf,
  Minus,
  Plus,
  Package,
  AlertTriangle,
  Truck,
} from "lucide-react"

// ─── Shared shell (matches ToolCardShell from chat-tool-cards.tsx) ─────────

function SwiggyCardShell({
  title,
  icon,
  children,
  variant = "active",
  accent = "orange",
}: {
  title: string
  icon: React.ReactNode
  children: React.ReactNode
  variant?: "active" | "resolved" | "cancelled"
  accent?: "orange" | "green"
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
      <div
        className={cn(
          "flex items-center gap-2 border-b border-border/60 px-4 py-2.5",
          accent === "orange" ? "bg-[#fc8019]/5" : "bg-primary/5",
        )}
      >
        <span className={accent === "orange" ? "text-[#fc8019]" : "text-primary"}>{icon}</span>
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

// ─── Macro bar helper ─────────────────────────────────────────────────────

function MacroBar({
  label,
  value,
  remaining,
  unit = "",
}: {
  label: string
  value: number
  remaining: number | null
  unit?: string
}) {
  const pct = remaining !== null && remaining > 0 ? Math.min(100, (value / (value + remaining)) * 100) : 0
  const isOver = remaining !== null && remaining < 0

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className="w-12 text-muted-foreground">{label}</span>
      <div className="flex-1 h-1.5 rounded-full bg-muted">
        <div
          className={cn("h-full rounded-full transition-all", isOver ? "bg-destructive" : "bg-primary")}
          style={{ width: `${Math.min(100, pct)}%` }}
        />
      </div>
      <span className={cn("w-16 text-right tabular-nums font-medium", isOver && "text-destructive")}>
        {Math.round(value)}
        {unit}
      </span>
    </div>
  )
}

// ─── Types ────────────────────────────────────────────────────────────────

export type SwiggyOrderItem = {
  name: string
  quantity: number
  price: number
  estimated_calories: number | null
  estimated_protein_g: number | null
  estimated_carbs_g: number | null
  estimated_fat_g: number | null
}

export type SwiggyOrderInput = {
  restaurant_name: string
  items: SwiggyOrderItem[]
  delivery_fee: number
  total_price: number
  estimated_eta: number | null
  order_nutrition: { calories: number; protein_g: number; carbs_g: number; fat_g: number }
  remaining_after_order: { calories: number; protein_g: number; carbs_g: number; fat_g: number } | null
}
export type SwiggyOrderOutput = { confirmed: boolean }

export type Restaurant = {
  id: string
  name: string
  cuisines: string[]
  rating: number | null
  eta_minutes: number | null
  is_veg: boolean
  price_for_two: number | null
}
export type RestaurantPickInput = { restaurants: Restaurant[]; prompt: string }
export type RestaurantPickOutput = { confirmed: boolean; selected_id: string | null; selected_name: string | null }

export type MenuItem = {
  id: string
  name: string
  price: number
  is_veg: boolean
  description: string | null
  estimated_calories: number | null
  estimated_protein_g: number | null
  estimated_carbs_g: number | null
  estimated_fat_g: number | null
}
export type MenuSelectionInput = { restaurant_name: string; restaurant_id: string; items: MenuItem[] }
export type MenuSelectionOutput = {
  confirmed: boolean
  selected_items: Array<{ id: string; name: string; quantity: number; price: number }> | null
}

export type RestockItem = {
  pantry_item_name: string
  pantry_quantity_left: number | null
  pantry_unit: string | null
  is_expired: boolean
  instamart_match: {
    product_id: string
    name: string
    price: number
    unit: string | null
    quantity: number | null
  } | null
}
export type PantryRestockInput = { restock_items: RestockItem[]; total_estimated_price: number }
export type PantryRestockOutput = {
  confirmed: boolean
  selected_products: Array<{ product_id: string; name: string; quantity: number }> | null
}

// ═══════════════════════════════════════════════════════════════════════════
//  ORDER REVIEW CARD
// ═══════════════════════════════════════════════════════════════════════════

export function SwiggyOrderReviewCard({
  input,
  output,
  onSubmit,
}: {
  input: SwiggyOrderInput
  output: SwiggyOrderOutput | null
  onSubmit: (output: SwiggyOrderOutput) => void
}) {
  const submittedRef = useRef(false)

  if (output) {
    return (
      <SwiggyCardShell
        title={`Order from ${input.restaurant_name}`}
        icon={<ShoppingCart className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed ? (
          <div className="space-y-2 text-sm">
            <p className="font-medium">
              {input.items.length} item(s) · ₹{input.total_price}
            </p>
            {input.estimated_eta && (
              <p className="text-muted-foreground flex items-center gap-1">
                <Clock className="size-3" /> ETA ~{input.estimated_eta} min
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Order cancelled.</p>
        )}
      </SwiggyCardShell>
    )
  }

  return (
    <SwiggyCardShell
      title={`Order from ${input.restaurant_name}`}
      icon={<ShoppingCart className="size-4" />}
    >
      <div className="space-y-4">
        {/* Items list */}
        <div className="space-y-2">
          {input.items.map((item, idx) => (
            <div key={idx} className="flex items-start justify-between gap-3 rounded-lg bg-muted/40 px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{item.name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {item.estimated_calories != null && `${Math.round(item.estimated_calories)} kcal`}
                  {item.estimated_protein_g != null && ` · ${Math.round(item.estimated_protein_g)}g P`}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold tabular-nums">₹{item.price}</p>
                <p className="text-[11px] text-muted-foreground">×{item.quantity}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Totals */}
        <div className="flex items-center justify-between border-t border-border/60 pt-3">
          <div className="text-xs text-muted-foreground space-y-0.5">
            {input.delivery_fee > 0 && <p>Delivery: ₹{input.delivery_fee}</p>}
            {input.estimated_eta && (
              <p className="flex items-center gap-1">
                <Clock className="size-3" /> ~{input.estimated_eta} min
              </p>
            )}
          </div>
          <p className="text-lg font-bold tabular-nums">₹{input.total_price}</p>
        </div>

        {/* Nutrition summary */}
        <div className="rounded-xl border border-border/60 bg-muted/20 p-3 space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nutrition Impact</p>
          <MacroBar label="Kcal" value={input.order_nutrition.calories} remaining={input.remaining_after_order?.calories ?? null} />
          <MacroBar label="Protein" value={input.order_nutrition.protein_g} remaining={input.remaining_after_order?.protein_g ?? null} unit="g" />
          <MacroBar label="Carbs" value={input.order_nutrition.carbs_g} remaining={input.remaining_after_order?.carbs_g ?? null} unit="g" />
          <MacroBar label="Fat" value={input.order_nutrition.fat_g} remaining={input.remaining_after_order?.fat_g ?? null} unit="g" />
          {input.remaining_after_order && Object.values(input.remaining_after_order).some((v) => v < 0) && (
            <p className="text-[11px] text-destructive flex items-center gap-1">
              <AlertTriangle className="size-3" /> This order exceeds your remaining daily targets
            </p>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: false })
            }}
          >
            <X className="mr-1 size-3" /> Cancel
          </Button>
          <Button
            size="sm"
            className="bg-[#fc8019] hover:bg-[#e07316] text-white"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: true })
            }}
          >
            <Check className="mr-1 size-3" /> Place Order
          </Button>
        </div>
      </div>
    </SwiggyCardShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  RESTAURANT PICKER CARD
// ═══════════════════════════════════════════════════════════════════════════

export function RestaurantPickerCard({
  input,
  output,
  onSubmit,
}: {
  input: RestaurantPickInput
  output: RestaurantPickOutput | null
  onSubmit: (output: RestaurantPickOutput) => void
}) {
  const submittedRef = useRef(false)

  if (output) {
    return (
      <SwiggyCardShell
        title={input.prompt}
        icon={<ShoppingCart className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed ? (
          <p className="text-sm font-medium">{output.selected_name}</p>
        ) : (
          <p className="text-sm text-muted-foreground">No restaurant selected.</p>
        )}
      </SwiggyCardShell>
    )
  }

  return (
    <SwiggyCardShell title={input.prompt} icon={<ShoppingCart className="size-4" />}>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {input.restaurants.map((r) => (
          <button
            key={r.id}
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: true, selected_id: r.id, selected_name: r.name })
            }}
            className="flex flex-col gap-1.5 rounded-xl border border-border bg-card p-3 text-left transition-all hover:border-[#fc8019]/40 hover:shadow-sm hover:-translate-y-0.5"
          >
            <div className="flex items-center gap-2">
              <p className="text-sm font-semibold truncate flex-1">{r.name}</p>
              {r.is_veg && (
                <span className="flex size-4 items-center justify-center rounded-sm border border-green-600">
                  <span className="size-2 rounded-full bg-green-600" />
                </span>
              )}
            </div>
            <p className="text-[11px] text-muted-foreground truncate">
              {r.cuisines.slice(0, 3).join(", ")}
            </p>
            <div className="flex items-center gap-3 text-[11px]">
              {r.rating != null && (
                <span className="flex items-center gap-0.5 font-medium text-[#fc8019]">
                  <Star className="size-3 fill-current" /> {r.rating.toFixed(1)}
                </span>
              )}
              {r.eta_minutes != null && (
                <span className="flex items-center gap-0.5 text-muted-foreground">
                  <Clock className="size-3" /> {r.eta_minutes} min
                </span>
              )}
              {r.price_for_two != null && (
                <span className="text-muted-foreground">₹{r.price_for_two} for two</span>
              )}
            </div>
          </button>
        ))}
      </div>
      <div className="flex justify-end pt-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => {
            if (submittedRef.current) return
            submittedRef.current = true
            onSubmit({ confirmed: false, selected_id: null, selected_name: null })
          }}
        >
          <X className="mr-1 size-3" /> Cancel
        </Button>
      </div>
    </SwiggyCardShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  MENU SELECTOR CARD
// ═══════════════════════════════════════════════════════════════════════════

export function MenuSelectorCard({
  input,
  output,
  onSubmit,
}: {
  input: MenuSelectionInput
  output: MenuSelectionOutput | null
  onSubmit: (output: MenuSelectionOutput) => void
}) {
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const submittedRef = useRef(false)

  const selectedItems = Object.entries(quantities)
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => {
      const item = input.items.find((i) => i.id === id)!
      return { id, name: item.name, quantity: qty, price: item.price * qty }
    })

  const total = selectedItems.reduce((s, i) => s + i.price, 0)

  if (output) {
    return (
      <SwiggyCardShell
        title={`Menu · ${input.restaurant_name}`}
        icon={<ShoppingCart className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
      >
        {output.confirmed && output.selected_items ? (
          <div className="space-y-1 text-sm">
            {output.selected_items.map((item) => (
              <div key={item.id} className="flex justify-between">
                <span>
                  {item.name} ×{item.quantity}
                </span>
                <span className="font-medium tabular-nums">₹{item.price}</span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">No items selected.</p>
        )}
      </SwiggyCardShell>
    )
  }

  return (
    <SwiggyCardShell
      title={`Menu · ${input.restaurant_name}`}
      icon={<ShoppingCart className="size-4" />}
    >
      <div className="space-y-2 max-h-[400px] overflow-y-auto pr-1">
        {input.items.map((item) => {
          const qty = quantities[item.id] ?? 0
          return (
            <div
              key={item.id}
              className={cn(
                "flex items-start gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                qty > 0 ? "border-[#fc8019]/30 bg-[#fc8019]/5" : "border-border bg-card",
              )}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  {item.is_veg ? (
                    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-green-600">
                      <span className="size-1.5 rounded-full bg-green-600" />
                    </span>
                  ) : (
                    <span className="flex size-3.5 shrink-0 items-center justify-center rounded-sm border border-red-600">
                      <span className="size-1.5 rounded-full bg-red-600" />
                    </span>
                  )}
                  <p className="text-sm font-medium truncate">{item.name}</p>
                </div>
                {item.description && (
                  <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{item.description}</p>
                )}
                <div className="flex items-center gap-2 mt-1 text-[11px] text-muted-foreground">
                  <span className="font-medium text-foreground">₹{item.price}</span>
                  {item.estimated_calories != null && <span>{Math.round(item.estimated_calories)} kcal</span>}
                  {item.estimated_protein_g != null && <span>{Math.round(item.estimated_protein_g)}g P</span>}
                </div>
              </div>
              {/* Quantity controls */}
              <div className="flex items-center gap-1.5 shrink-0">
                {qty > 0 && (
                  <>
                    <button
                      onClick={() => setQuantities((q) => ({ ...q, [item.id]: Math.max(0, (q[item.id] ?? 0) - 1) }))}
                      className="flex size-6 items-center justify-center rounded-md border border-border bg-card hover:bg-muted"
                    >
                      <Minus className="size-3" />
                    </button>
                    <span className="w-5 text-center text-xs font-semibold tabular-nums">{qty}</span>
                  </>
                )}
                <button
                  onClick={() => setQuantities((q) => ({ ...q, [item.id]: (q[item.id] ?? 0) + 1 }))}
                  className="flex size-6 items-center justify-center rounded-md border border-[#fc8019]/30 bg-[#fc8019]/10 text-[#fc8019] hover:bg-[#fc8019]/20"
                >
                  <Plus className="size-3" />
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-3">
        <div className="text-sm">
          {selectedItems.length > 0 ? (
            <span className="font-semibold tabular-nums">
              {selectedItems.length} item(s) · ₹{total}
            </span>
          ) : (
            <span className="text-muted-foreground">Select items to order</span>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: false, selected_items: null })
            }}
          >
            <X className="mr-1 size-3" /> Cancel
          </Button>
          <Button
            size="sm"
            disabled={selectedItems.length === 0}
            className="bg-[#fc8019] hover:bg-[#e07316] text-white"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: true, selected_items: selectedItems })
            }}
          >
            <Check className="mr-1 size-3" /> Add to Cart
          </Button>
        </div>
      </div>
    </SwiggyCardShell>
  )
}

// ═══════════════════════════════════════════════════════════════════════════
//  PANTRY RESTOCK CARD
// ═══════════════════════════════════════════════════════════════════════════

export function PantryRestockCard({
  input,
  output,
  onSubmit,
}: {
  input: PantryRestockInput
  output: PantryRestockOutput | null
  onSubmit: (output: PantryRestockOutput) => void
}) {
  const [selected, setSelected] = useState<Set<string>>(() => {
    const init = new Set<string>()
    for (const item of input.restock_items) {
      if (item.instamart_match) init.add(item.instamart_match.product_id)
    }
    return init
  })
  const submittedRef = useRef(false)

  const selectedProducts = input.restock_items
    .filter((i) => i.instamart_match && selected.has(i.instamart_match.product_id))
    .map((i) => ({
      product_id: i.instamart_match!.product_id,
      name: i.instamart_match!.name,
      quantity: 1,
    }))

  const totalPrice = input.restock_items
    .filter((i) => i.instamart_match && selected.has(i.instamart_match.product_id))
    .reduce((s, i) => s + (i.instamart_match?.price ?? 0), 0)

  if (output) {
    return (
      <SwiggyCardShell
        title="Pantry Restock"
        icon={<Package className="size-4" />}
        variant={output.confirmed ? "resolved" : "cancelled"}
        accent="green"
      >
        {output.confirmed && output.selected_products ? (
          <p className="text-sm">
            {output.selected_products.length} item(s) added to Instamart cart
          </p>
        ) : (
          <p className="text-sm text-muted-foreground">Restock cancelled.</p>
        )}
      </SwiggyCardShell>
    )
  }

  return (
    <SwiggyCardShell title="Pantry Restock" icon={<Package className="size-4" />} accent="green">
      <div className="space-y-2">
        {input.restock_items.map((item, idx) => {
          const match = item.instamart_match
          const isSelected = match && selected.has(match.product_id)

          return (
            <div
              key={idx}
              className={cn(
                "flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors",
                isSelected ? "border-primary/30 bg-primary/5" : "border-border bg-card",
              )}
            >
              {/* Pantry item info */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-sm font-medium truncate">{item.pantry_item_name}</p>
                  {item.is_expired && (
                    <Badge variant="destructive" className="text-[9px] px-1 py-0">
                      Expired
                    </Badge>
                  )}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {item.pantry_quantity_left != null
                    ? `${item.pantry_quantity_left}${item.pantry_unit ? ` ${item.pantry_unit}` : ""} left`
                    : "Out of stock"}
                </p>
              </div>

              {/* Instamart match */}
              {match ? (
                <div className="flex items-center gap-2 shrink-0">
                  <div className="text-right">
                    <p className="text-xs font-medium truncate max-w-[120px]">{match.name}</p>
                    <p className="text-[11px] font-semibold text-[#fc8019] tabular-nums">₹{match.price}</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelected((prev) => {
                        const next = new Set(prev)
                        if (next.has(match.product_id)) next.delete(match.product_id)
                        else next.add(match.product_id)
                        return next
                      })
                    }}
                    className={cn(
                      "flex size-6 items-center justify-center rounded-md border transition-colors",
                      isSelected
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-card hover:bg-muted",
                    )}
                  >
                    {isSelected && <Check className="size-3" />}
                  </button>
                </div>
              ) : (
                <span className="text-[11px] text-muted-foreground italic">No match found</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between pt-3 border-t border-border/60 mt-3">
        <p className="text-sm font-semibold tabular-nums">
          {selectedProducts.length} item(s) · ₹{totalPrice}
        </p>
        <div className="flex gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: false, selected_products: null })
            }}
          >
            <X className="mr-1 size-3" /> Skip
          </Button>
          <Button
            size="sm"
            disabled={selectedProducts.length === 0}
            className="bg-primary hover:bg-primary/90 text-primary-foreground"
            onClick={() => {
              if (submittedRef.current) return
              submittedRef.current = true
              onSubmit({ confirmed: true, selected_products: selectedProducts })
            }}
          >
            <Truck className="mr-1 size-3" /> Order on Instamart
          </Button>
        </div>
      </div>
    </SwiggyCardShell>
  )
}
