import Link from 'next/link'
import { redirect } from 'next/navigation'
import { getAuthUser } from '@/lib/supabase/auth'
import { Button } from '@/components/ui/button'
import {
  ArrowRight, Leaf, MessageSquareText, Target, ChefHat,
  ShoppingBag, BrainCircuit, BarChart3, Utensils, Sparkles,
} from 'lucide-react'

export const metadata = {
  title: 'NutriAI — Your AI Dietitian',
  description:
    'Chat with an AI dietitian that logs meals, tracks macros, generates recipes from your pantry, and orders food from Swiggy — all through natural conversation.',
}

export default async function LandingPage() {
  const { user } = await getAuthUser()
  if (user) redirect('/chat')

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* JSON-LD Structured Data */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "WebApplication",
            name: "NeutriAI",
            description: "AI-powered nutrition coaching. Log meals, track macros, generate recipes, and order food through natural conversation.",
            applicationCategory: "HealthApplication",
            operatingSystem: "Web",
            offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
            featureList: [
              "AI meal logging", "Macro tracking", "Pantry management",
              "Recipe generation", "Swiggy integration", "Streak tracking",
            ],
          }),
        }}
      />
      {/* ── Navigation ── */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 sm:size-10 rounded-xl bg-forest flex items-center justify-center">
              <Leaf className="size-4 sm:size-5 text-white" />
            </div>
            <span className="font-display text-lg sm:text-xl font-bold">
              <span className="text-forest">Nutri</span>
              <span className="text-turmeric">AI</span>
            </span>
          </div>
          <Link href="/auth/sign-up">
            <Button className="bg-forest hover:bg-sage text-white rounded-full px-4 sm:px-6 gap-1.5 sm:gap-2 text-sm sm:text-base">
              Get Started <ArrowRight className="size-3.5 sm:size-4" />
            </Button>
          </Link>
        </div>
      </nav>

      {/* ── Hero ── */}
      <section className="relative overflow-hidden px-4 sm:px-6 py-10 sm:py-16 md:py-28">
        {/* Animated background blobs */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-80 h-80 bg-mint/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-10 right-10 w-72 h-72 bg-turmeric-l/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-sage/5 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8 lg:gap-16 items-center">
            {/* Left: Text */}
            <div className="space-y-6 sm:space-y-8 animate-fade-in-up">
              <div className="space-y-3 sm:space-y-5">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-sage/20 bg-mint2/80">
                  <Sparkles className="size-3.5 text-sage" />
                  <span className="text-xs font-semibold tracking-wide text-sage">Agentic AI Nutrition Platform</span>
                </div>

                <h1 className="font-display text-[2rem] sm:text-5xl md:text-6xl lg:text-7xl font-bold leading-[1.1] text-ink">
                  Your Intelligent{' '}
                  <span className="hero-gradient-text">AI Dietitian</span>
                </h1>

                <p className="text-sm sm:text-base md:text-lg text-stone max-w-lg leading-relaxed">
                  Log meals through natural conversation. Get TDEE-based macro targets.
                  Generate recipes from your pantry. Order nutrition-smart meals from Swiggy.
                  All from a single chat.
                </p>
              </div>

              <Link href="/auth/sign-up" className="group inline-block">
                <Button size="lg" className="gap-2.5 bg-forest hover:bg-sage text-white rounded-full px-8 text-base">
                  Start Free
                  <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                </Button>
              </Link>

              {/* Tech stack badges */}
              <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 pt-4 sm:pt-6 border-t border-border">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-fog mr-1">Powered by</span>
                {[
                  'Next.js 16', 'GPT-4.1', 'Supabase', 'Vercel AI SDK', 'Swiggy MCP', 'pgvector',
                ].map((tech) => (
                  <span
                    key={tech}
                    className="inline-flex items-center px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-full bg-cream2 border border-border text-[10px] sm:text-[11px] font-medium text-stone"
                  >
                    {tech}
                  </span>
                ))}
              </div>
            </div>

            {/* Right: Chat preview */}
            <div className="animate-fade-in-up" style={{ animationDelay: '200ms' }}>
              <div className="relative">
                {/* Glow effect behind the card */}
                <div className="absolute -inset-4 bg-gradient-to-br from-mint/40 via-transparent to-turmeric-l/30 rounded-[2rem] blur-2xl opacity-60" />

                <div className="relative bg-card/90 backdrop-blur-xl rounded-2xl sm:rounded-3xl border border-border shadow-[var(--sh2)] overflow-hidden">
                  {/* Chat header */}
                  <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 py-3 sm:py-4 border-b border-border bg-forest/5">
                    <div className="size-7 sm:size-9 rounded-full bg-forest flex items-center justify-center">
                      <Leaf className="size-3.5 sm:size-4 text-white" />
                    </div>
                    <div>
                      <p className="text-xs sm:text-sm font-semibold text-ink">NutriAI</p>
                      <div className="flex items-center gap-1.5">
                        <span className="size-1.5 rounded-full bg-sage animate-pulse-dot" />
                        <span className="text-[10px] sm:text-[11px] text-sage font-medium">Online</span>
                      </div>
                    </div>
                  </div>

                  {/* Chat messages */}
                  <div className="px-3 sm:px-5 py-4 sm:py-6 space-y-3 sm:space-y-4">
                    {/* User message */}
                    <div className="flex justify-end">
                      <div className="bubble-user bg-forest text-white px-3 sm:px-4 py-2 sm:py-2.5 max-w-[85%] sm:max-w-[80%]">
                        <p className="text-xs sm:text-sm">I had 2 rotis with paneer butter masala and a glass of buttermilk for lunch</p>
                      </div>
                    </div>

                    {/* AI response */}
                    <div className="flex justify-start animate-fade-in-up" style={{ animationDelay: '400ms' }}>
                      <div className="bubble-ai bg-cream2 text-ink px-3 sm:px-4 py-2.5 sm:py-3 max-w-[90%] sm:max-w-[85%] space-y-2">
                        <p className="text-xs sm:text-sm">Got it! Here&apos;s the nutrition estimate:</p>
                        <div className="grid grid-cols-2 gap-1 sm:gap-1.5">
                          {[
                            { label: 'Calories', value: '~620 kcal', color: 'var(--macro-cal)' },
                            { label: 'Protein', value: '24g', color: 'var(--macro-protein)' },
                            { label: 'Carbs', value: '58g', color: 'var(--macro-carbs)' },
                            { label: 'Fat', value: '32g', color: 'var(--macro-fat)' },
                          ].map((m) => (
                            <div key={m.label} className="flex items-center gap-1.5 sm:gap-2 rounded-lg bg-card px-2 sm:px-2.5 py-1 sm:py-1.5">
                              <span className="size-1.5 rounded-full" style={{ background: m.color }} />
                              <span className="text-[10px] sm:text-[11px] text-stone">{m.label}</span>
                              <span className="text-[10px] sm:text-[11px] font-semibold text-ink ml-auto">{m.value}</span>
                            </div>
                          ))}
                        </div>
                        <p className="text-[11px] sm:text-[12px] text-sage font-medium pt-1">Shall I log this as lunch? 🍽️</p>
                      </div>
                    </div>

                    {/* Confirmation buttons */}
                    <div className="flex gap-1.5 sm:gap-2 pl-1 animate-fade-in-up" style={{ animationDelay: '600ms' }}>
                      <span className="inline-flex items-center px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full bg-forest text-white text-[11px] sm:text-xs font-semibold">
                        ✓ Confirm
                      </span>
                      <span className="inline-flex items-center px-3 sm:px-3.5 py-1 sm:py-1.5 rounded-full border border-border text-[11px] sm:text-xs font-medium text-stone">
                        Edit
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How It Works ── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 md:py-20">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-8 sm:mb-14 animate-fade-in-up">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-ink mb-2 sm:mb-3">How It Works</h2>
            <p className="text-sm sm:text-base text-stone max-w-lg mx-auto">Three steps to effortless nutrition tracking</p>
          </div>

          <div className="grid md:grid-cols-3 gap-4 sm:gap-8 md:gap-6">
            {[
              {
                step: '01',
                icon: MessageSquareText,
                title: 'Tell it what you ate',
                desc: 'No food databases to search. Just describe your meal naturally — "2 eggs, toast, and coffee".',
              },
              {
                step: '02',
                icon: Target,
                title: 'AI estimates nutrition',
                desc: 'GPT-4.1 estimates macros instantly. Confirms with you before logging — you stay in control.',
              },
              {
                step: '03',
                icon: BarChart3,
                title: 'Track, learn, improve',
                desc: 'See your daily progress, get deficit alerts, and let the AI remember your preferences forever.',
              },
            ].map((item, i) => (
              <div
                key={item.step}
                className="relative flex flex-col items-center text-center p-4 sm:p-6 animate-fade-in-up"
                style={{ animationDelay: `${i * 120}ms` }}
              >
                <div className="flex items-center justify-center size-12 sm:size-14 rounded-2xl bg-mint2 mb-3 sm:mb-5 ring-1 ring-sage/10">
                  <item.icon className="size-6 text-sage" />
                </div>
                <span className="absolute top-3 right-3 sm:top-4 sm:right-4 md:right-auto md:left-4 text-[10px] sm:text-[11px] font-bold text-fog/60 font-display">{item.step}</span>
                <h3 className="text-sm sm:text-base font-semibold text-ink mb-1 sm:mb-2">{item.title}</h3>
                <p className="text-xs sm:text-sm text-stone leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Features ── */}
      <section className="px-4 sm:px-6 py-10 sm:py-16 md:py-20 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-8 sm:mb-14 animate-fade-in-up">
            <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-ink mb-2 sm:mb-3">Built Different</h2>
            <p className="text-stone max-w-lg mx-auto">
              Not another calorie counter. An agentic AI that acts on your behalf.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-5">
            {[
              {
                icon: BrainCircuit,
                title: 'AI Dietitian Chat',
                desc: 'Log meals in natural language. No food databases, no manual entry. Just say what you ate.',
              },
              {
                icon: Target,
                title: 'Smart Macro Targets',
                desc: 'Auto-calculated TDEE using Mifflin-St Jeor, adjusted for your goal — lose, maintain, or gain.',
              },
              {
                icon: ChefHat,
                title: 'Recipes from Pantry',
                desc: 'AI generates recipes using what\'s actually in your pantry, respecting allergies and preferences.',
              },
              {
                icon: ShoppingBag,
                title: 'Swiggy Integration',
                desc: 'Order food directly from chat. AI filters menus by your remaining macros and dietary restrictions.',
              },
              {
                icon: Sparkles,
                title: 'Long-Term Memory',
                desc: '"I\'m lactose intolerant" — said once, remembered forever via semantic vector memory.',
              },
              {
                icon: BarChart3,
                title: 'Daily Insights',
                desc: 'Calorie rings, macro bars, deficit alerts, meal gap detection — all on your dashboard.',
              },
            ].map((feature, i) => (
              <div
                key={feature.title}
                className="group p-4 sm:p-6 rounded-xl sm:rounded-2xl bg-card border border-border smooth-hover hover:shadow-md hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="size-9 sm:size-11 rounded-lg sm:rounded-xl bg-mint2 flex items-center justify-center mb-3 sm:mb-4 group-hover:bg-mint smooth-hover">
                  <feature.icon className="size-5 text-sage" />
                </div>
                <h3 className="text-sm sm:text-[15px] font-semibold text-ink mb-1 sm:mb-1.5">{feature.title}</h3>
                <p className="text-xs sm:text-sm text-stone leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA Banner ── */}
      <section className="relative px-4 sm:px-6 py-10 sm:py-16 md:py-20 overflow-hidden">
        <div className="absolute inset-0 bg-forest" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(46,96,72,0.8),transparent_60%)]" />
        <div className="relative max-w-3xl mx-auto text-center space-y-4 sm:space-y-6">
          <Utensils className="size-8 sm:size-10 text-white/30 mx-auto" />
          <h2 className="font-display text-2xl sm:text-3xl md:text-4xl font-bold text-white">
            Start your nutrition journey
          </h2>
          <p className="text-white/60 max-w-md mx-auto">
            Free to use. No credit card. Just a smarter way to eat.
          </p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2 bg-turmeric hover:bg-turmeric/90 text-ink rounded-full px-8 font-semibold">
              Get Started <ArrowRight className="size-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="border-t border-border px-6 py-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="size-7 rounded-lg bg-forest flex items-center justify-center">
              <Leaf className="size-3.5 text-white" />
            </div>
            <span className="font-display text-sm font-bold">
              <span className="text-forest">Nutri</span>
              <span className="text-turmeric">AI</span>
            </span>
          </div>
          <p className="text-xs text-fog">© 2025 NutriAI · Built with agentic AI</p>
        </div>
      </footer>
    </div>
  )
}
