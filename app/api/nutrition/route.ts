/**
 * GET /api/nutrition?q=chicken+breast&qty=200&barcode=...
 *
 * Authenticated REST endpoint for client-side nutrition lookups.
 * Rate limited to 10 req/min per user via Upstash Redis (with in-memory fallback).
 */

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lookupNutrition } from "@/lib/nutrition/nutrition-lookup"
import { scaleNutrition } from "@/lib/nutrition/scale"
import { limitNutrition } from "@/lib/redis"
import { NutritionRequestSchema } from "@/lib/validation/api-schemas"
import { apiError } from "@/lib/validation/with-validation"

// ── Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return apiError("Not authenticated", "UNAUTHORIZED", 401)
  }

  // Redis-backed rate limiter (works across all serverless instances)
  const rl = await limitNutrition(user.id)
  if (!rl.success) {
    return apiError("Rate limit exceeded (10/min)", "RATE_LIMITED", 429)
  }

  // Validate query parameters with Zod
  const { searchParams } = new URL(req.url)
  const parseResult = NutritionRequestSchema.safeParse({
    q: searchParams.get("q") ?? undefined,
    barcode: searchParams.get("barcode") ?? undefined,
    qty: searchParams.get("qty") ?? undefined,
  })

  if (!parseResult.success) {
    return apiError(
      "Invalid parameters",
      "VALIDATION_ERROR",
      400,
      parseResult.error.flatten(),
    )
  }

  const { q: query, barcode, qty: quantityG } = parseResult.data

  try {
    const results = await lookupNutrition(query || barcode || "", {
      barcode: barcode || undefined,
    })

    // Scale if qty provided
    const scaled =
      quantityG && quantityG > 0
        ? results.map((r) => scaleNutrition(r, quantityG))
        : results

    return NextResponse.json({ results: scaled })
  } catch (err) {
    console.error("[api/nutrition]", err)
    return apiError("Nutrition lookup failed", "LOOKUP_FAILED", 502)
  }
}
