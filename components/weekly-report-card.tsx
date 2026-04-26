"use client"

import { useRef, useState } from "react"
import { Award, Download, Share2, TrendingDown, TrendingUp } from "lucide-react"
import { Button } from "@/components/ui/button"
import { WeeklyChart } from "@/components/weekly-chart"
import { formatNumber } from "@/lib/format"
import type { WeeklyStats } from "@/lib/types"

/**
 * "Sunday recap" — top-of-dashboard card summarizing the last 7 days.
 * Can be downloaded/shared as an image via html-to-image (lazy loaded).
 */
export function WeeklyReportCard({ stats }: { stats: WeeklyStats }) {
  const cardRef = useRef<HTMLDivElement>(null)
  const [busy, setBusy] = useState(false)

  const weightDirection =
    stats.weightChangeKg != null
      ? stats.weightChangeKg > 0
        ? "up"
        : stats.weightChangeKg < 0
          ? "down"
          : "flat"
      : "none"

  async function downloadImage() {
    if (!cardRef.current) return
    setBusy(true)
    try {
      const { toPng } = await import("html-to-image")
      const dataUrl = await toPng(cardRef.current, {
        pixelRatio: 2,
        backgroundColor: getComputedStyle(document.documentElement).getPropertyValue("--background") || "#ffffff",
      })
      const a = document.createElement("a")
      a.download = `nutriai-week-${new Date().toISOString().slice(0, 10)}.png`
      a.href = dataUrl
      a.click()
    } catch {
      // swallow — user can retry
    } finally {
      setBusy(false)
    }
  }

  async function shareImage() {
    if (!cardRef.current || typeof navigator === "undefined") return
    setBusy(true)
    try {
      const { toBlob } = await import("html-to-image")
      const blob = await toBlob(cardRef.current, { pixelRatio: 2 })
      if (!blob) throw new Error("No blob")
      const file = new File([blob], "nutriai-week.png", { type: "image/png" })
      const anyNav = navigator as Navigator & {
        canShare?: (data: { files: File[] }) => boolean
        share?: (data: { files: File[]; title?: string }) => Promise<void>
      }
      if (anyNav.canShare?.({ files: [file] }) && anyNav.share) {
        await anyNav.share({ files: [file], title: "My NutriAI week" })
      } else {
        await downloadImage()
      }
    } catch {
      // silently fail
    } finally {
      setBusy(false)
    }
  }

  return (
    <div
      ref={cardRef}
      className="relative overflow-hidden rounded-2xl border border-border bg-card p-5"
      style={{
        backgroundImage:
          "radial-gradient(circle at 100% 0%, color-mix(in oklch, var(--macro-protein) 18%, transparent) 0, transparent 55%), radial-gradient(circle at 0% 100%, color-mix(in oklch, var(--macro-calories) 14%, transparent) 0, transparent 55%)",
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="inline-flex items-center gap-1.5 rounded-full bg-background/70 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-foreground/70 ring-1 ring-border">
            <Award className="size-3" aria-hidden />
            Weekly recap
          </p>
          <h2 className="mt-2 text-balance text-lg font-semibold">Your last 7 days</h2>
        </div>
        <div className="flex gap-1.5">
          <Button variant="ghost" size="icon" className="size-8" onClick={shareImage} disabled={busy} aria-label="Share">
            <Share2 className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" className="size-8" onClick={downloadImage} disabled={busy} aria-label="Download image">
            <Download className="size-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Avg kcal / day" value={formatNumber(stats.avgCalories)} sub={stats.targetCalories ? `of ${formatNumber(stats.targetCalories)}` : undefined} />
        <Stat
          label="Consistency"
          value={`${stats.macroConsistencyPct}%`}
          sub="vs target"
          accent="var(--macro-protein)"
        />
        <Stat label="Meals logged" value={String(stats.totalMealsLogged)} sub="this week" />
        <Stat
          label="Weight change"
          value={
            stats.weightChangeKg == null
              ? "—"
              : `${stats.weightChangeKg > 0 ? "+" : ""}${stats.weightChangeKg.toFixed(1)} kg`
          }
          sub={
            stats.startWeightKg != null && stats.endWeightKg != null
              ? `${stats.startWeightKg.toFixed(1)} → ${stats.endWeightKg.toFixed(1)}`
              : "no data"
          }
          icon={
            weightDirection === "down" ? (
              <TrendingDown className="size-3.5" style={{ color: "var(--macro-protein)" }} />
            ) : weightDirection === "up" ? (
              <TrendingUp className="size-3.5" style={{ color: "var(--macro-calories)" }} />
            ) : null
          }
        />
      </div>

      <div className="mt-5 rounded-xl bg-background/60 p-3 ring-1 ring-border">
        <WeeklyChart days={stats.days} targetCalories={stats.targetCalories} />
      </div>

      {(stats.bestDay || stats.worstDay) && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
          {stats.bestDay ? (
            <span>
              <span className="font-medium text-foreground/80">Best: </span>
              {formatShortDate(stats.bestDay.date)} · {formatNumber(Math.round(stats.bestDay.calories))} kcal
            </span>
          ) : null}
          {stats.worstDay ? (
            <span>
              <span className="font-medium text-foreground/80">Lightest: </span>
              {formatShortDate(stats.worstDay.date)} · {formatNumber(Math.round(stats.worstDay.calories))} kcal
            </span>
          ) : null}
        </div>
      )}
    </div>
  )
}

function Stat({
  label,
  value,
  sub,
  accent,
  icon,
}: {
  label: string
  value: string
  sub?: string
  accent?: string
  icon?: React.ReactNode
}) {
  return (
    <div className="rounded-xl bg-background/60 p-3 ring-1 ring-border">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-1.5">
        <span className="text-xl font-semibold tabular-nums" style={accent ? { color: accent } : undefined}>
          {value}
        </span>
        {icon}
      </div>
      {sub ? <p className="text-[10px] text-muted-foreground">{sub}</p> : null}
    </div>
  )
}

function formatShortDate(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" })
}
