/**
 * GET /api/nutrition?q=chicken+breast&qty=200&barcode=...
 *
 * Authenticated REST endpoint for client-side nutrition lookups.
 * Rate limited to 10 req/min per user.
 */

import { NextResponse, type NextRequest } from "next/server"
import { createClient } from "@/lib/supabase/server"
import { lookupNutrition } from "@/lib/nutrition/nutrition-lookup"

// ── Simple in-memory per-user rate limiter ───────────────────────────────

const RATE_LIMIT_WINDOW_MS = 60_000
const RATE_LIMIT_MAX = 10
const CLEANUP_INTERVAL_MS = 5 * 60_000 // GC stale entries every 5 min
const userWindows = new Map<string, number[]>()
let lastCleanup = Date.now()

function cleanupStaleEntries() {
  const now = Date.now()
  if (now - lastCleanup < CLEANUP_INTERVAL_MS) return
  lastCleanup = now
  for (const [userId, timestamps] of userWindows) {
    const live = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
    if (live.length === 0) userWindows.delete(userId)
    else userWindows.set(userId, live)
  }
}

function checkUserRateLimit(userId: string): boolean {
  cleanupStaleEntries()
  const now = Date.now()
  let timestamps = userWindows.get(userId) ?? []
  timestamps = timestamps.filter((t) => now - t < RATE_LIMIT_WINDOW_MS)
  if (timestamps.length >= RATE_LIMIT_MAX) {
    userWindows.set(userId, timestamps)
    return false
  }
  timestamps.push(now)
  userWindows.set(userId, timestamps)
  return true
}

// ── Handler ──────────────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
  }

  if (!checkUserRateLimit(user.id)) {
    return NextResponse.json({ error: "Rate limit exceeded (10/min)" }, { status: 429 })
  }

  const { searchParams } = new URL(req.url)
  const query = searchParams.get("q")?.trim()
  const barcode = searchParams.get("barcode")?.trim()
  const qtyStr = searchParams.get("qty")

  if (!query && !barcode) {
    return NextResponse.json({ error: "Missing 'q' or 'barcode' parameter" }, { status: 400 })
  }

  try {
    const results = await lookupNutrition(query || barcode || "", {
      barcode: barcode || undefined,
    })

    // Scale if qty provided
    const quantityG = qtyStr ? parseFloat(qtyStr) : null
    const scaled =
      quantityG && quantityG > 0
        ? results.map((r) => ({
            ...r,
            calories_kcal: Math.round((r.calories_kcal * quantityG) / 100),
            protein_g: Math.round(((r.protein_g * quantityG) / 100) * 10) / 10,
            carbs_g: Math.round(((r.carbs_g * quantityG) / 100) * 10) / 10,
            fat_g: Math.round(((r.fat_g * quantityG) / 100) * 10) / 10,
            fiber_g: Math.round(((r.fiber_g * quantityG) / 100) * 10) / 10,
            scaled_for_g: quantityG,
          }))
        : results

    return NextResponse.json({ results: scaled })
  } catch (err) {
    console.error("[api/nutrition]", err)
    return NextResponse.json({ error: "Nutrition lookup failed" }, { status: 502 })
  }
}
