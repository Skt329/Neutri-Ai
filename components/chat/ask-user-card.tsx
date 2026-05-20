"use client"

import { useState, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Check, HelpCircle } from "lucide-react"
import { ToolCardShell } from "./tool-card-shared"

// ─── Types ────────────────────────────────────────────────────────────────

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

// ─── Component ────────────────────────────────────────────────────────────

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
  const submittedRef = useRef(false)

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
    if (submittedRef.current) return
    submittedRef.current = true
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
            disabled={submittedRef.current}
            onClick={() => { if (submittedRef.current) return; submittedRef.current = true; onSubmit({ confirmed: false, values: {} }) }}
          >
            Skip
          </Button>
          <Button type="submit" size="sm" disabled={submittedRef.current}>
            <Check className="mr-1.5 size-4" /> Send
          </Button>
        </div>
      </form>
    </ToolCardShell>
  )
}
