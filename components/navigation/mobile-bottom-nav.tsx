'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, LayoutGrid, Package, UserCircle } from 'lucide-react'
import { cn } from '@/lib/utils'

const TABS = [
  { href: '/chat', label: 'Chat', icon: MessageSquare },
  { href: '/dashboard', label: 'Today', icon: LayoutGrid },
  { href: '/pantry', label: 'Pantry', icon: Package },
  { href: '/profile', label: 'Me', icon: UserCircle },
] as const

export function MobileBottomNav() {
  const pathname = usePathname()

  // Hide on individual chat pages where the input bar occupies the bottom
  const isInChat = pathname?.match(/^\/chat\/[a-f0-9-]+/)
  if (isInChat) return null

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border flex items-center justify-around h-[60px] safe-area-pb">
      {TABS.map(({ href, label, icon: Icon }) => {
        const active = pathname?.startsWith(href)
        return (
          <Link
            key={href}
            href={href}
            className={cn(
              'flex flex-col items-center justify-center gap-0.5 flex-1 h-full smooth-hover',
              active ? 'text-forest' : 'text-fog'
            )}
          >
            <Icon className={cn('size-5', active && 'animate-bounce-subtle')} />
            <span className="text-[10px] font-semibold uppercase tracking-wider">
              {label}
            </span>
          </Link>
        )
      })}
    </nav>
  )
}
