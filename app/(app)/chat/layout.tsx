import { getAuthUser } from '@/lib/supabase/auth'
import { ChatSidebar } from '@/components/chat/chat-sidebar'

export const dynamic = 'force-dynamic'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getAuthUser()
  if (!user) return <>{children}</>

  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()

  const [{ data: convos }, { data: profile }, { data: mealDates }] = await Promise.all([
    supabase
      .from('conversations')
      .select('id, title, updated_at')
      .eq('user_id', user.id)
      .order('updated_at', { ascending: false })
      .limit(50),
    supabase
      .from('profiles')
      .select('full_name')
      .eq('id', user.id)
      .maybeSingle(),
    supabase
      .from('meal_logs')
      .select('logged_at')
      .eq('user_id', user.id)
      .gte('logged_at', since)
      .order('logged_at', { ascending: false })
      .limit(200),
  ])

  // Compute streak from the already-fetched meal dates
  let streakDays = 0
  try {
    if (mealDates && mealDates.length > 0) {
      const loggedDays = new Set(
        mealDates.map((m) => {
          const d = new Date(m.logged_at)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
        })
      )
      const now = new Date()
      for (let d = 0; d < 30; d++) {
        const day = new Date(now.getFullYear(), now.getMonth(), now.getDate() - d)
        const key = `${day.getFullYear()}-${String(day.getMonth() + 1).padStart(2, '0')}-${String(day.getDate()).padStart(2, '0')}`
        if (loggedDays.has(key)) streakDays++
        else break
      }
    }
  } catch {
    // Non-critical, streak stays 0
  }

  return (
    <div className="flex h-[calc(100dvh-56px)] md:h-[calc(100dvh-57px)] bg-cream">
      <ChatSidebar
        conversations={convos ?? []}
        userName={profile?.full_name ?? user.email?.split('@')[0] ?? null}
        streakDays={streakDays}
      />
      <div className="flex flex-1 flex-col min-w-0">
        {children}
      </div>
    </div>
  )
}
