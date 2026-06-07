'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MessageSquare, LayoutGrid, Package, UserCircle, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { StreakBadge } from '@/components/navigation/streak-badge'
import { ThemeToggle } from '@/components/theme-toggle'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LogoutButton } from '@/components/logout-button'

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
              aria-current={active ? 'page' : undefined}
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

      {/* Right side: streak + theme + avatar menu */}
      <div className="flex items-center gap-3">
        <StreakBadge />
        <ThemeToggle />

        {/* Avatar with dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              className="flex items-center justify-center size-9 rounded-full bg-forest text-white text-sm font-semibold smooth-hover hover:ring-2 hover:ring-sage/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sage/50"
              aria-label="Account menu"
            >
              {userName?.[0]?.toUpperCase() ?? 'U'}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <div className="px-2 py-1.5">
              <p className="text-sm font-medium text-ink truncate">{userName ?? 'User'}</p>
            </div>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="cursor-pointer">
                <UserCircle className="mr-2 size-4" />
                Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/profile?tab=settings" className="cursor-pointer">
                <Settings className="mr-2 size-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild className="p-0">
              <LogoutButton variant="menu-item" />
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  )
}
