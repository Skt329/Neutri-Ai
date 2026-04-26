"use client"

import { useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { RefreshCw } from "lucide-react"
import { recomputeTargets } from "./actions"
import { toast } from "sonner"

export function RecomputeButton() {
  const [pending, startTransition] = useTransition()
  function onClick() {
    startTransition(async () => {
      const res = await recomputeTargets()
      if (res && "ok" in res) {
        if (res.ok) toast.success("Targets recomputed")
        else toast.error(res.error)
      }
    })
  }
  return (
    <Button variant="outline" onClick={onClick} disabled={pending}>
      {pending ? (
        <>
          <Spinner className="size-4" /> Recomputing…
        </>
      ) : (
        <>
          <RefreshCw className="mr-2 size-4" /> Recompute targets
        </>
      )}
    </Button>
  )
}
