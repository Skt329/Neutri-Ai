import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { getSwiggyAdapter, SwiggyNotConfiguredError } from "@/lib/swiggy/adapter"

/**
 * Swiggy food ordering tools.
 */
export function buildSwiggyTools(_supabase: SupabaseClient, userId: string) {
  return {
    swiggy_search: tool({
      description: "Search Swiggy. Only use if the user asked to order.",
      inputSchema: z.object({
        text: z.string().nullable(),
        cuisine: z.string().nullable(),
        vegetarian: z.boolean().nullable(),
        max_calories: z.number().int().min(100).max(3000).nullable(),
      }),
      execute: async (input) => {
        const adapter = getSwiggyAdapter()
        if (!adapter.isConfigured) {
          return {
            ok: false as const,
            error: "Swiggy is not connected on this account yet.",
            action: "Direct the user to the Swiggy page to connect.",
          }
        }
        try {
          const results = await adapter.searchRestaurants(userId, {
            text: input.text ?? undefined,
            cuisine: input.cuisine ?? undefined,
            vegetarian: input.vegetarian ?? undefined,
            max_calories: input.max_calories ?? undefined,
          })
          return { ok: true as const, restaurants: results }
        } catch (e) {
          if (e instanceof SwiggyNotConfiguredError) return { ok: false as const, error: e.message }
          return { ok: false as const, error: e instanceof Error ? e.message : "Swiggy search failed" }
        }
      },
    }),

    swiggy_get_menu: tool({
      description: "Fetch a restaurant's menu from Swiggy.",
      inputSchema: z.object({ restaurant_id: z.string() }),
      execute: async ({ restaurant_id }) => {
        const adapter = getSwiggyAdapter()
        if (!adapter.isConfigured) return { ok: false as const, error: "Swiggy not connected" }
        try {
          const menu = await adapter.getMenu(userId, restaurant_id)
          return { ok: true as const, menu }
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : "Swiggy menu failed" }
        }
      },
    }),

    swiggy_place_order: tool({
      description:
        "Place a Swiggy order. ALWAYS show a clear text summary with price and get explicit user approval FIRST.",
      inputSchema: z.object({
        restaurant_id: z.string(),
        items: z.array(z.object({ menu_item_id: z.string(), quantity: z.number().int().min(1).max(20) })).min(1),
        notes: z.string().nullable(),
      }),
      execute: async (input) => {
        const adapter = getSwiggyAdapter()
        if (!adapter.isConfigured) return { ok: false as const, error: "Swiggy not connected" }
        try {
          const order = await adapter.placeOrder(userId, {
            restaurant_id: input.restaurant_id,
            items: input.items,
            notes: input.notes ?? undefined,
          })
          return { ok: true as const, order }
        } catch (e) {
          return { ok: false as const, error: e instanceof Error ? e.message : "Swiggy order failed" }
        }
      },
    }),
  }
}
