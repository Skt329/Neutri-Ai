import { Flame } from "lucide-react"
import { cn } from "@/lib/utils"
import type { StreakInfo } from "@/lib/types"

export function StreakBadge({ streak, className }: { streak: StreakInfo; className?: string }) {
  const hot = streak.currentStreak >= 3
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-border bg-card p-4",
        className,
      )}
    >
      <div
        aria-hidden
        className="absolute inset-0 opacity-[0.07]"
        style={{
          background:
            "radial-gradient(circle at 80% 20%, var(--macro-calories) 0%, transparent 55%)",
        }}
      />
      <div className="relative flex items-start gap-3">
        <div
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full",
            hot ? "bg-[color:var(--macro-calories)]/15" : "bg-muted",
          )}
        >
          <Flame
            className={cn("size-5 transition-transform", hot && "animate-pulse")}
            style={{ color: hot ? "var(--macro-calories)" : "var(--muted-foreground)" }}
            aria-hidden
          />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-semibold tabular-nums">{streak.currentStreak}</span>
            <span className="text-xs text-muted-foreground">
              day{streak.currentStreak === 1 ? "" : "s"} · best {streak.longestStreak}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {streak.currentStreak === 0
              ? "Log a meal to start a streak"
              : streak.loggedToday
                ? "Streak locked in for today"
                : "Log something today to keep it alive"}
          </p>
          <div className="mt-2.5 flex gap-1">
            {streak.last7Days.map((logged, i) => (
              <div
                key={i}
                className={cn(
                  "h-1.5 flex-1 rounded-full transition-colors",
                  logged ? "bg-[color:var(--macro-calories)]" : "bg-muted",
                )}
                aria-label={`Day ${i + 1}: ${logged ? "logged" : "no meals"}`}
              />
            ))}
          </div>
          <p className="mt-1 text-[10px] font-medium tracking-wider text-muted-foreground">
            {streak.weeklyConsistency}/7 days this week
          </p>
        </div>
      </div>
    </div>
  )
}
