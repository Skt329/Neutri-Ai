import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/page-header"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ProfileForm } from "./profile-form"
import { RecomputeButton } from "./recompute-button"
import { BmiBar } from "@/components/bmi-bar"
import { formatNumber } from "@/lib/format"
import { MACRO_META } from "@/lib/macro-colors"
import type { NutritionTargets, Profile, WeightLog } from "@/lib/types"
import { TrendingDown, TrendingUp, Minus } from "lucide-react"

export const dynamic = "force-dynamic"

export default async function ProfilePage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const [{ data: profile }, { data: targets }, { data: weights }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle<Profile>(),
    supabase
      .from("nutrition_targets")
      .select("*")
      .eq("user_id", user.id)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle<NutritionTargets>(),
    supabase
      .from("weight_logs")
      .select("*")
      .eq("user_id", user.id)
      .order("logged_at", { ascending: false })
      .limit(10)
      .returns<WeightLog[]>(),
  ])

  const recentWeights = weights ?? []
  const oldest = recentWeights[recentWeights.length - 1]
  const newest = recentWeights[0]
  const weightDelta =
    newest && oldest && recentWeights.length > 1 ? Number(newest.weight_kg) - Number(oldest.weight_kg) : null

  return (
    <>
      <PageHeader title="Profile" description="Your metrics, preferences, and daily targets." />
      <div className="grid gap-6 p-4 md:p-8 lg:grid-cols-[1fr_340px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Your info</CardTitle>
              <CardDescription>Changes automatically update NutriAI&apos;s suggestions.</CardDescription>
            </CardHeader>
            <CardContent>{profile ? <ProfileForm profile={profile} /> : <p>Profile not found.</p>}</CardContent>
          </Card>
        </div>

        <div className="flex flex-col gap-4">
          <BmiBar heightCm={profile?.height_cm ?? null} weightKg={profile?.weight_kg ?? null} />

          <Card className="h-fit">
            <CardHeader>
              <CardTitle className="text-base">Daily targets</CardTitle>
              <CardDescription>Computed from your body metrics, activity, and goal.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {targets ? (
                <div className="grid grid-cols-2 gap-2">
                  <TargetTile
                    label="Calories"
                    value={formatNumber(targets.calories)}
                    unit="kcal"
                    color={MACRO_META.calories.color}
                  />
                  <TargetTile
                    label="Protein"
                    value={formatNumber(targets.protein_g)}
                    unit="g"
                    color={MACRO_META.protein.color}
                  />
                  <TargetTile
                    label="Carbs"
                    value={formatNumber(targets.carbs_g)}
                    unit="g"
                    color={MACRO_META.carbs.color}
                  />
                  <TargetTile
                    label="Fat"
                    value={formatNumber(targets.fat_g)}
                    unit="g"
                    color={MACRO_META.fat.color}
                  />
                  {targets.fiber_g ? (
                    <TargetTile
                      label="Fiber"
                      value={formatNumber(targets.fiber_g)}
                      unit="g"
                      color={MACRO_META.fiber.color}
                    />
                  ) : null}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">No targets set yet.</p>
              )}
              <RecomputeButton />
              <p className="text-xs leading-relaxed text-muted-foreground">
                Uses the Mifflin-St Jeor equation with your activity factor, then adjusts for your goal.
              </p>
            </CardContent>
          </Card>

          {recentWeights.length > 0 ? (
            <Card className="h-fit">
              <CardHeader>
                <CardTitle className="text-base">Weight</CardTitle>
                <CardDescription>
                  {newest ? `Latest: ${Number(newest.weight_kg).toFixed(1)} kg` : "No entries"}
                  {weightDelta != null ? (
                    <span
                      className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium"
                      style={{
                        backgroundColor:
                          weightDelta < 0
                            ? "color-mix(in oklch, var(--macro-protein) 15%, transparent)"
                            : weightDelta > 0
                              ? "color-mix(in oklch, var(--macro-calories) 15%, transparent)"
                              : "var(--muted)",
                        color:
                          weightDelta < 0
                            ? "var(--macro-protein)"
                            : weightDelta > 0
                              ? "var(--macro-calories)"
                              : "var(--muted-foreground)",
                      }}
                    >
                      {weightDelta < 0 ? (
                        <TrendingDown className="size-3" aria-hidden />
                      ) : weightDelta > 0 ? (
                        <TrendingUp className="size-3" aria-hidden />
                      ) : (
                        <Minus className="size-3" aria-hidden />
                      )}
                      {weightDelta > 0 ? "+" : ""}
                      {weightDelta.toFixed(1)} kg
                    </span>
                  ) : null}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ul className="flex flex-col gap-1.5 text-sm">
                  {recentWeights.slice(0, 5).map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center justify-between rounded-md px-2 py-1 text-sm hover:bg-accent/30"
                    >
                      <span className="text-muted-foreground">
                        {new Date(w.logged_at).toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                      <span className="font-medium tabular-nums">{Number(w.weight_kg).toFixed(1)} kg</span>
                    </li>
                  ))}
                </ul>
                <p className="mt-3 text-xs text-muted-foreground">
                  Ask NutriAI to log a weight — &ldquo;I&apos;m 72.4 kg today&rdquo;.
                </p>
              </CardContent>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  )
}

function TargetTile({
  label,
  value,
  unit,
  color,
}: {
  label: string
  value: string
  unit: string
  color: string
}) {
  return (
    <div
      className="flex flex-col gap-0.5 rounded-lg border border-border px-3 py-2"
      style={{ borderLeft: `3px solid ${color}` }}
    >
      <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      <span className="text-sm font-semibold tabular-nums">
        {value} <span className="text-xs font-normal text-muted-foreground">{unit}</span>
      </span>
    </div>
  )
}
