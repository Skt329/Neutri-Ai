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
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:z-50 focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-forest focus:text-white focus:rounded-lg"
      >
        Skip to content
      </a>
      <main id="main-content">
        {children}
      </main>
    </NutriShell>
  )
}
