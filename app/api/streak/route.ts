import { NextResponse } from "next/server"
import { getAuthUser } from "@/lib/supabase/auth"
import { computeStreakInfo } from "@/lib/streaks"

// Revalidate every 5 minutes — streak data changes at most once per day.
export const revalidate = 300

export async function GET() {
  const { user, supabase } = await getAuthUser()
  if (!user) return NextResponse.json({ streak: 0 })

  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user.id)
    .maybeSingle()

  // Reduced from 7-day to 8-day window — minimal viable window for
  // streak computation while avoiding the original 45-day scan.
  const { data: meals8d } = await supabase
    .from("meal_logs")
    .select("logged_at")
    .eq("user_id", user.id)
    .gte("logged_at", new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString())
    .order("logged_at", { ascending: false })
    .limit(100)

  const streak = computeStreakInfo(
    (meals8d ?? []).map((m) => m.logged_at),
    profile?.timezone || "UTC"
  )

  const res = NextResponse.json({ streak: streak.currentStreak })
  // Allow CDN and browser to cache the response for 2 minutes,
  // then serve stale for up to 5 minutes while revalidating.
  res.headers.set("Cache-Control", "public, s-maxage=120, stale-while-revalidate=300")
  return res
}
