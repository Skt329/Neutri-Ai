import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/auth"
import { computeStreakInfo } from "@/lib/streaks"

export const dynamic = "force-dynamic"

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return NextResponse.json({ streak: 0 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle()

  const { data: meals7d } = await supabase
    .from("meal_logs")
    .select("logged_at")
    .eq("user_id", user.id)
    .gte("logged_at", new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString())
    .order("logged_at", { ascending: false })
    .limit(100)

  const streak = computeStreakInfo(
    (meals7d ?? []).map((m) => m.logged_at),
    profile?.timezone || "UTC"
  )

  return NextResponse.json({ streak: streak.currentStreak })
}
