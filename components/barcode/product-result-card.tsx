"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Spinner } from "@/components/ui/spinner"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Check, ScanBarcode, AlertCircle, Flame, Drumstick, Wheat, Droplet, Salad, PackagePlus } from "lucide-react"
import { PANTRY_CATEGORIES, CATEGORY_META, normalizeCategory, type PantryCategory } from "@/lib/categories"
import { cn } from "@/lib/utils"
import type { NutritionLookupResult } from "@/lib/nutrition/types"

export interface ProductResult {
  found: boolean
  product?: {
    name: string
    brand?: string
    barcode: string
    nutrition: NutritionLookupResult
  }
}

interface ProductResultCardProps {
  result: ProductResult
  onAddToPantry: (data: PantryAddData) => Promise<void>
  onScanAnother: () => void
  adding?: boolean
  added?: boolean
}

export interface PantryAddData {
  name: string
  quantity: number
  unit: string
  category: PantryCategory
  barcode: string
  calories_kcal: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  nutrition_basis: string
}

// Infer category from product name
function inferCategory(name: string): PantryCategory {
  const lower = name.toLowerCase()
  if (/milk|curd|yogurt|cheese|paneer|butter|ghee|cream/.test(lower)) return "dairy"
  if (/chicken|egg|fish|mutton|prawn|tofu|lentil|dal/.test(lower)) return "protein"
  if (/rice|bread|atta|flour|oats|wheat|roti|noodle|pasta/.test(lower)) return "grain"
  if (/tomato|potato|onion|spinach|carrot|pepper|broccoli/.test(lower)) return "vegetable"
  if (/apple|banana|mango|orange|grape|berry/.test(lower)) return "fruit"
  if (/oil|olive/.test(lower)) return "oil"
  if (/salt|pepper|turmeric|cumin|spice|masala/.test(lower)) return "spice"
  if (/water|juice|tea|coffee|soda|cola|drink/.test(lower)) return "beverage"
  if (/chips|biscuit|cookie|chocolate|candy|snack/.test(lower)) return "snack"
  return "other"
}

