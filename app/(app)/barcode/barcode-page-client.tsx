"use client"

import { useState, useCallback } from "react"
import { BarcodeScanner } from "@/components/barcode/barcode-scanner"
import { ProductResultCard, type ProductResult, type PantryAddData } from "@/components/barcode/product-result-card"
import { toast } from "sonner"
import { useRouter } from "next/navigation"

type ScanState = "scanning" | "looking_up" | "result" | "adding" | "added"

export function BarcodePageClient() {
  const router = useRouter()
  const [state, setState] = useState<ScanState>("scanning")
  const [productResult, setProductResult] = useState<ProductResult | null>(null)

  const handleScan = useCallback(async (barcode: string) => {
    setState("looking_up")
    try {
      const res = await fetch("/api/barcode/lookup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ barcode }),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Lookup failed" }))
        toast.error(err.error || "Failed to look up barcode")
        setState("scanning")
        return
      }

      const data: ProductResult = await res.json()
      setProductResult(data)
      setState("result")
    } catch {
      toast.error("Network error — please check your connection")
      setState("scanning")
    }
  }, [])

  const handleAddToPantry = useCallback(async (data: PantryAddData) => {
    setState("adding")
    try {
      const res = await fetch("/api/barcode/add-to-pantry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "Add failed" }))
        toast.error(err.error || "Failed to add item")
        setState("result")
        return
      }

      setState("added")
      toast.success(`${data.name} added to pantry!`)
      // Revalidate pantry page data
      router.refresh()
    } catch {
      toast.error("Network error — please check your connection")
      setState("result")
    }
  }, [router])

  const handleScanAnother = useCallback(() => {
    setProductResult(null)
    setState("scanning")
  }, [])

  return (
    <div className="flex flex-col items-center gap-6">
      {/* Scanner (visible during scanning and looking_up states) */}
      {(state === "scanning" || state === "looking_up") && (
        <BarcodeScanner
          onScan={handleScan}
          disabled={state === "looking_up"}
        />
      )}

      {/* Loading indicator */}
      {state === "looking_up" && (
        <div className="flex items-center gap-2 text-sm text-stone animate-fade-in">
          <div className="size-5 rounded-full border-2 border-sage/30 border-t-sage animate-spin" />
          Looking up product…
        </div>
      )}

      {/* Product result */}
      {(state === "result" || state === "adding" || state === "added") && productResult && (
        <div className="w-full max-w-md">
          <ProductResultCard
            result={productResult}
            onAddToPantry={handleAddToPantry}
            onScanAnother={handleScanAnother}
            adding={state === "adding"}
            added={state === "added"}
          />
        </div>
      )}
    </div>
  )
}
