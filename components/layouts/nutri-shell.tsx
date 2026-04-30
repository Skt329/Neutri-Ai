'use client'

import { usePathname } from 'next/navigation'
import { TopNav } from '@/components/navigation/top-nav'
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav'

interface NutriShellProps {
  children: React.ReactNode
  userName: string | null
}

export function NutriShell({ children, userName }: NutriShellProps) {
  const pathname = usePathname()
  // MobileBottomNav hides itself on individual chat pages — skip its
  // reserved padding so the chat input bar sits flush at the bottom.
  const isInChat = pathname?.match(/^\/chat\/[a-f0-9-]+/)

  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <TopNav userName={userName} />
      <main className={`flex-1 overflow-x-hidden ${isInChat ? '' : 'pb-[60px] md:pb-0'}`}>
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
