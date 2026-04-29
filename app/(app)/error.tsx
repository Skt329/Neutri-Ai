"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, Home } from "lucide-react"
import Link from "next/link"

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[app] Unhandled error:", error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-clay/10 text-clay">
        <AlertCircle className="size-7" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Unexpected error
        </h2>
        <p className="text-sm text-stone mt-1 max-w-md">
          Something went wrong. Please try again or return to the dashboard.
        </p>
      </div>
      <div className="flex gap-3">
        <Button onClick={reset} variant="outline" className="rounded-full">
          Try again
        </Button>
        <Button asChild className="gap-2 bg-forest hover:bg-sage text-white rounded-full">
          <Link href="/dashboard">
            <Home className="size-4" /> Dashboard
          </Link>
        </Button>
      </div>
    </div>
  )
}
