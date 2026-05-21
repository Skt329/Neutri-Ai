import { NextResponse } from "next/server"
import { redis } from "@/lib/redis"
import { logger } from "@/lib/logger"

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
  uptime: number
  checks: Record<string, HealthCheck>
}

const startTime = Date.now()

async function checkWithTimeout<T>(
  name: string,
  fn: () => Promise<T>,
  timeoutMs = 3000,
): Promise<{ ok: boolean; latencyMs: number; error?: string }> {
  const start = Date.now()
  try {
    await Promise.race([
      fn(),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`${name} health check timed out (${timeoutMs}ms)`)), timeoutMs),
      ),
    ])
    return { ok: true, latencyMs: Date.now() - start }
  } catch (err) {
    return {
      ok: false,
      latencyMs: Date.now() - start,
      error: err instanceof Error ? err.message : "Unknown error",
    }
  }
}

export async function GET() {
  const checks: Record<string, HealthCheck> = {}
  let overall: HealthStatus["status"] = "ok"

  // Run all checks in parallel for speed
  const [redisResult, supabaseResult, azureResult, nimResult] = await Promise.all([
    // 1. Redis — actual PING
    checkWithTimeout("Redis", async () => {
      if (redis) {
        await redis.ping()
      }
      // If redis is null (in-memory fallback), that's still "ok" for the app
    }),

    // 2. Supabase — actual REST API call
    checkWithTimeout("Supabase", async () => {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL
      if (!url) throw new Error("NEXT_PUBLIC_SUPABASE_URL not set")
      const res = await fetch(`${url}/rest/v1/`, {
        headers: {
          apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // 3. Azure OpenAI — lightweight models list endpoint
    checkWithTimeout("Azure OpenAI", async () => {
      const resource = process.env.AZURE_RESOURCE_NAME
      const key = process.env.AZURE_API_KEY
      if (!resource || !key) throw new Error("Azure credentials not configured")
      const res = await fetch(
        `https://${resource}.openai.azure.com/openai/models?api-version=2024-06-01`,
        {
          headers: { "api-key": key },
          signal: AbortSignal.timeout(3000),
        },
      )
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
    }),

    // 4. NIM Embedding — lightweight check via env var presence
    // (NIM doesn't have a health endpoint, so we just verify config)
    checkWithTimeout("NIM", async () => {
      if (!process.env.NIM_API_KEY) throw new Error("NIM_API_KEY not set")
    }),
  ])

  // Map results to checks
  checks.redis = redisResult.ok
    ? { status: "ok", latencyMs: redisResult.latencyMs }
    : { status: "error", latencyMs: redisResult.latencyMs, error: redisResult.error }

  checks.supabase = supabaseResult.ok
    ? { status: "ok", latencyMs: supabaseResult.latencyMs }
    : { status: "error", latencyMs: supabaseResult.latencyMs, error: supabaseResult.error }

  checks.azure = azureResult.ok
    ? { status: "ok", latencyMs: azureResult.latencyMs }
    : { status: "error", latencyMs: azureResult.latencyMs, error: azureResult.error }

  checks.nim = nimResult.ok
    ? { status: "ok" }
    : { status: "error", error: nimResult.error }

  // Determine overall status
  // Down: Supabase or Azure are critical services
  if (!supabaseResult.ok || !azureResult.ok) {
    overall = "down"
  }
  // Degraded: Redis or NIM are non-critical (have fallbacks)
  else if (!redisResult.ok || !nimResult.ok) {
    overall = "degraded"
  }

  const response: HealthStatus = {
    status: overall,
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
    uptime: Math.round((Date.now() - startTime) / 1000),
    checks,
  }

  if (overall !== "ok") {
    logger.warn("health", `Health check: ${overall}`, {
      failing: Object.entries(checks)
        .filter(([, c]) => c.status === "error")
        .map(([name]) => name),
    })
  }

  return NextResponse.json(response, {
    status: overall === "down" ? 503 : 200,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  })
}
