import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Leaf, MessageCircle, Utensils, Target, Sparkles, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

export default async function Home() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <header className="border-b border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
          <Link href="/" className="flex items-center gap-2">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Leaf className="size-4" aria-hidden />
            </span>
            <span className="font-semibold">NutriAI</span>
          </Link>
          <nav className="flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/auth/login">Sign in</Link>
                </Button>
                <Button asChild>
                  <Link href="/auth/sign-up">Get started</Link>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main>
        <section className="mx-auto max-w-6xl px-4 py-16 md:py-24">
          <div className="flex flex-col items-center gap-6 text-center">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
              <Sparkles className="size-3.5" aria-hidden />
              Your AI dietitian, always on
            </span>
            <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-6xl">
              Nutrition coaching that actually fits your life.
            </h1>
            <p className="max-w-2xl text-pretty text-base text-muted-foreground md:text-lg leading-relaxed">
              Log meals in plain English, hit your macros, and get real-time guidance from an AI dietitian that remembers
              your goals, pantry, and preferences.
            </p>
            <div className="flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href={user ? "/dashboard" : "/auth/sign-up"}>
                  {user ? "Open dashboard" : "Start for free"}
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="#features">See how it works</Link>
              </Button>
            </div>
          </div>
        </section>

        <section id="features" className="mx-auto max-w-6xl px-4 pb-16 md:pb-24">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            <FeatureCard
              icon={<MessageCircle className="size-5" aria-hidden />}
              title="Chat your meals in"
              body="Say 'two eggs and toast' and NutriAI logs calories, protein, carbs, and fat automatically."
            />
            <FeatureCard
              icon={<Target className="size-5" aria-hidden />}
              title="Personalized targets"
              body="Targets are calculated from your body metrics, activity level, and goal — and adjust as you progress."
            />
            <FeatureCard
              icon={<Utensils className="size-5" aria-hidden />}
              title="What can I cook?"
              body="Ask for ideas and NutriAI uses what's in your pantry, your allergies, and macros left for the day."
            />
            <FeatureCard
              icon={<Sparkles className="size-5" aria-hidden />}
              title="Remembers you"
              body="Long-term memory learns your routines, so advice feels specific — not generic."
            />
            <FeatureCard
              icon={<ShieldCheck className="size-5" aria-hidden />}
              title="Private by design"
              body="Your data is yours. Row-level security in Postgres keeps every record scoped to you."
            />
            <FeatureCard
              icon={<Leaf className="size-5" aria-hidden />}
              title="Built for real life"
              body="Meal ideas work around what you actually have, what you like, and the time you've got."
            />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-6 text-sm text-muted-foreground">
          <span>© {new Date().getFullYear()} NutriAI</span>
          <span>Built for people who eat real food.</span>
        </div>
      </footer>
    </div>
  )
}

function FeatureCard({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode
  title: string
  body: string
}) {
  return (
    <Card>
      <CardContent className="flex flex-col gap-3 pt-6">
        <span className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">{icon}</span>
        <h3 className="font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground leading-relaxed">{body}</p>
      </CardContent>
    </Card>
  )
}
