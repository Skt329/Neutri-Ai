/**
 * Swiggy smart wrapper tools.
 *
 * These tools layer NeutriAI's nutrition intelligence on top of raw Swiggy MCP tools.
 * They are server-side tools with `execute` that combine Swiggy data with user context
 * (pantry, daily targets, dietary preferences) to provide nutrition-aware commerce.
 */

import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"

// ── Schemas ──────────────────────────────────────────────────────────────────

const RestaurantSchema = z.object({
  id: z.string(),
  name: z.string(),
  cuisines: z.array(z.string()).default([]),
  rating: z.number().nullable(),
  eta_minutes: z.number().nullable(),
  is_veg: z.boolean().default(false),
  price_for_two: z.number().nullable(),
})

const MenuItemSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  is_veg: z.boolean().default(false),
  description: z.string().nullable(),
  estimated_calories: z.number().nullable(),
  estimated_protein_g: z.number().nullable(),
  estimated_carbs_g: z.number().nullable(),
  estimated_fat_g: z.number().nullable(),
})

const CartItemSchema = z.object({
  menu_item_id: z.string(),
  name: z.string(),
  quantity: z.number().int().min(1),
  price: z.number(),
  estimated_calories: z.number().nullable(),
  estimated_protein_g: z.number().nullable(),
  estimated_carbs_g: z.number().nullable(),
  estimated_fat_g: z.number().nullable(),
})

const InstamartProductSchema = z.object({
  id: z.string(),
  name: z.string(),
  price: z.number(),
  unit: z.string().nullable(),
  quantity: z.number().nullable(),
  image_url: z.string().nullable(),
})

// ── Helper: Get user dietary context ─────────────────────────────────────────

/** Pre-loaded context from route.ts to avoid redundant DB queries. */
export interface PreloadedDietaryContext {
  profile: {
    dietary_preferences: string[]
    allergies: string[]
    health_conditions: string[]
  } | null
  targets: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  } | null
  dailyTotals: {
    calories: number
    protein_g: number
    carbs_g: number
    fat_g: number
  } | null
}

