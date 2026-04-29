import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/auth"
import { getProfile } from "@/lib/supabase/profile"
import { NutriShell } from "@/components/layouts/nutri-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user } = await getAuthUser()

  if (!user) redirect("/auth/login")

  const profile = await getProfile()

  if (!profile?.onboarding_completed) {
    redirect("/onboarding")
  }

  return (
    <NutriShell userName={profile?.full_name ?? null}>
      {children}
    </NutriShell>
  )
}
