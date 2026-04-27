'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { ArrowRight, Zap, Brain, BarChart3, Leaf, Shield, Smartphone, Cloud } from 'lucide-react'
import { AnimatedCard, AnimatedCardContent } from '@/components/animated-card'

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
      <nav className="sticky top-0 z-50 border-b border-border/40 backdrop-blur-lg">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Leaf className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              NutriAI
            </span>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/auth/login">
              <Button variant="ghost">Sign In</Button>
            </Link>
            <Link href="/auth/sign-up">
              <Button className="bg-gradient-to-r from-primary to-secondary hover:opacity-90">Get Started</Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden px-6 py-20 md:py-32">
        {/* Animated background elements */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/20 rounded-full blur-3xl animate-float" />
          <div className="absolute bottom-20 right-10 w-72 h-72 bg-secondary/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }} />
          <div className="absolute top-1/2 left-1/2 w-96 h-96 bg-tertiary/10 rounded-full blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left: Text Content */}
            <div className="space-y-8 animate-fade-in-up">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-3 px-4 py-2 rounded-full border border-primary/30 bg-primary/10 backdrop-blur">
                  <Zap className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold text-primary">AI-Powered Nutrition</span>
                </div>
                <h1 className="text-5xl md:text-7xl font-bold leading-tight">
                  Your Intelligent{' '}
                  <span className="gradient-text">Diet Assistant</span>
                </h1>
                <p className="text-lg text-muted-foreground max-w-md">
                  Chat with an AI dietitian. Log meals naturally. Track nutrition effortlessly. Achieve your health goals smarter.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-4">
                <Link href="/auth/sign-up" className="group">
                  <Button size="lg" className="w-full sm:w-auto gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all">
                    Start Free Trial
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </Button>
                </Link>
                <Button size="lg" variant="outline">
                  Watch Demo
                </Button>
              </div>

              {/* Social Proof */}
              <div className="flex items-center gap-6 pt-8 border-t border-border/50">
                <div>
                  <p className="text-2xl font-bold">50K+</p>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">4.9★</p>
                  <p className="text-sm text-muted-foreground">App Rating</p>
                </div>
                <div>
                  <p className="text-2xl font-bold">98%</p>
                  <p className="text-sm text-muted-foreground">Goal Success</p>
                </div>
              </div>
            </div>

            {/* Right: Hero Image/Visualization */}
            <div className="hidden lg:flex items-center justify-center">
              <AnimatedCard variant="glass" className="w-full h-96" hoverEffect="none">
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-6">
                    <Brain className="w-24 h-24 text-primary mx-auto animate-float" />
                    <h3 className="text-2xl font-bold">Powered by AI</h3>
                    <p className="text-muted-foreground">Intelligent meal tracking & personalized nutrition insights</p>
                  </div>
                </div>
              </AnimatedCard>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="px-6 py-20 border-t border-border/40">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-4">Powerful Features</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Everything you need to take control of your nutrition
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { icon: Brain, title: 'AI Chat', description: 'Talk naturally with your AI dietitian' },
              { icon: BarChart3, title: 'Smart Analytics', description: 'Detailed nutrition breakdown & insights' },
              { icon: Leaf, title: 'Meal Planning', description: 'Get personalized meal recommendations' },
              { icon: Smartphone, title: 'Mobile Optimized', description: 'Perfect experience on any device' },
              { icon: Cloud, title: 'Cloud Sync', description: 'Access everywhere, always in sync' },
              { icon: Shield, title: 'Privacy First', description: 'Your data is secure and private' },
            ].map((feature, index) => (
              <AnimatedCard
                key={index}
                variant="gradient"
                hoverEffect="lift"
                className="group"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <AnimatedCardContent className="space-y-4">
                  <div className="w-12 h-12 rounded-lg bg-primary/20 flex items-center justify-center group-hover:bg-primary/30 transition-colors">
                    <feature.icon className="w-6 h-6 text-primary" />
                  </div>
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="text-sm text-muted-foreground">{feature.description}</p>
                </AnimatedCardContent>
              </AnimatedCard>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative px-6 py-20 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-secondary/10 to-accent/10" />
        <div className="relative max-w-4xl mx-auto text-center space-y-8">
          <h2 className="text-4xl md:text-5xl font-bold">Ready to Transform Your Health?</h2>
          <p className="text-lg text-muted-foreground">Join thousands of users who have already achieved their nutrition goals</p>
          <Link href="/auth/sign-up">
            <Button size="lg" className="gap-2 bg-gradient-to-r from-primary to-secondary hover:opacity-90">
              Start Your Free Trial
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/40 px-6 py-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="text-sm text-muted-foreground">© 2024 NutriAI. All rights reserved.</p>
          <div className="flex items-center gap-6 text-sm text-muted-foreground">
            <Link href="#" className="hover:text-foreground transition-colors">
              Privacy
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Terms
            </Link>
            <Link href="#" className="hover:text-foreground transition-colors">
              Contact
            </Link>
          </div>
        </div>
      </footer>
    </div>
  )
}

