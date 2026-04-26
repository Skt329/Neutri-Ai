import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { AppShell } from "@/components/app-shell"

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
    <AppShell userEmail={user.email ?? ""} userName={profile?.full_name ?? null}>
      {children}
    </AppShell>
  )
}
