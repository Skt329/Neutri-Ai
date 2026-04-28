'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Brain, BarChart3, Leaf, Shield, Smartphone, Cloud } from 'lucide-react'

export default function LandingPage() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const checkUser = async () => {
      try {
        const supabase = createClient()
        const { data: { user } } = await supabase.auth.getUser()
        setUser(user)
        if (user) {
          router.push('/chat')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
      } finally {
        setLoading(false)
      }
    }
    checkUser()
  }, [router])

  if (loading) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Navigation */}
      <nav className="sticky top-0 z-50 border-b border-border bg-card/80 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-forest flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-xl font-bold">
              <span className="text-forest">Nutri</span>
              <span className="text-turmeric">AI</span>
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost" className="text-stone hover:text-ink">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-forest hover:bg-sage text-white rounded-full px-5">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-mint/30 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-turmeric-l/40 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-sage/30 bg-mint2">
                  <Zap className="w-4 h-4 text-sage" />
                  <span className="text-sm font-semibold text-sage">AI-Powered Nutrition</span>
                </div>
                <h1 className="font-display text-5xl md:text-7xl font-bold leading-tight text-ink">
                  Your Intelligent{' '}
                  <span className="text-sage">Diet Assistant</span>
                </h1>
                <p className="text-lg text-stone max-w-md">
                  Chat with an AI dietitian. Log meals naturally. Track nutrition effortlessly. Achieve your health goals smarter.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/sign-up" className="group">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-forest hover:bg-sage text-white rounded-full px-6">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline" className="rounded-full border-cream3 text-stone">
                  Watch Demo
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-8 border-t border-border">
                <div>
                  <p className="font-display text-2xl font-bold text-ink">50K+</p>
                  <p className="text-sm text-stone">Active Users</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-ink">4.9★</p>
                  <p className="text-sm text-stone">App Rating</p>
                </div>
                <div>
                  <p className="font-display text-2xl font-bold text-ink">98%</p>
                  <p className="text-sm text-stone">Goal Success</p>
                </div>
              </div>
            </div>

            {/* Right: Hero Card */}
            <div className="hidden lg:flex items-center justify-center">
              <div className="w-full h-96 rounded-3xl bg-card border border-border p-8 flex items-center justify-center shadow-lg">
                <div className="text-center space-y-6">
                  <Brain className="w-24 h-24 text-sage mx-auto animate-float" />
                  <h3 className="font-display text-2xl font-bold text-ink">Powered by AI</h3>
                  <p className="text-stone">Intelligent meal tracking & personalized nutrition insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold mb-4 text-ink">Powerful Features</h2>
            <p className="text-lg text-stone max-w-2xl mx-auto">
              Everything you need to take control of your nutrition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: Brain, title: 'AI Chat', description: 'Talk naturally with your AI dietitian' },
              { icon: BarChart3, title: 'Smart Analytics', description: 'Detailed nutrition breakdown & insights' },
              { icon: Leaf, title: 'Meal Planning', description: 'Get personalized meal recommendations' },
              { icon: Smartphone, title: 'Mobile Optimized', description: 'Perfect experience on any device' },
              { icon: Cloud, title: 'Cloud Sync', description: 'Access everywhere, always in sync' },
              { icon: Shield, title: 'Privacy First', description: 'Your data is secure and private' },
            ].map((feature, index) => (
              <div
                key={index}
                className="group p-6 rounded-2xl bg-card border border-border smooth-hover hover:shadow-md hover:-translate-y-1 animate-fade-in-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-12 h-12 rounded-xl bg-mint2 flex items-center justify-center mb-4 group-hover:bg-mint smooth-hover">
                  <feature.icon className="w-6 h-6 text-sage" />
                </div>
                <h3 className="text-lg font-semibold text-ink mb-1">{feature.title}</h3>
                <p className="text-sm text-stone">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-mint/30 via-cream to-turmeric-l/30" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-ink">Ready to Transform Your Health?</h2>
          <p className="text-lg text-stone">Join thousands of users who have already achieved their nutrition goals</p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2 bg-forest hover:bg-sage text-white rounded-full px-8">
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-fog">© 2024 NutriAI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-stone">
            <Link href="#" className="hover:text-ink smooth-hover">Privacy</Link>
            <Link href="#" className="hover:text-ink smooth-hover">Terms</Link>
            <Link href="#" className="hover:text-ink smooth-hover">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
