"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import { User, Settings } from "lucide-react"
import { cn } from "@/lib/utils"

type TabId = "profile" | "settings"

interface ProfileTabsProps {
  profileContent: React.ReactNode
  settingsContent: React.ReactNode
}

const TABS = [
  { id: "profile" as const, label: "Profile", icon: User },
  { id: "settings" as const, label: "Settings", icon: Settings },
]

function isValidTab(v: string | null): v is TabId {
  return v === "profile" || v === "settings"
}

export function ProfileTabs({ profileContent, settingsContent }: ProfileTabsProps) {
  const searchParams = useSearchParams()
  const tabParam = searchParams.get("tab")
  const [activeTab, setActiveTab] = useState<TabId>(isValidTab(tabParam) ? tabParam : "profile")

  // Sync when URL changes externally (e.g. dropdown menu navigation)
  useEffect(() => {
    if (isValidTab(tabParam) && tabParam !== activeTab) {
      setActiveTab(tabParam)
    }
  }, [tabParam, activeTab])

  function handleTabChange(tab: TabId) {
    setActiveTab(tab)
    // Update URL without navigation so back button works and state is bookmarkable
    const url = new URL(window.location.href)
    if (tab === "profile") {
      url.searchParams.delete("tab")
    } else {
      url.searchParams.set("tab", tab)
    }
    window.history.replaceState(null, "", url.toString())
  }

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
              onClick={() => handleTabChange(id)}
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

