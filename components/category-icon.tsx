import { CATEGORY_META, MEAL_TYPE_META, normalizeCategory, type MealType } from "@/lib/categories"
import { cn } from "@/lib/utils"

export function CategoryIcon({
  category,
  size = "md",
  className,
}: {
  category: string | null | undefined
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const cat = normalizeCategory(category)
  const meta = CATEGORY_META[cat]
  const Icon = meta.icon
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10"
  const iconSize = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border/40",
        box,
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${meta.tint} 18%, var(--background))`, color: meta.tint }}
      aria-hidden
    >
      <Icon className={iconSize} strokeWidth={2.2} />
    </div>
  )
}

export function MealTypeIcon({
  type,
  size = "md",
  className,
}: {
  type: MealType | null
  size?: "sm" | "md" | "lg"
  className?: string
}) {
  const meta = type ? MEAL_TYPE_META[type] : null
  const Icon = meta?.icon
  const box = size === "sm" ? "size-8" : size === "lg" ? "size-12" : "size-10"
  const iconSize = size === "sm" ? "size-4" : size === "lg" ? "size-6" : "size-5"
  if (!Icon || !meta) {
    return (
      <div
        className={cn(
          "flex shrink-0 items-center justify-center rounded-xl border border-border/40 bg-muted text-muted-foreground",
          box,
          className,
        )}
      >
        <div className={cn("rounded-full bg-current/40", iconSize)} />
      </div>
    )
  }
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-xl border border-border/40",
        box,
        className,
      )}
      style={{ backgroundColor: `color-mix(in oklab, ${meta.tint} 20%, var(--background))`, color: meta.tint }}
      aria-hidden
    >
      <Icon className={iconSize} strokeWidth={2.2} />
    </div>
  )
}
