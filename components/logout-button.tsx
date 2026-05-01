"use client"

import { useCallback, useState } from "react"
import { LogOut } from "lucide-react"
import { Spinner } from "@/components/ui/spinner"
import { signOutAction } from "@/app/(app)/profile/settings-actions"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface LogoutButtonProps {
  variant?: "menu-item" | "button"
  className?: string
}

export function LogoutButton({ variant = "button", className }: LogoutButtonProps) {
  const [pending, setPending] = useState(false)

  const handleSignOut = useCallback(async () => {
    setPending(true)
    try {
      await signOutAction()
    } catch {
      toast.error("Failed to sign out")
      setPending(false)
    }
  }, [])

  if (variant === "menu-item") {
    return (
      <button
        onClick={handleSignOut}
        disabled={pending}
        className={cn(
          "flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm text-clay hover:bg-clay/5 cursor-pointer disabled:opacity-50",
          className,
        )}
      >
        {pending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
        {pending ? "Signing out…" : "Sign out"}
      </button>
    )
  }

  return (
    <button
      onClick={handleSignOut}
      disabled={pending}
      className={cn(
        "flex items-center gap-2 rounded-lg border border-clay/30 px-3 py-2 text-sm text-clay hover:bg-clay/5 smooth-hover disabled:opacity-50",
        className,
      )}
    >
      {pending ? <Spinner className="size-4" /> : <LogOut className="size-4" />}
      {pending ? "Signing out…" : "Sign out"}
    </button>
  )
}
