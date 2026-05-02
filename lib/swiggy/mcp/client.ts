/**
 * Swiggy MCP client factory with in-memory session caching.
 *
 * Creates MCP clients for Swiggy Food and Instamart servers using the
 * Vercel AI SDK's @ai-sdk/mcp package. Each client connects via
 * Streamable HTTP (JSON-RPC) with the user's Bearer token.
 *
 * CACHING: MCP clients and discovered tools are cached per-token for
 * 5 minutes to avoid redundant HTTP handshakes and tool discovery on
 * every chat request. Cache is invalidated on token change or TTL expiry.
 *
 * IMPORTANT: Clients must stay alive while tools are being used.
 * Call the returned `cleanup()` after the stream finishes.
 */

import { createMCPClient } from "@ai-sdk/mcp"
import { createHash } from "crypto"
import type { ToolSet } from "ai"

// ── Server endpoints ─────────────────────────────────────────────────────────

export const SWIGGY_MCP_SERVERS = {
  food: "https://mcp.swiggy.com/food",
  instamart: "https://mcp.swiggy.com/im",
} as const

export type SwiggyVertical = keyof typeof SWIGGY_MCP_SERVERS

// ── In-memory MCP session cache ──────────────────────────────────────────────

interface CachedMCPSession {
  tools: ToolSet
  connectedVerticals: SwiggyVertical[]
  clients: Array<{ close: () => Promise<void> }>
  createdAt: number
  tokenHash: string
}

const mcpCache = new Map<string, CachedMCPSession>()
const MCP_CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes

/** Hash token to avoid storing raw secrets as map keys. */
function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex").slice(0, 16)
}

/** Evict stale cache entries (called on every access). */
function evictStaleEntries(): void {
  const now = Date.now()
  for (const [key, session] of mcpCache) {
    if (now - session.createdAt > MCP_CACHE_TTL_MS) {
      // Fire-and-forget cleanup of expired clients
      Promise.allSettled(session.clients.map((c) => c.close())).catch(() => {})
      mcpCache.delete(key)
    }
  }
}

// ── Cached Client Creation ───────────────────────────────────────────────────

/**
 * Get Swiggy MCP tools, using cache when available.
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
  evictStaleEntries()

  const tokenHash = hashToken(accessToken)

  // Check cache
  const cached = mcpCache.get(tokenHash)
  if (cached && Date.now() - cached.createdAt < MCP_CACHE_TTL_MS) {
    console.log(`[swiggy-mcp] Using cached tools (${Object.keys(cached.tools).length} tools, age: ${Math.round((Date.now() - cached.createdAt) / 1000)}s)`)
    return {
      tools: cached.tools,
      connectedVerticals: cached.connectedVerticals,
      errors: [],
      // Cleanup is a no-op for cached sessions — clients stay alive until TTL expires
      cleanup: async () => {},
    }
  }

  // Cache miss — create fresh clients
  console.log("[swiggy-mcp] Cache miss — discovering tools...")
  const verticals = Object.keys(SWIGGY_MCP_SERVERS) as SwiggyVertical[]
  const activeClients: Array<{ close: () => Promise<void> }> = []

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
      // Keep client alive — tools need it to dispatch calls
      activeClients.push(client)
      const tools = await client.tools()
      console.log(
        `[swiggy-mcp] ${vertical}: discovered ${Object.keys(tools).length} tools`,
      )
      return { vertical, tools }
    }),
  )

  const mergedTools: Record<string, ToolSet[string]> = {}
  const connectedVerticals: SwiggyVertical[] = []
  const errors: Array<{ vertical: SwiggyVertical; error: string }> = []

  for (let i = 0; i < results.length; i++) {
    const result = results[i]
    const vertical = verticals[i]

    if (result.status === "fulfilled") {
      const { tools } = result.value
      // Prefix tool names with vertical to avoid collisions
      // e.g. food_search_restaurants, im_search_products
      const prefix = vertical === "instamart" ? "im" : vertical
      for (const [name, tool] of Object.entries(tools)) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any -- MCP tools have wider schema types
        mergedTools[`${prefix}_${name}`] = tool as any
      }
      connectedVerticals.push(vertical)
    } else {
      const errorMsg =
        result.reason instanceof Error ? result.reason.message : String(result.reason)
      errors.push({ vertical, error: errorMsg })
      console.error(`[swiggy-mcp] Failed to connect to ${vertical}:`, errorMsg)
    }
  }

  // Store in cache
  const session: CachedMCPSession = {
    tools: mergedTools as ToolSet,
    connectedVerticals,
    clients: activeClients,
    createdAt: Date.now(),
    tokenHash,
  }
  mcpCache.set(tokenHash, session)

  // Cleanup function — for cached sessions, we DON'T close clients immediately.
  // They'll be closed when the cache entry expires via evictStaleEntries().
  // Only close if there were errors (partial connection).
  const cleanup = async () => {
    // No-op: clients are kept alive in cache for reuse.
    // They'll be cleaned up on cache eviction.
  }

  return { tools: mergedTools as ToolSet, connectedVerticals, errors, cleanup }
}

/**
 * Force-close all cached MCP sessions. Call on server shutdown or
 * when a user disconnects their Swiggy account.
 */
export async function clearMCPCache(tokenHash?: string): Promise<void> {
  if (tokenHash) {
    const session = mcpCache.get(tokenHash)
    if (session) {
      await Promise.allSettled(session.clients.map((c) => c.close()))
      mcpCache.delete(tokenHash)
    }
  } else {
    for (const [, session] of mcpCache) {
      await Promise.allSettled(session.clients.map((c) => c.close()))
    }
    mcpCache.clear()
  }
}
