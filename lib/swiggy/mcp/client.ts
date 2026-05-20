/**
 * Swiggy MCP client factory with Redis-backed tool definition caching.
 *
 * Creates MCP clients for Swiggy Food and Instamart servers using the
 * Vercel AI SDK's @ai-sdk/mcp package. Each client connects via
 * Streamable HTTP (JSON-RPC) with the user's Bearer token.
 *
 * CACHING: Discovered tool definitions are cached in Upstash Redis per-token
 * for 5 minutes. On cache hits, client instances are recreated and bound to the
 * cached definitions synchronously, avoiding high-latency discovery network calls.
 *
 * CLEANUP: To prevent socket leaks in serverless runtimes, all active client
 * connections are closed at the end of the request via the returned `cleanup()` callback.
 */

import { createMCPClient, type ListToolsResult } from "@ai-sdk/mcp"
import { createHash } from "crypto"
import type { ToolSet } from "ai"
import { redisGet, redisSet } from "@/lib/redis"

// ── Server endpoints ─────────────────────────────────────────────────────────

export const SWIGGY_MCP_SERVERS = {
  food: "https://mcp.swiggy.com/food",
  instamart: "https://mcp.swiggy.com/im",
} as const

export type SwiggyVertical = keyof typeof SWIGGY_MCP_SERVERS

interface CachedDefinitions {
  connectedVerticals: SwiggyVertical[]
  definitions: Record<SwiggyVertical, ListToolsResult>
}

/** Hash token to avoid storing raw secrets in Redis keys. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16)
}

// ── Cached Client Creation ───────────────────────────────────────────────────

/**
 * Get Swiggy MCP tools, using Redis cache when available.
 *
 * Returns cached tools if the token matches and TTL hasn't expired.
 * Otherwise creates fresh MCP clients, discovers tools, and caches them.
 */
export async function getSwiggyMCPTools(accessToken: string): Promise<{
  tools: ToolSet
  connectedVerticals: SwiggyVertical[]
  errors: Array<{ vertical: SwiggyVertical; error: string }>
  cleanup: () => Promise<void>
}> {
  const tokenHash = hashToken(accessToken)
  const cacheKey = `swiggy_mcp_tools:${tokenHash}`

  // Try to load cached definitions from Redis
  let cachedData: CachedDefinitions | null = null
  try {
    const cachedRaw = await redisGet(cacheKey)
    if (cachedRaw) {
      cachedData = JSON.parse(cachedRaw) as CachedDefinitions
    }
  } catch (err) {
    console.warn("[swiggy-mcp] Failed to read tool definitions cache from Redis:", err)
  }

  const verticals = Object.keys(SWIGGY_MCP_SERVERS) as SwiggyVertical[]
  const activeClients: Array<{ close: () => Promise<void> }> = []
  const mergedTools: Record<string, any> = {}
  const connectedVerticals: SwiggyVertical[] = []
  const errors: Array<{ vertical: SwiggyVertical; error: string }> = []

  if (cachedData) {
    console.log(`[swiggy-mcp] Cache hit for tool definitions. Reconstructing clients...`)

    // Recreate clients and bind tools from the cached definitions
    await Promise.all(
      cachedData.connectedVerticals.map(async (vertical) => {
        try {
          const client = await createMCPClient({
            transport: {
              type: "http",
              url: SWIGGY_MCP_SERVERS[vertical],
              headers: {
                Authorization: `Bearer ${accessToken}`,
              },
            },
          })
          activeClients.push(client)

          const defs = cachedData!.definitions[vertical]
          const tools = client.toolsFromDefinitions(defs)

          const prefix = vertical === "instamart" ? "im" : vertical
          for (const [name, tool] of Object.entries(tools)) {
            mergedTools[`${prefix}_${name}`] = tool
          }
          connectedVerticals.push(vertical)
        } catch (err) {
          const errorMsg = err instanceof Error ? err.message : String(err)
          errors.push({ vertical, error: errorMsg })
          console.error(`[swiggy-mcp] Failed to bind cached tool definitions for ${vertical}:`, errorMsg)
        }
      })
    )
  } else {
    console.log("[swiggy-mcp] Cache miss — connecting and discovering tools from scratch...")

    const freshDefinitions: Partial<Record<SwiggyVertical, ListToolsResult>> = {}

    const results = await Promise.allSettled(
      verticals.map(async (vertical) => {
        const client = await createMCPClient({
          transport: {
            type: "http",
            url: SWIGGY_MCP_SERVERS[vertical],
            headers: {
              Authorization: `Bearer ${accessToken}`,
            },
          },
        })
        activeClients.push(client)

        // Discover tools and cache their definitions
        const definitions = await client.listTools()
        const tools = client.toolsFromDefinitions(definitions)

        console.log(`[swiggy-mcp] ${vertical}: discovered ${Object.keys(tools).length} tools`)
        return { vertical, definitions, tools }
      })
    )

    for (let i = 0; i < results.length; i++) {
      const result = results[i]
      const vertical = verticals[i]

      if (result.status === "fulfilled") {
        const { definitions, tools } = result.value
        freshDefinitions[vertical] = definitions

        const prefix = vertical === "instamart" ? "im" : vertical
        for (const [name, tool] of Object.entries(tools)) {
          mergedTools[`${prefix}_${name}`] = tool
        }
        connectedVerticals.push(vertical)
      } else {
        const errorMsg = result.reason instanceof Error ? result.reason.message : String(result.reason)
        errors.push({ vertical, error: errorMsg })
        console.error(`[swiggy-mcp] Failed to connect/discover tools from ${vertical}:`, errorMsg)
      }
    }

    // Write definitions to Redis cache with 5-minute TTL
    if (connectedVerticals.length > 0) {
      try {
        const cachePayload: CachedDefinitions = {
          connectedVerticals,
          definitions: freshDefinitions as Record<SwiggyVertical, ListToolsResult>,
        }
        await redisSet(cacheKey, JSON.stringify(cachePayload), 300) // 5 minutes TTL
      } catch (err) {
        console.warn("[swiggy-mcp] Failed to cache tool definitions in Redis:", err)
      }
    }
  }

  // Cleanup function: Close active clients when stream ends to prevent socket leaks
  const cleanup = async () => {
    console.log(`[swiggy-mcp] Cleaning up ${activeClients.length} active client connections`)
    await Promise.allSettled(activeClients.map((c) => c.close()))
  }

  return { tools: mergedTools as ToolSet, connectedVerticals, errors, cleanup }
}

/**
 * Force-close cached MCP sessions.
 */
export async function clearMCPCache(tokenHash?: string): Promise<void> {
  if (tokenHash) {
    const cacheKey = `swiggy_mcp_tools:${tokenHash}`
    if (typeof window === "undefined") {
      const { redis } = await import("@/lib/redis")
      if (redis) {
        redis.del(cacheKey).catch(() => {})
      }
    }
  }
}
