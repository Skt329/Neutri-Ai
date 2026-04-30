'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  // Avoid hydration mismatch
  if (!mounted) {
    return (
      <div className="flex items-center justify-center size-9 rounded-full bg-cream2 border border-border">
        <Sun className="size-4 text-stone" />
      </div>
    )
  }

  const Icon = theme === 'dark' ? Moon : theme === 'system' ? Monitor : Sun

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center justify-center size-9 rounded-full bg-cream2 border border-border hover:bg-cream3 smooth-hover"
          aria-label="Toggle theme"
        >
          <Icon className="size-4 text-stone" />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-36">
        <DropdownMenuItem onClick={() => setTheme('light')} className={cn(theme === 'light' && 'bg-accent/10')}>
          <Sun className="mr-2 size-3.5" /> Light
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('dark')} className={cn(theme === 'dark' && 'bg-accent/10')}>
          <Moon className="mr-2 size-3.5" /> Dark
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => setTheme('system')} className={cn(theme === 'system' && 'bg-accent/10')}>
          <Monitor className="mr-2 size-3.5" /> System
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
