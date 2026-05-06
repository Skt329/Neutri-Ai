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
    <div className="max-w-2xl mx-auto px-4 md:px-8 py-6 md:py-8">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 animate-fade-in-up">
        <Button asChild variant="ghost" size="icon" className="text-stone hover:text-forest">
          <Link href="/pantry">
            <ArrowLeft className="size-4" />
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <div className="flex size-9 items-center justify-center rounded-xl bg-mint2 text-sage">
            <ScanBarcode className="size-5" />
          </div>
          <div>
            <h1 className="font-display text-xl font-bold text-ink">Scan Barcode</h1>
            <p className="text-xs text-stone">Point your camera at a product barcode</p>
          </div>
        </div>
      </div>

      {/* Scanner + results */}
      <BarcodePageClient />
    </div>
  )
}
