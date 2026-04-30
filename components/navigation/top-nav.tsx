'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutGrid, Package, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/navigation/streak-badge'
import { ThemeToggle } from '@/components/theme-toggle'

const NAV_ITEMS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard', label: 'Today', icon: LayoutGrid },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/profile', label: 'Me', icon: UserCircle },
] as const

interface TopNavProps {
  userName: string | null
}

export function TopNav({ userName }: TopNavProps) {
  const pathname = usePathname()

  return (
    <header className="hidden md:flex items-center justify-between px-6 py-3 bg-card border-b border-border sticky top-0 z-40">
      {/* Logo */}
      <Link href="/dashboard" className="flex items-center gap-1 group">
        <span className="font-display text-xl font-bold text-forest group-hover:scale-105 transition-transform">
          Nutri
        </span>
        <span className="font-display text-xl font-bold text-turmeric group-hover:scale-105 transition-transform">
          AI
        </span>
      </Link>

      {/* Nav pills */}
      <nav className="flex items-center gap-1 bg-cream2 rounded-full p-1">
        {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
          const active = pathname?.startsWith(href)
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium smooth-hover',
                active
                  ? 'bg-forest text-white shadow-sm'
                  : 'text-stone hover:text-ink hover:bg-cream3'
              )}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* Right side: streak (async) + avatar */}
      <div className="flex items-center gap-3">
        <StreakBadge />
        <ThemeToggle />
        <Link
          href="/profile"
          className="flex items-center justify-center size-9 rounded-full bg-forest text-white text-sm font-semibold smooth-hover hover:ring-2 hover:ring-sage/30"
        >
          {userName?.[0]?.toUpperCase() ?? 'U'}
        </Link>
      </div>
    </header>
  )
}
