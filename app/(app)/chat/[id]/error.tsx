"use client"

import { useEffect } from "react"
import { Button } from "@/components/ui/button"
import { AlertCircle, RefreshCw } from "lucide-react"

export default function ChatError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error("[chat] Render error:", error)
  }, [error])

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="flex size-14 items-center justify-center rounded-full bg-clay/10 text-clay">
        <AlertCircle className="size-7" />
      </div>
      <div>
        <h2 className="font-display text-lg font-semibold text-ink">
          Something went wrong
        </h2>
        <p className="text-sm text-stone mt-1 max-w-md">
          The chat encountered an unexpected error. This usually resolves by refreshing.
        </p>
      </div>
      <Button
        onClick={reset}
        className="gap-2 bg-forest hover:bg-sage text-white rounded-full"
      >
        <RefreshCw className="size-4" /> Try again
      </Button>
    </div>
  )
}
