import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"

export const runtime = "nodejs"

interface HealthCheck {
  status: "ok" | "error"
  latencyMs?: number
  error?: string
}

interface HealthStatus {
  status: "ok" | "degraded" | "down"
  timestamp: string
  version: string
  checks: Record<string, HealthCheck>
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {}
  let overall: HealthStatus["status"] = "ok"

  // 1. Redis check
  const redisStart = Date.now()
  try {
    if (redis) {
      await redis.ping()
      checks.redis = { status: "ok", latencyMs: Date.now() - redisStart }
    } else {
      checks.redis = { status: "ok", latencyMs: 0 }
    }
  } catch (err) {
    checks.redis = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown",
    }
    overall = "degraded"
  }

  // 2. Supabase check
  const supabaseStart = Date.now()
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    if (url) {
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        signal: AbortSignal.timeout(3000),
      })
      checks.supabase = {
        status: res.ok ? "ok" : "error",
        latencyMs: Date.now() - supabaseStart,
      }
      if (!res.ok) overall = "degraded"
    }
  } catch (err) {
    checks.supabase = {
      status: "error",
      error: err instanceof Error ? err.message : "Unknown",
    }
    overall = "down"
  }

  // 3. Azure OpenAI
  checks.azure = {
    status:
      process.env.AZURE_RESOURCE_NAME && process.env.AZURE_API_KEY
        ? "ok"
        : "error",
  }
  if (checks.azure.status === "error") overall = "down"

  // 4. NIM embedding
  checks.nim = {
    status: process.env.NIM_API_KEY ? "ok" : "error",
  }
  if (checks.nim.status === "error") overall = "degraded"

  const response: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    checks,
  }

  return NextResponse.json(response, {
    status: overall === "down" ? 503 : 200,
  })
}
