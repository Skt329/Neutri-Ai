'use client'

import { Search } from 'lucide-react'

interface SidebarSearchProps {
  value: string
  onChange: (value: string) => void
}

export function SidebarSearch({ value, onChange }: SidebarSearchProps) {
  return (
    <div className="px-3 py-2">
      <div className="flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2">
        <Search className="size-3.5 text-white/50" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="Search chats…"
          aria-label="Search conversations"
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/40 outline-none"
        />
      </div>
    </div>
  )
}
