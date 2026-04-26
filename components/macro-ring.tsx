"use client"

import { RadialBar, RadialBarChart, PolarAngleAxis } from "recharts"
import { ChartContainer, type ChartConfig } from "@/components/ui/chart"

export function MacroRing({
  label,
  current,
  target,
  unit = "g",
  colorVar = "--chart-1",
}: {
  label: string
  current: number
  target: number
  unit?: string
  colorVar?: string
}) {
  const pct = target > 0 ? Math.min(100, Math.round((current / target) * 100)) : 0
  const data = [{ name: label, value: pct, fill: `var(${colorVar})` }]

  const config = {
    value: { label },
  } satisfies ChartConfig

  return (
    <div className="flex flex-col items-center gap-2" role="group" aria-label={`${label} progress`}>
      <div className="relative h-[120px] w-[120px]">
        <ChartContainer config={config} className="absolute inset-0">
          <RadialBarChart data={data} startAngle={90} endAngle={-270} innerRadius="75%" outerRadius="100%">
            <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
            <RadialBar dataKey="value" cornerRadius={999} background={{ fill: "var(--muted)" }} />
          </RadialBarChart>
        </ChartContainer>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-lg font-semibold leading-none tabular-nums">{Math.round(current)}</span>
          <span className="text-[11px] leading-tight text-muted-foreground tabular-nums">/{Math.round(target)}</span>
          <span className="mt-1 text-[10px] uppercase tracking-wide text-muted-foreground">{unit}</span>
        </div>
      </div>
      <div className="flex flex-col items-center">
        <span className="text-sm font-medium">{label}</span>
        <span className="text-xs text-muted-foreground tabular-nums">{pct}%</span>
      </div>
    </div>
  )
}
