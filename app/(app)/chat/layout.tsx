import { getAuthUser } from '@/lib/supabase/auth'
import { getProfile } from '@/lib/supabase/profile'
import { getCachedConversations } from '@/lib/supabase/queries'
import { ChatSidebar } from '@/components/chat/chat-sidebar'
import { computeStreakInfo } from '@/lib/streaks'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getAuthUser()
  if (!user) return <>{children}</>

  // Use cached loaders for conversations and profile.
  // Only the streak meal-dates query hits Supabase fresh (lightweight, 8-day window).
  const [convos, profile, { data: mealDates }] = await Promise.all([
    getCachedConversations(user.id),
    getProfile(),
    supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', new Date(Date.now() - 8 * 24 * 3600 * 1000).toISOString())
      .order('logged_at', { ascending: false })
      .limit(100),
  ])

  // Compute streak from the already-fetched meal dates
  const streak = computeStreakInfo(
    (mealDates ?? []).map((m) => m.logged_at),
    profile?.timezone || 'UTC',
  )

  return (
    <div className="flex h-dvh md:h-[calc(100dvh-57px)] bg-cream">
      <ChatSidebar
        conversations={convos}
        userName={profile?.full_name ?? user.email?.split('@')[0] ?? null}
        streakDays={streak.currentStreak}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
