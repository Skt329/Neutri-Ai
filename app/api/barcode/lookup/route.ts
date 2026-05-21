/**
 * POST /api/barcode/lookup
 *
 * Authenticated barcode → nutrition lookup endpoint.
 * Wraps the existing lookupNutrition() orchestrator with barcode mode.
 */

import { NextResponse } from "next/server"
import { withAuth } from "@/lib/api/with-auth"
import { lookupNutrition } from "@/lib/nutrition/nutrition-lookup"
import { BarcodeRequestSchema } from "@/lib/validation/api-schemas"
import { parseBody, apiError } from "@/lib/validation/with-validation"

export const POST = withAuth(async (req, { user }) => {
  // Validate barcode format with Zod
  const parsed = await parseBody(req, BarcodeRequestSchema)
  if (parsed instanceof NextResponse) return parsed
  const { barcode } = parsed

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
    return apiError("Barcode lookup failed", "LOOKUP_FAILED", 502)
  }
})
