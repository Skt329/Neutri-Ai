import { getAuthUser } from "@/lib/supabase/auth"
import { getProfile } from "@/lib/supabase/profile"
import { getCachedTargets, getCachedWeightLogs } from "@/lib/supabase/queries"
import { ProfileSections } from "./profile-sections"
import { RecomputeButton } from "./recompute-button"
import { formatNumber } from "@/lib/format"
import type { NutritionTargets, Profile, WeightLog } from "@/lib/types"
import {
  Activity, Target, Scale,
  TrendingDown, TrendingUp, Minus, Flame, Drumstick, Wheat, Droplet, Salad,
} from "lucide-react"
import { cn } from "@/lib/utils"

export const metadata = {
  title: "Profile — NutriAI",
  description: "Manage your body metrics, dietary preferences, kitchen setup, and daily nutrition targets.",
}

export default async function ProfilePage() {
  const { user } = await getAuthUser()
  if (!user) return null

  // Use getProfile() (request-scoped cached) for the profile, and the
  // new tag-cached loaders for targets + weights — no raw duplicate queries.
  const [profile, targets, recentWeights] = await Promise.all([
    getProfile(),
    getCachedTargets(user.id),
    getCachedWeightLogs(user.id),
  ])

  const oldest = recentWeights[recentWeights.length - 1]
  const newest = recentWeights[0]
  const weightDelta =
    newest && oldest && recentWeights.length > 1
      ? Number(newest.weight_kg) - Number(oldest.weight_kg)
      : null

  const goalLabels: Record<string, string> = {
    lose: "Lose fat",
    maintain: "Maintain",
    gain: "Gain muscle",
    recomp: "Recomp",
  }

  const activityLabels: Record<string, string> = {
    sedentary: "Sedentary",
    light: "Light",
    moderate: "Moderate",
    active: "Active",
    very_active: "Very Active",
  }

  // BMI calculation
  const bmi =
    profile?.height_cm && profile?.weight_kg
      ? Number(profile.weight_kg) / Math.pow(Number(profile.height_cm) / 100, 2)
      : null

  const bmiCategory = bmi
    ? bmi < 18.5 ? "Underweight" : bmi < 25 ? "Normal" : bmi < 30 ? "Overweight" : "Obese"
    : null

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 animate-fade-in-up">
        <div>
          <h1 className="font-display text-3xl font-bold text-ink">Profile</h1>
          <p className="text-stone text-sm mt-1">Your metrics, preferences, and daily targets.</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[340px_1fr]">
        {/* Left column — Identity + BMI + Weight */}
        <div className="flex flex-col gap-4">
          {/* Identity card */}
          <div className="bg-forest rounded-2xl p-6 text-white animate-fade-in-up">
            <div className="flex items-center gap-4 mb-4">
              <div className="flex size-16 items-center justify-center rounded-full bg-white/10 text-2xl font-display font-bold">
                {profile?.full_name?.[0]?.toUpperCase() ?? "U"}
              </div>
              <div>
                <h2 className="font-display text-xl font-bold">{profile?.full_name ?? "User"}</h2>
                <p className="text-white/60 text-sm">{user.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <StatTile label="Age" value={profile?.age ? `${profile.age}y` : "—"} />
              <StatTile label="Sex" value={profile?.sex === "prefer_not_say" ? "—" : profile?.sex ?? "—"} />
              <StatTile label="Height" value={profile?.height_cm ? `${profile.height_cm}cm` : "—"} />
              <StatTile label="Weight" value={profile?.weight_kg ? `${profile.weight_kg}kg` : "—"} />
            </div>
          </div>

          {/* BMI card */}
          {bmi !== null && (
            <div className="bg-card rounded-2xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fog mb-3">Body Mass Index</p>
              <div className="flex items-end gap-3 mb-3">
                <span className="font-display text-3xl font-bold text-ink">{bmi.toFixed(1)}</span>
                <span className={cn(
                  "text-xs font-semibold px-2 py-0.5 rounded-full",
                  bmiCategory === "Normal" ? "bg-mint2 text-sage" :
                  bmiCategory === "Underweight" ? "bg-turmeric-l text-turmeric" :
                  "bg-clay-l text-clay"
                )}>
                  {bmiCategory}
                </span>
              </div>
              <div className="relative h-2 rounded-full bg-gradient-to-r from-turmeric via-sage to-clay overflow-hidden">
                <div
                  className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-white border-2 border-forest shadow-sm"
                  style={{ left: `${Math.min(Math.max((bmi - 15) / 25 * 100, 0), 100)}%` }}
                />
              </div>
              <div className="flex justify-between mt-1 text-[10px] text-fog">
                <span>15</span><span>18.5</span><span>25</span><span>30</span><span>40</span>
              </div>
            </div>
          )}

          {/* Weight tracker */}
          {recentWeights.length > 0 && (
            <div className="bg-card rounded-2xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-fog">Weight History</p>
                {weightDelta != null && (
                  <span className={cn(
                    "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium",
                    weightDelta < 0 ? "bg-mint2 text-sage" : weightDelta > 0 ? "bg-clay-l text-clay" : "bg-cream2 text-stone"
                  )}>
                    {weightDelta < 0 ? <TrendingDown className="size-3" /> : weightDelta > 0 ? <TrendingUp className="size-3" /> : <Minus className="size-3" />}
                    {weightDelta > 0 ? "+" : ""}{weightDelta.toFixed(1)} kg
                  </span>
                )}
              </div>
              <ul className="space-y-1.5">
                {recentWeights.slice(0, 5).map((w) => (
                  <li key={w.id} className="flex items-center justify-between text-sm rounded-lg px-2 py-1 hover:bg-cream2/50 smooth-hover">
                    <span className="text-stone">
                      {new Date(w.logged_at).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                    </span>
                    <span className="font-display font-semibold tabular-nums text-ink">{Number(w.weight_kg).toFixed(1)} kg</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* Right column — Targets + Editable Sections */}
        <div className="flex flex-col gap-4">
          {/* Goal & Activity */}
          <div className="grid grid-cols-2 gap-3 animate-fade-in-up" style={{ animationDelay: '100ms' }}>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Target className="size-4 text-sage" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">Goal</span>
              </div>
              <p className="font-display text-lg font-bold text-ink">
                {profile?.goal ? goalLabels[profile.goal] : "Not set"}
              </p>
            </div>
            <div className="bg-card rounded-2xl border border-border p-4">
              <div className="flex items-center gap-2 mb-2">
                <Activity className="size-4 text-sage" />
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">Activity</span>
              </div>
              <p className="font-display text-lg font-bold text-ink">
                {profile?.activity_level ? activityLabels[profile.activity_level] : "Not set"}
              </p>
            </div>
          </div>

          {/* Daily targets */}
          <div className="bg-card rounded-2xl border border-border p-5 animate-fade-in-up" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-fog">Daily Targets</p>
              <RecomputeButton />
            </div>
            {targets ? (
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                <TargetTile label="Calories" value={formatNumber(targets.calories)} unit="kcal" icon={Flame} color="var(--macro-cal)" />
                <TargetTile label="Protein" value={formatNumber(targets.protein_g)} unit="g" icon={Drumstick} color="var(--macro-protein)" />
                <TargetTile label="Carbs" value={formatNumber(targets.carbs_g)} unit="g" icon={Wheat} color="var(--macro-carbs)" />
                <TargetTile label="Fat" value={formatNumber(targets.fat_g)} unit="g" icon={Droplet} color="var(--macro-fat)" />
                {targets.fiber_g && (
                  <TargetTile label="Fiber" value={formatNumber(targets.fiber_g)} unit="g" icon={Salad} color="var(--macro-fiber)" />
                )}
              </div>
            ) : (
              <p className="text-sm text-stone">No targets set yet.</p>
            )}
            <p className="text-xs text-fog mt-3">
              Uses the Mifflin-St Jeor equation with your activity factor, then adjusts for your goal.
            </p>
          </div>

          {/* Sectioned editable profile — client component with view/edit toggle per section */}
          {profile ? <ProfileSections profile={profile} /> : (
            <div className="bg-card rounded-2xl border border-border p-5">
              <p className="text-stone text-sm">Profile not found. Please set up your profile.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function StatTile({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-white/10 rounded-xl px-3 py-2">
      <p className="text-[10px] text-white/50 font-semibold uppercase tracking-wider">{label}</p>
      <p className="font-display font-bold text-sm capitalize">{value}</p>
    </div>
  )
}

function TargetTile({
  label, value, unit, icon: Icon, color,
}: {
  label: string; value: string; unit: string; icon: typeof Flame; color: string
}) {
  return (
    <div className="flex flex-col gap-1 rounded-xl bg-cream2/50 px-3 py-2" style={{ borderLeft: `3px solid ${color}` }}>
      <div className="flex items-center gap-1">
        <Icon className="size-3" style={{ color }} />
        <span className="text-[10px] font-semibold uppercase tracking-wider text-fog">{label}</span>
      </div>
      <span className="font-display text-base font-bold tabular-nums text-ink">
        {value} <span className="text-xs font-normal font-sans text-fog">{unit}</span>
      </span>
    </div>
  )
}
