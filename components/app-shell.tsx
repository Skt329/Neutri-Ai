'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { cn } from '@/lib/utils'
import { Leaf, Home, MessageCircle, Utensils, Package, User, ShoppingBag, LogOut, Menu, X, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { useState } from 'react'

const NAV = [
  { href: '/dashboard', label: 'Dashboard', icon: Home },
  { href: '/chat', label: 'Chat', icon: MessageCircle, subtle: true },
  { href: '/meals', label: 'Meals', icon: Utensils },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/swiggy', label: 'Swiggy', icon: ShoppingBag },
  { href: '/profile', label: 'Profile', icon: User },
]

export function AppShell({
  children,
  userEmail,
  userName,
}: {
  children: React.ReactNode
  userEmail: string
  userName: string | null
}) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  async function signOut() {
    try {
      const supabase = createClient()
      await supabase.auth.signOut()
      router.push('/')
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sign out failed')
    }
  }

  const initials =
    (userName || userEmail || 'U')
      .split(/[\s@.]+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase() ?? '')
      .join('') || 'U'

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="sticky top-0 hidden h-screen w-72 flex-col border-r border-border/50 bg-gradient-to-b from-card via-card to-muted/20 md:flex backdrop-blur-xl">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-3 px-6 py-6 hover:opacity-80 transition-opacity">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Leaf className="w-6 h-6 text-primary-foreground" />
          </div>
          <div>
            <div className="font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">NutriAI</div>
            <div className="text-xs text-muted-foreground">AI Diet Assistant</div>
          </div>
        </Link>

        {/* Navigation */}
        <nav aria-label="Primary" className="flex-1 space-y-2 px-4 py-6 overflow-y-auto">
          {NAV.map((item) => {
            const Icon = item.icon
            const active = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 smooth-hover group',
                  active
                    ? item.subtle
                      ? 'text-muted-foreground hover:text-foreground'
                      : 'bg-gradient-to-r from-primary/20 to-secondary/10 text-primary font-medium border border-primary/30'
                    : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                )}
                onClick={() => setMobileMenuOpen(false)}
              >
                <Icon className="w-5 h-5 flex-shrink-0 group-hover:scale-110 transition-transform" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            )
          })}
        </nav>

        {/* User Profile Section */}
        <div className="border-t border-border/50 p-4 space-y-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted/50 transition-colors smooth-hover group">
                <Avatar className="w-10 h-10 flex-shrink-0">
                  <AvatarFallback className="bg-gradient-to-br from-primary/50 to-secondary/50 text-foreground font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1 text-left">
                  <p className="truncate text-sm font-semibold">{userName || 'Your Account'}</p>
                  <p className="truncate text-xs text-muted-foreground">{userEmail}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <Link href="/profile" className="flex items-center gap-2 cursor-pointer">
                  <User className="w-4 h-4" />
                  Profile Settings
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive flex items-center gap-2 cursor-pointer">
                <LogOut className="w-4 h-4" />
                Sign Out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex flex-1 flex-col">
        {/* Mobile Header */}
        <header className="sticky top-0 z-40 md:hidden border-b border-border/50 bg-card/50 backdrop-blur-lg">
          <div className="flex items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <Leaf className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-bold">NutriAI</span>
            </Link>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>

          {/* Mobile Menu */}
          {mobileMenuOpen && (
            <div className="border-t border-border/50 bg-card">
              <nav className="flex flex-col gap-1 p-3">
                {NAV.map((item) => {
                  const Icon = item.icon
                  const active = pathname === item.href || pathname.startsWith(item.href + '/')
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        'flex items-center gap-3 px-4 py-3 rounded-lg transition-all',
                        active
                          ? item.subtle
                            ? 'text-muted-foreground'
                            : 'bg-primary/20 text-primary font-medium'
                          : 'text-muted-foreground'
                      )}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <Icon className="w-5 h-5" />
                      <span className="text-sm font-medium">{item.label}</span>
                    </Link>
                  )
                })}
              </nav>
            </div>
          )}
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-auto">
          <div className="animate-fade-in-up">{children}</div>
        </main>

        {/* Mobile Bottom Navigation */}
        <nav className="sticky bottom-0 md:hidden border-t border-border/50 bg-card/50 backdrop-blur-lg">
          <div className="flex items-center justify-around">
            {NAV.slice(0, 4).map((item) => {
              const Icon = item.icon
              const active = pathname === item.href || pathname.startsWith(item.href + '/')
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex flex-1 flex-col items-center justify-center gap-1 py-3 px-2 text-xs font-medium transition-all smooth-hover',
                    active ? 'text-primary' : 'text-muted-foreground'
                  )}
                >
                  <Icon className={cn('w-6 h-6', active && 'text-primary')} />
                  <span className="truncate">{item.label}</span>
                </Link>
              )
            })}
          </div>
        </nav>
      </div>
    </div>
  )
}
