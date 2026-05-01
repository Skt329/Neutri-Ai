"use client"

import { useState } from "react"
import { User, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

interface ProfileTabsProps {
  profileContent: React.ReactNode
  settingsContent: React.ReactNode
}

const TABS = [
  { id: "profile" as const, label: "Profile", icon: User },
  { id: "settings" as const, label: "Settings", icon: Settings },
]

export function ProfileTabs({ profileContent, settingsContent }: ProfileTabsProps) {
  const [activeTab, setActiveTab] = useState<"profile" | "settings">("profile")

  return (
    <div>
      {/* Tab navigation — pill-style */}
      <nav className="flex items-center gap-1 bg-cream2 rounded-full p-1 mb-6 w-fit" role="tablist">
        {TABS.map(({ id, label, icon: Icon }) => {
          const isActive = activeTab === id
          return (
            <button
              key={id}
              role="tab"
              aria-selected={isActive}
              onClick={() => setActiveTab(id)}
              className={cn(
                "flex items-center gap-2 px-5 py-2.5 rounded-full text-sm font-medium smooth-hover",
                isActive
                  ? "bg-forest text-white shadow-sm"
                  : "text-stone hover:text-ink hover:bg-cream3",
              )}
            >
              <Icon className="size-4" />
              {label}
            </button>
          )
        })}
      </nav>

      {/* Tab content */}
      <div role="tabpanel" className="animate-fade-in">
        {activeTab === "profile" ? profileContent : settingsContent}
      </div>
    </div>
  )
}
