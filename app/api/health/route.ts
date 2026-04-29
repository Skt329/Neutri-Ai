import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * GET /api/health
 *
 * Health check endpoint for uptime monitoring (UptimeRobot, Vercel, etc.).
 * Verifies both the application runtime and database connectivity.
 */
export async function GET() {
  const start = Date.now()

  try {
    // Verify DB connectivity with a lightweight query
    const admin = createAdminClient()
    const { error } = await admin
      .from("profiles")
      .select("id")
      .limit(1)

    const dbOk = !error
    const latencyMs = Date.now() - start

    return NextResponse.json({
      status: dbOk ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      checks: {
        database: dbOk ? "ok" : error.message,
        latency_ms: latencyMs,
      },
    }, { status: dbOk ? 200 : 503 })
  } catch (err) {
    return NextResponse.json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      checks: {
        database: err instanceof Error ? err.message : "Unknown error",
        latency_ms: Date.now() - start,
      },
    }, { status: 503 })
  }
}
