"use client"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, X } from "lucide-react"

/**
 * Shared shell wrapper for all tool cards.
 * Handles the outer border, header with icon/title/status badge.
 */
export function ToolCardShell({
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
      role="region"
      aria-label={title}
      className={cn(
        "w-full max-w-[85ch] overflow-hidden rounded-2xl border bg-card text-card-foreground shadow-sm",
        "animate-in fade-in slide-in-from-bottom-1 duration-300",
        variant === "resolved" && "border-primary/30",
        variant === "cancelled" && "border-muted opacity-80",
        variant === "active" && "border-border",
      )}
    >
      <div className="flex items-center gap-2 border-b border-border/60 bg-muted/30 px-4 py-2.5">
        <span className="text-primary" aria-hidden="true">{icon}</span>
        <p className="text-sm font-semibold">{title}</p>
        {variant === "resolved" ? (
          <Badge variant="secondary" className="ml-auto gap-1" aria-live="polite">
            <Check className="size-3" aria-hidden="true" /> Confirmed
          </Badge>
        ) : variant === "cancelled" ? (
          <Badge variant="outline" className="ml-auto gap-1 text-muted-foreground" aria-live="polite">
            <X className="size-3" aria-hidden="true" /> Cancelled
          </Badge>
        ) : null}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

/**
 * Macro number input (large, for meal cards).
 */
export function MacroInput({
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

/**
 * Macro number input (small, for pantry nutrition details).
 */
export function MacroInputMini({
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

/**
 * Format nutrition basis label for display.
 */
export function formatBasisLabel(basis: string | null): string {
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
