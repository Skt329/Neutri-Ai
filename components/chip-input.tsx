"use client"

import { useState, useEffect, useId } from "react"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"

import { X, Plus, Check } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * Controlled tag / chip input used in onboarding and the profile editor.
 *
 * - Free-form entry: type + Enter (or comma) to add, click × to remove.
 * - Optional `suggestions`: one-click chips the user can add quickly.
 *
 * Renders a hidden `<input name="...">` whose value is the tags joined by
 * "||" (a delimiter we can safely split on the server). This lets it drop
 * straight into existing server actions that already use FormData.
 */
export function ChipInput({
  name,
  defaultValue = [],
  placeholder,
  suggestions = [],
  className,
  maxChips = 30,
}: {
  name: string
  defaultValue?: string[]
  placeholder?: string
  suggestions?: string[]
  className?: string
  maxChips?: number
}) {
  const id = useId()
  const [tags, setTags] = useState<string[]>(() => dedupe(defaultValue))
  const [draft, setDraft] = useState("")

  // Reset when defaultValue changes (e.g. after a server revalidate).
  useEffect(() => {
    setTags(dedupe(defaultValue))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [defaultValue.join("||")])

  function add(value: string) {
    const v = value.trim().toLowerCase()
    if (!v) return
    setTags((prev) => (prev.includes(v) || prev.length >= maxChips ? prev : [...prev, v]))
    setDraft("")
  }
  function remove(value: string) {
    setTags((prev) => prev.filter((t) => t !== value))
  }

  return (
    <div className={cn("flex flex-col gap-2", className)}>
      <input type="hidden" name={name} value={tags.join("||")} />

      <div className="flex min-h-11 flex-wrap items-center gap-1.5 rounded-md border border-input bg-background px-2 py-1.5">
        {tags.map((t) => (
          <Badge
            key={t}
            variant="secondary"
            className="gap-1 rounded-full pl-2.5 pr-1 py-1 font-normal capitalize"
          >
            {t.replace(/_/g, " ")}
            <button
              type="button"
              onClick={() => remove(t)}
              aria-label={`Remove ${t}`}
              className="ml-0.5 inline-flex size-4 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-destructive/20 hover:text-destructive"
            >
              <X className="size-3" />
            </button>
          </Badge>
        ))}
        <Input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault()
              add(draft)
            } else if (e.key === "Backspace" && draft === "" && tags.length > 0) {
              remove(tags[tags.length - 1])
            }
          }}
          placeholder={tags.length === 0 ? placeholder : ""}
          className="h-8 min-w-[8rem] flex-1 border-0 bg-transparent px-1 shadow-none focus-visible:ring-0"
        />
      </div>

      {suggestions.length > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {suggestions.map((s) => {
            const active = tags.includes(s)
            return (
              <button
                key={s}
                type="button"
                onClick={() => (active ? remove(s) : add(s))}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs transition-colors capitalize",
                  active
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                )}
              >
                {active ? <Check className="size-3" /> : <Plus className="size-3" />}
                {s.replace(/_/g, " ")}
              </button>
            )
          })}
        </div>
      ) : null}
    </div>
  )
}

function dedupe(arr: string[]): string[] {
  return Array.from(new Set(arr.map((s) => s.toLowerCase().trim()).filter(Boolean)))
}
