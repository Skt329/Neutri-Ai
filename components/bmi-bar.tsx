"use client"

export function BmiBar({
  heightCm,
  weightKg,
}: {
  heightCm: number | null
  weightKg: number | null
}) {
  if (!heightCm || !weightKg) return null
  const bmi = weightKg / Math.pow(heightCm / 100, 2)
  // Map BMI 15 → 0%, BMI 40 → 100%
  const pct = Math.max(0, Math.min(100, ((bmi - 15) / (40 - 15)) * 100))

  let label = "Normal"
  let color = "var(--macro-protein)"
  if (bmi < 18.5) {
    label = "Underweight"
    color = "var(--macro-carbs)"
  } else if (bmi >= 25 && bmi < 30) {
    label = "Overweight"
    color = "var(--macro-calories)"
  } else if (bmi >= 30) {
    label = "Obese"
    color = "var(--macro-fat)"
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-baseline justify-between">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">Body Mass Index</p>
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{bmi.toFixed(1)}</span>
            <span className="text-xs font-medium" style={{ color }}>
              {label}
            </span>
          </div>
        </div>
        <p className="text-[11px] text-muted-foreground">
          {weightKg} kg · {heightCm} cm
        </p>
      </div>
      <div className="relative mt-4">
        <div
          className="h-2 w-full rounded-full"
          style={{
            background:
              "linear-gradient(to right, color-mix(in oklch, var(--macro-carbs) 60%, transparent) 0%, color-mix(in oklch, var(--macro-carbs) 50%, transparent) 14%, color-mix(in oklch, var(--macro-protein) 55%, transparent) 14%, color-mix(in oklch, var(--macro-protein) 55%, transparent) 40%, color-mix(in oklch, var(--macro-calories) 55%, transparent) 40%, color-mix(in oklch, var(--macro-calories) 55%, transparent) 60%, color-mix(in oklch, var(--macro-fat) 55%, transparent) 60%, color-mix(in oklch, var(--macro-fat) 55%, transparent) 100%)",
          }}
          aria-hidden
        />
        <div
          className="absolute top-1/2 size-3 -translate-y-1/2 rounded-full border-2 border-background shadow-md"
          style={{ left: `calc(${pct}% - 6px)`, backgroundColor: color }}
          aria-hidden
        />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-muted-foreground">
        <span>15</span>
        <span>18.5</span>
        <span>25</span>
        <span>30</span>
        <span>40</span>
      </div>
    </div>
  )
}
