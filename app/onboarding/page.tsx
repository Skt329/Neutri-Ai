import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { OnboardingForm } from "./onboarding-form"

export default async function OnboardingPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect("/auth/login?next=/onboarding")

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, onboarding_completed")
    .eq("id", user.id)
    .maybeSingle()

  if (profile?.onboarding_completed) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="mx-auto w-full max-w-2xl px-4 py-10 md:py-16">
        <header className="mb-8 flex flex-col gap-2">
          <p className="text-sm font-medium text-primary">Welcome to NutriAI</p>
          <h1 className="text-3xl font-semibold tracking-tight">Let&apos;s set up your plan</h1>
          <p className="text-muted-foreground leading-relaxed">
            A few quick details so your AI dietitian can calculate accurate targets and give you advice that actually
            fits.
          </p>
        </header>
        <OnboardingForm initialFullName={profile?.full_name ?? user.user_metadata?.full_name ?? ""} />
      </div>
    </div>
  )
}
