import { getAuthUser } from "@/lib/supabase/auth"
import { BarcodePageClient } from "./barcode-page-client"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowLeft, ScanBarcode } from "lucide-react"

export const metadata = {
  title: "Scan Barcode — NutriAI",
  description: "Scan a product barcode to look up nutrition info and add it to your pantry.",
}

export default async function BarcodePage() {
  const { user } = await getAuthUser()
  if (!user) return null

  return (
    <div className="flex flex-col h-full bg-cream">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-border bg-card sticky top-0 z-10">
        <Button asChild variant="ghost" size="icon" className="text-stone hover:text-forest rounded-full">
          <Link href="/pantry">
            <ArrowLeft className="size-5" />
          </Link>
        </Button>
        <div className="flex items-center gap-2.5 flex-1">
          <div className="flex size-9 items-center justify-center rounded-xl bg-mint2 text-sage">
            <ScanBarcode className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-lg font-bold text-ink leading-tight">Scan Barcode</h1>
            <p className="text-[11px] text-stone">Look up nutrition & add to pantry</p>
          </div>
        </div>
      </div>

      {/* Scanner + results — fills remaining height */}
      <div className="flex-1 overflow-y-auto px-4 py-6 md:px-8">
        <div className="max-w-lg mx-auto">
          <BarcodePageClient />
        </div>
      </div>
    </div>
  )
}
