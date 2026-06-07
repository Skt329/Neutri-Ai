import { memo } from 'react'
import Link from "next/link"
import { Coffee, Sun, Cookie, Moon } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { MealLog } from "@/lib/types"
import { cn } from "@/lib/utils"

const MEAL_TYPE_META = {
  breakfast: { icon: Coffee, emoji: "🌅", label: "Breakfast", tint: "bg-turmeric-l text-turmeric" },
  lunch: { icon: Sun, emoji: "☀️", label: "Lunch", tint: "bg-mint2 text-sage" },
  snack: { icon: Cookie, emoji: "🍎", label: "Snack", tint: "bg-cream3 text-stone" },
  dinner: { icon: Moon, emoji: "🌙", label: "Dinner", tint: "bg-clay-l text-clay" },
} as const

interface MealSlotCardProps {
  meal: MealLog | null
  type: "breakfast" | "lunch" | "snack" | "dinner"
  index: number
}

function MealSlotCardInner({ meal, type, index }: MealSlotCardProps) {
  const meta = MEAL_TYPE_META[type]

  if (!meal) {
    return (
      <div
        className="flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-ghost bg-card/50 smooth-hover hover:border-sage/30 animate-fade-in-up"
        style={{ animationDelay: `${index * 80}ms` }}
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-cream2 text-fog">
          <meta.icon className="size-5" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-fog">{meta.label}</p>
          <p className="text-xs text-ghost">Not logged yet</p>
        </div>
        <Link href="/chat">
          <Button size="sm" variant="outline" className="text-xs rounded-full border-sage/30 text-sage hover:bg-mint2">
            + Log
          </Button>
        </Link>
      </div>
    )
  }

  const time = new Date(meal.logged_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-2xl bg-card border border-border smooth-hover hover:shadow-sm hover:-translate-y-0.5 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", meta.tint)}>
        <span className="text-lg">{meta.emoji}</span>
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="text-xs text-fog tabular-nums">{time}</span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-stone">{meta.label}</span>
        </div>
        <p className="text-sm font-medium text-ink break-words mt-0.5">{meal.description}</p>
        {/* Macro dots */}
        <div className="flex items-center gap-3 mt-1.5 text-[11px] text-stone tabular-nums">
          {meal.protein_g != null && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-macro-protein" />
              P {Math.round(meal.protein_g)}g
            </span>
          )}
          {meal.carbs_g != null && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-macro-carbs" />
              C {Math.round(meal.carbs_g)}g
            </span>
          )}
          {meal.fat_g != null && (
            <span className="flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-macro-fat" />
              F {Math.round(meal.fat_g)}g
            </span>
          )}
        </div>
      </div>
      <div className="text-right shrink-0">
        <span className="font-display text-lg font-bold text-ink">{meal.calories ?? 0}</span>
        <p className="text-[10px] text-fog">kcal</p>
      </div>
    </div>
  )
}

export const MealSlotCard = memo(MealSlotCardInner)
