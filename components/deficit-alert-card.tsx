import Link from "next/link"
import { AlertTriangle, Info, Sparkles } from "lucide-react"
import type { DeficitAlert } from "@/lib/types"
import { cn } from "@/lib/utils"

/**
 * Contextual alert card shown on the dashboard. Renders a stack of alerts
 * (protein shortfall, fiber shortfall, meal-gap, etc) with a quick-fix CTA
 * that opens the assistant with a prefilled prompt.
 */
export function DeficitAlertCard({ alerts }: { alerts: DeficitAlert[] }) {
  if (alerts.length === 0) return null

  return (
    <div className="flex flex-col gap-2">
      {alerts.map((alert, i) => {
        const isWarn = alert.severity === "warning"
        const Icon = isWarn ? AlertTriangle : Info
        return (
          <div
            key={i}
            className={cn(
              "relative flex gap-3 overflow-hidden rounded-2xl border p-4",
              isWarn
                ? "border-[color:var(--macro-calories)]/30 bg-[color:var(--macro-calories)]/5"
                : "border-border bg-card",
            )}
          >
            <div
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-full",
                isWarn ? "bg-[color:var(--macro-calories)]/15" : "bg-[color:var(--macro-protein)]/15",
              )}
            >
              <Icon
                className="size-4"
                style={{ color: isWarn ? "var(--macro-calories)" : "var(--macro-protein)" }}
                aria-hidden
              />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">{alert.title}</p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{alert.message}</p>
              {alert.quickFix ? (
                <p className="mt-1.5 text-xs text-foreground/80">
                  <span className="font-medium">Quick fix: </span>
                  {alert.quickFix}
                </p>
              ) : null}
              <Link
                href={`/chat?prefill=${encodeURIComponent(promptFor(alert))}`}
                className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Sparkles className="size-3" aria-hidden />
                Ask NutriAI for ideas
              </Link>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function promptFor(alert: DeficitAlert): string {
  switch (alert.kind) {
    case "protein":
      return "Suggest a high-protein dinner I can make with what's in my pantry."
    case "fiber":
      return "I need more fiber today — what can I make with my pantry?"
    case "calories_low":
      return "I'm under my calorie target — suggest a simple meal to close the gap."
    case "calories_high":
      return "I'm over my calorie target — any tips for tomorrow?"
    case "gap":
      return "It's been a while since I ate. Suggest a quick snack from my pantry."
  }
}
