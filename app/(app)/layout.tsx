import { redirect } from "next/navigation"
import { getAuthUser } from "@/lib/supabase/auth"
import { NutriShell } from "@/components/layouts/nutri-shell"

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, supabase } = await getAuthUser()

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
    <NutriShell userName={profile?.full_name ?? null}>
      {children}
    </NutriShell>
  )
}
