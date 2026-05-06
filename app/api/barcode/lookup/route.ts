/**
 * POST /api/barcode/lookup
 *
 * Authenticated barcode → nutrition lookup endpoint.
 * Wraps the existing lookupNutrition() orchestrator with barcode mode.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lookupNutrition } from "@/lib/nutrition/nutrition-lookup"

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  let body: { barcode?: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
  }

  const barcode = body.barcode?.trim()
  if (!barcode || barcode.length < 8 || !/^\d+$/.test(barcode)) {
    return NextResponse.json(
      { error: "Invalid barcode. Expected 8–14 digit EAN/UPC." },
      { status: 400 },
    )
  }

  try {
    const results = await lookupNutrition(barcode, { barcode })

    if (results.length === 0) {
      return NextResponse.json({ found: false })
    }

    const best = results[0]
    // Extract brand from name if present (OFF format: "Product Name — Brand")
    const nameParts = best.name.split(" — ")
    const productName = nameParts[0]?.trim() || best.name
    const brand = nameParts[1]?.trim() || undefined

    return NextResponse.json({
      found: true,
      product: {
        name: productName,
        brand,
        barcode,
        nutrition: best,
      },
    })
  } catch (err) {
    console.error("[api/barcode/lookup]", err)
    return NextResponse.json({ error: "Barcode lookup failed" }, { status: 502 })
  }
}