async function getUserDietaryContext(
  supabase: SupabaseClient,
  userId: string,
  preloaded?: PreloadedDietaryContext,
) {
  // If pre-loaded context is available, skip DB queries
  if (preloaded) {
    const consumed = preloaded.dailyTotals ?? { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 }
    const remaining = preloaded.targets
      ? {
          calories: Math.max(0, preloaded.targets.calories - consumed.calories),
          protein_g: Math.max(0, preloaded.targets.protein_g - consumed.protein_g),
          carbs_g: Math.max(0, preloaded.targets.carbs_g - consumed.carbs_g),
          fat_g: Math.max(0, preloaded.targets.fat_g - consumed.fat_g),
        }
      : null

    return {
      dietary_preferences: preloaded.profile?.dietary_preferences ?? [],
      allergies: preloaded.profile?.allergies ?? [],
      health_conditions: preloaded.profile?.health_conditions ?? [],
      targets: preloaded.targets,
      consumed,
      remaining,
    }
  }

  // Fallback: fetch from DB (for backward compatibility)
  const [{ data: profile }, { data: targets }] = await Promise.all([
    supabase
      .from("profiles")
      .select("dietary_preferences, allergies, health_conditions")
      .eq("id", userId)
      .maybeSingle(),
    supabase
      .from("nutrition_targets")
      .select("calories, protein_g, carbs_g, fat_g")
      .eq("user_id", userId)
      .order("effective_from", { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Get today's consumed totals
  const dayStart = new Date(
    new Date().getFullYear(),
    new Date().getMonth(),
    new Date().getDate(),
  ).toISOString()

  const { data: meals } = await supabase
    .from("meal_logs")
    .select("calories, protein_g, carbs_g, fat_g")
    .eq("user_id", userId)
    .gte("logged_at", dayStart)

  const consumed = (meals ?? []).reduce(
    (acc, m) => ({
      calories: acc.calories + (m.calories ?? 0),
      protein_g: acc.protein_g + (m.protein_g ?? 0),
      carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
      fat_g: acc.fat_g + (m.fat_g ?? 0),
    }),
    { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
  )

  const remaining = targets
    ? {
        calories: Math.max(0, (targets.calories ?? 0) - consumed.calories),
        protein_g: Math.max(0, (targets.protein_g ?? 0) - consumed.protein_g),
        carbs_g: Math.max(0, (targets.carbs_g ?? 0) - consumed.carbs_g),
        fat_g: Math.max(0, (targets.fat_g ?? 0) - consumed.fat_g),
      }
    : null

  return {
    dietary_preferences: profile?.dietary_preferences ?? [],
    allergies: profile?.allergies ?? [],
    health_conditions: profile?.health_conditions ?? [],
    targets,
    consumed,
    remaining,
  }
}

// ── Smart Tools ──────────────────────────────────────────────────────────────

export function buildSwiggySmartTools(
  supabase: SupabaseClient,
  userId: string,
  preloadedContext?: PreloadedDietaryContext,
) {
  return {
    /**
     * Smart food search: searches Swiggy, filters by allergies/diet, and enriches
     * with remaining daily macro context. The AI uses this context to rank results.
     */
    smart_food_search: tool({
      description:
        "Search for food on Swiggy with nutrition awareness. Returns restaurants/items filtered by the user's dietary preferences and allergies, along with their remaining daily macros for context. Use this instead of raw food_search when you want nutrition-smart results.",
      inputSchema: z.object({
        query: z.string().describe("Search query (e.g. 'biryani', 'healthy salad', 'high protein')"),
        max_price: z.number().nullable().describe("Max price per item in INR"),
        veg_only: z.boolean().nullable().describe("Force vegetarian results"),
      }),
      execute: async (input) => {
        const ctx = await getUserDietaryContext(supabase, userId, preloadedContext)
        return {
          ok: true as const,
          search_query: input.query,
          filters: {
            max_price: input.max_price,
            veg_only: input.veg_only ?? ctx.dietary_preferences.some((p: string) =>
              ["vegetarian", "vegan"].includes(p.toLowerCase()),
            ),
            excluded_allergens: ctx.allergies,
          },
          nutrition_context: {
            remaining_today: ctx.remaining,
            consumed_today: ctx.consumed,
            targets: ctx.targets,
          },
          instruction:
            "Use the Swiggy MCP food_* tools to search with these filters. " +
            "Estimate nutrition for each result. Rank items that fit within the remaining daily macros higher. " +
            "Flag items containing user allergens. Present results via propose_restaurant_pick or propose_menu_selection.",
        }
      },
    }),

    /**
     * Pantry restock: reads pantry for low/expired items, provides context for
     * Instamart search. The AI then uses im_* tools to find matching products.
     */
    pantry_restock: tool({
      description:
        "Check the user's pantry for low or expired items and prepare an Instamart restock plan. " +
        "Reads the pantry automatically — do NOT call list_pantry first. " +
        "Returns items that need restocking with suggested search queries for Instamart.",
      inputSchema: z.object({
        include_expired_only: z.boolean().default(false).describe("If true, only show expired items"),
      }),
      execute: async ({ include_expired_only }) => {
        const { data: items, error } = await supabase
          .from("pantry_items")
          .select("id, name, quantity, unit, category, expires_on")
          .eq("user_id", userId)
          .order("name")

        if (error) return { ok: false as const, error: error.message }

        const today = new Date().toISOString().split("T")[0]
        const needsRestock = (items ?? []).filter((item) => {
          const isExpired = item.expires_on && item.expires_on <= today
          const isLow = item.quantity !== null && item.quantity <= 1
          if (include_expired_only) return isExpired
          return isExpired || isLow
        })

        return {
          ok: true as const,
          needs_restock: needsRestock,
          total_pantry_items: items?.length ?? 0,
          instruction:
            "Use im_* (Instamart MCP) tools to search for matching products for each item that needs restocking. " +
            "Present results via propose_pantry_restock card with prices and quantities. " +
            "Group by urgency: expired items first, then low-stock items.",
        }
      },
    }),

    /**
     * Nutrition-aware checkout: calculates total nutrition for items in a Swiggy cart
     * and compares against remaining daily targets.
     */
    nutrition_aware_checkout: tool({
      description:
        "Calculate total nutrition for a food order and compare against daily targets. " +
        "Call this BEFORE placing any order to show the user a nutrition summary. " +
        "Present the result via propose_swiggy_order card.",
      inputSchema: z.object({
        items: z.array(CartItemSchema).min(1),
        restaurant_name: z.string(),
        delivery_fee: z.number().default(0),
        estimated_eta: z.number().nullable().describe("ETA in minutes"),
      }),
      execute: async (input) => {
        const ctx = await getUserDietaryContext(supabase, userId, preloadedContext)

        const orderNutrition = input.items.reduce(
          (acc, item) => ({
            calories: acc.calories + (item.estimated_calories ?? 0) * item.quantity,
            protein_g: acc.protein_g + (item.estimated_protein_g ?? 0) * item.quantity,
            carbs_g: acc.carbs_g + (item.estimated_carbs_g ?? 0) * item.quantity,
            fat_g: acc.fat_g + (item.estimated_fat_g ?? 0) * item.quantity,
          }),
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0 },
        )

        const totalPrice =
          input.items.reduce((s, i) => s + i.price * i.quantity, 0) + input.delivery_fee

        const afterOrder = ctx.remaining
          ? {
              calories: ctx.remaining.calories - orderNutrition.calories,
              protein_g: ctx.remaining.protein_g - orderNutrition.protein_g,
              carbs_g: ctx.remaining.carbs_g - orderNutrition.carbs_g,
              fat_g: ctx.remaining.fat_g - orderNutrition.fat_g,
            }
          : null

        return {
          ok: true as const,
          restaurant_name: input.restaurant_name,
          items: input.items,
          delivery_fee: input.delivery_fee,
          total_price: totalPrice,
          estimated_eta: input.estimated_eta,
          order_nutrition: orderNutrition,
          remaining_after_order: afterOrder,
          targets: ctx.targets,
          instruction:
            "Present this data via the propose_swiggy_order client tool card. " +
            "Highlight if any macro significantly exceeds remaining daily allowance.",
        }
      },
    }),

    /**
     * Healthy reorder: fetches recent meal logs that were Swiggy orders,
     * cross-references with targets to find past orders with good macro profiles.
     */
    healthy_reorder: tool({
      description:
        "Find the user's healthiest past Swiggy orders based on logged meal data. " +
        "Returns previous orders ranked by how well they fit current nutrition targets.",
      inputSchema: z.object({
        limit: z.number().int().min(1).max(10).default(5),
      }),
      execute: async ({ limit }) => {
        const { data: meals, error } = await supabase
          .from("meal_logs")
          .select("id, description, calories, protein_g, carbs_g, fat_g, logged_at, items")
          .eq("user_id", userId)
          .eq("source", "chat")
          .order("logged_at", { ascending: false })
          .limit(50)

        if (error) return { ok: false as const, error: error.message }

        const ctx = await getUserDietaryContext(supabase, userId, preloadedContext)

        // Score each meal by how well it fits remaining macros
        const scored = (meals ?? []).map((meal) => {
          let score = 100
          if (ctx.remaining) {
            const calDiff = Math.abs((meal.calories ?? 0) - ctx.remaining.calories / 2)
            const protDiff = Math.abs((meal.protein_g ?? 0) - ctx.remaining.protein_g / 2)
            score = Math.max(0, 100 - calDiff / 10 - protDiff * 2)
          }
          return { ...meal, fit_score: Math.round(score) }
        })

        scored.sort((a, b) => b.fit_score - a.fit_score)

        return {
          ok: true as const,
          recommendations: scored.slice(0, limit),
          remaining: ctx.remaining,
        }
      },
    }),
  }
}
