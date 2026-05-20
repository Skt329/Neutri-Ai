"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"
import { Check, ListChecks } from "lucide-react"
import { ToolCardShell } from "./tool-card-shared"

// ─── Types ────────────────────────────────────────────────────────────────

export type ChooseOptionInput = { prompt: string; options: string[]; multi: boolean }
export type ChooseOptionOutput = { confirmed: boolean; selected: string[] }

// ─── Component ────────────────────────────────────────────────────────────

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
  const submittedRef = useRef(false)

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
    if (submittedRef.current) return
    if (input.multi) {
      setSelected((p) => (p.includes(o) ? p.filter((x) => x !== o) : [...p, o]))
    } else {
      submittedRef.current = true
      onSubmit({ confirmed: true, selected: [o] })
    }
  }

  return (
    <ToolCardShell title={input.prompt} icon={<ListChecks className="size-4" />}>
      <div className="flex flex-wrap gap-2" role="group" aria-label={input.multi ? "Select multiple options" : "Select an option"}>
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
              aria-pressed={active}
              aria-label={`${input.multi ? 'Toggle' : 'Select'} ${o}`}
            >
              {active ? <Check className="size-3.5" aria-hidden="true" /> : null}
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
            disabled={submittedRef.current}
            onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: false, selected: [] }) }}
          >
            Skip
          </Button>
          <Button
            size="sm"
            disabled={selected.length === 0 || submittedRef.current}
            onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: true, selected }) }}
          >
            <Check className="mr-1.5 size-4" /> Send ({selected.length})
          </Button>
        </div>
      ) : null}
    </ToolCardShell>
  )
}
