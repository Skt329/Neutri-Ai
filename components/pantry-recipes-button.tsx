"use client"

import Link from "next/link"
import { ChefHat } from "lucide-react"

/**
 * Bridge CTA from Pantry → Chat. The chat page reads ?prefill= and auto-sends
 * it on mount so the assistant immediately responds with recipes.
 */
export function PantryRecipesButton({ itemCount }: { itemCount: number }) {
  const prompt =
    itemCount === 0
      ? "I don't have anything in my pantry yet — suggest an easy grocery list."
      : "Using only what's in my pantry right now, suggest 5 recipes I can make for my next meal."
  return (
    <Link
      href={`/chat?prefill=${encodeURIComponent(prompt)}`}
      className="group relative flex items-center gap-3 overflow-hidden rounded-2xl border border-border bg-card px-4 py-3 transition-colors hover:bg-accent/30"
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-0 transition-opacity group-hover:opacity-100"
        style={{
          background:
            "radial-gradient(circle at 80% 50%, color-mix(in oklch, var(--macro-protein) 18%, transparent) 0, transparent 60%)",
        }}
      />
      <div
        className="relative flex size-10 items-center justify-center rounded-full"
        style={{ backgroundColor: "color-mix(in oklch, var(--macro-protein) 15%, transparent)" }}
      >
        <ChefHat className="size-5" style={{ color: "var(--macro-protein)" }} aria-hidden />
      </div>
      <div className="relative flex-1">
        <p className="text-sm font-semibold leading-tight">What can I cook?</p>
        <p className="text-xs text-muted-foreground">
          Recipe ideas using only what&apos;s in your pantry
          {itemCount > 0 ? ` (${itemCount} items)` : ""}
        </p>
      </div>
    </Link>
  )
}
