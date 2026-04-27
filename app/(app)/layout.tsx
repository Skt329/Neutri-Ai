import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { ChatFirstLayout } from "@/components/layouts/chat-first-layout"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/auth/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  if (!profile?.onboarding_completed) {
    redirect("/onboarding")
  }

  return (
    <ChatFirstLayout userEmail={user.email ?? ""} userName={profile?.full_name ?? null}>
      {children}
    </ChatFirstLayout>
  )
}