export function ProductResultCard({
  result,
  onAddToPantry,
  onScanAnother,
  adding = false,
  added = false,
}: ProductResultCardProps) {
  const product = result.product
  const nutrition = product?.nutrition

  const [name, setName] = useState(product?.name ?? "")
  const [quantity, setQuantity] = useState(1)
  const [unit, setUnit] = useState("pcs")
  const [category, setCategory] = useState<PantryCategory>(
    product ? inferCategory(product.name) : "other",
  )

  if (!result.found || !product || !nutrition) {
    return (
      <div className="rounded-2xl border border-clay/30 bg-clay/5 p-6 text-center animate-fade-in">
        <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-clay/10 text-clay mb-3">
          <AlertCircle className="size-5" />
        </div>
        <h3 className="font-semibold text-ink">Product not found</h3>
        <p className="text-sm text-stone mt-1 mb-4">
          This barcode isn't in our database. Try scanning another product or add items via chat.
        </p>
        <Button onClick={onScanAnother} className="bg-forest hover:bg-sage text-white rounded-full">
          <ScanBarcode className="mr-1.5 size-4" /> Scan another
        </Button>
      </div>
    )
  }

  async function handleAdd() {
    await onAddToPantry({
      name,
      quantity,
      unit,
      category,
      barcode: product!.barcode,
      calories_kcal: nutrition!.calories_kcal,
      protein_g: nutrition!.protein_g,
      carbs_g: nutrition!.carbs_g,
      fat_g: nutrition!.fat_g,
      fiber_g: nutrition!.fiber_g,
      nutrition_basis: "per_100g",
    })
  }

  if (added) {
    return (
      <div className="rounded-2xl border border-sage/30 bg-mint/10 p-6 text-center animate-fade-in">
        <div className="flex size-12 mx-auto items-center justify-center rounded-full bg-sage/20 text-sage mb-3">
          <Check className="size-5" />
        </div>
        <h3 className="font-semibold text-ink">Added to pantry!</h3>
        <p className="text-sm text-stone mt-1 mb-4">
          <strong>{name}</strong> has been added to your pantry.
        </p>
        <Button onClick={onScanAnother} className="bg-forest hover:bg-sage text-white rounded-full">
          <ScanBarcode className="mr-1.5 size-4" /> Scan another
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden animate-slide-up">
      {/* Product header */}
      <div className="px-5 pt-5 pb-4 border-b border-border">
        <div className="flex items-start gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-mint2 text-sage">
            <PackagePlus className="size-5" />
          </div>
          <div className="min-w-0 flex-1">
            <h3 className="font-semibold text-ink text-lg leading-tight">{product.name}</h3>
            {product.brand && (
              <p className="text-sm text-stone mt-0.5">{product.brand}</p>
            )}
            <div className="flex items-center gap-2 mt-1.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-cream2 px-2 py-0.5 text-[10px] font-medium text-stone uppercase tracking-wide">
                {nutrition.source === "usda" ? "USDA" : "Open Food Facts"}
              </span>
              <span className={cn(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide",
                nutrition.confidence === "high" ? "bg-mint/20 text-forest" :
                nutrition.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                "bg-clay/10 text-clay"
              )}>
                {nutrition.confidence} confidence
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Nutrition grid */}
      <div className="px-5 py-4 border-b border-border">
        <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-2.5">Nutrition per 100g</p>
        <div className="grid grid-cols-5 gap-2">
          <NutriCell icon={Flame} label="Cal" value={`${nutrition.calories_kcal}`} unit="kcal" color="var(--macro-cal)" />
          <NutriCell icon={Drumstick} label="Protein" value={`${nutrition.protein_g}`} unit="g" color="var(--macro-protein)" />
          <NutriCell icon={Wheat} label="Carbs" value={`${nutrition.carbs_g}`} unit="g" color="var(--macro-carbs)" />
          <NutriCell icon={Droplet} label="Fat" value={`${nutrition.fat_g}`} unit="g" color="var(--macro-fat)" />
          <NutriCell icon={Salad} label="Fiber" value={`${nutrition.fiber_g}`} unit="g" color="var(--macro-fiber)" />
        </div>
      </div>

      {/* Edit fields */}
      <div className="px-5 py-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-stone mb-1 block">Product name</label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="text-sm"
          />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div>
            <label className="text-xs font-medium text-stone mb-1 block">Quantity</label>
            <Input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(Number(e.target.value) || 1)}
              min={0.1}
              step={0.5}
              className="text-sm tabular-nums"
            />
          </div>
          <div>
            <label className="text-xs font-medium text-stone mb-1 block">Unit</label>
            <Select value={unit} onValueChange={setUnit}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["pcs", "g", "kg", "ml", "l", "packs", "cups"].map((u) => (
                  <SelectItem key={u} value={u}>{u}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs font-medium text-stone mb-1 block">Category</label>
            <Select value={category} onValueChange={(v) => setCategory(v as PantryCategory)}>
              <SelectTrigger className="text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PANTRY_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>{CATEGORY_META[c].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 px-5 py-4 border-t border-border bg-cream2/30">
        <Button
          onClick={handleAdd}
          disabled={adding || !name.trim()}
          className="flex-1 bg-forest hover:bg-sage text-white rounded-full"
        >
          {adding ? (
            <><Spinner className="size-4 mr-1.5" /> Adding…</>
          ) : (
            <><PackagePlus className="size-4 mr-1.5" /> Add to Pantry</>
          )}
        </Button>
        <Button variant="outline" onClick={onScanAnother} disabled={adding} className="rounded-full">
          <ScanBarcode className="size-4 mr-1.5" /> Scan another
        </Button>
      </div>
    </div>
  )
}

function NutriCell({
  icon: Icon,
  label,
  value,
  unit,
  color,
}: {
  icon: typeof Flame
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div className="flex flex-col items-center gap-0.5 rounded-xl bg-cream2/50 px-1.5 py-2">
      <Icon className="size-3.5" style={{ color }} />
      <span className="text-sm font-semibold tabular-nums text-ink">{value}</span>
      <span className="text-[9px] text-fog uppercase tracking-wide">{unit}</span>
    </div>
  )
}
