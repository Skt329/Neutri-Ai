'use client'

import { TopNav } from '@/components/navigation/top-nav'
import { MobileBottomNav } from '@/components/navigation/mobile-bottom-nav'

interface NutriShellProps {
  children: React.ReactNode
  userName: string | null
}

export function NutriShell({ children, userName }: NutriShellProps) {
  return (
    <div className="flex flex-col min-h-dvh bg-background">
      <TopNav userName={userName} />
      <main className="flex-1 pb-[60px] md:pb-0 overflow-x-hidden">
        {children}
      </main>
      <MobileBottomNav />
    </div>
  )
}
