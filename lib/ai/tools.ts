import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { computeTargets } from "@/lib/nutrition"
import { getSwiggyAdapter, SwiggyNotConfiguredError } from "@/lib/swiggy/adapter"
import { PANTRY_CATEGORIES, MEAL_TYPES, normalizeCategory } from "@/lib/categories"

/**
 * All tools NutriAI can call. Split into two groups:
 *
 *  - Server tools (have `execute`): hit the DB with the authenticated Supabase
 *    client. RLS guarantees the user can only ever read/write their own rows.
 *
 *  - Client tools (no `execute`): render an interactive card on the client.
 *    The user confirms, edits, or cancels, and the client calls
 *    `addToolOutput` to hand the answer back to the model. The model then
 *    decides whether to call a server tool (e.g. `log_meal`) with the
 *    confirmed data.
 */

const NUTRITION_BASIS = ["per_100g", "per_100ml", "per_piece", "per_serving"] as const

// Reusable nutrition sub-schema for pantry items.
const NutritionFields = z.object({
  calories_kcal: z.number().min(0).max(2000).nullable().describe("Calories (kcal) for the given nutrition_basis."),
  protein_g: z.number().min(0).max(200).nullable(),
  carbs_g: z.number().min(0).max(200).nullable(),
  fat_g: z.number().min(0).max(200).nullable(),
  fiber_g: z.number().min(0).max(100).nullable(),
  nutrition_basis: z
    .enum(NUTRITION_BASIS)
    .nullable()
    .describe("Defaults to per_100g for solids, per_100ml for liquids, per_piece for countable items."),
})

const PantryItemInput = z
  .object({
    name: z.string().min(1).max(80),
    quantity: z.number().min(0).nullable(),
    unit: z.string().nullable().describe("e.g. kg, g, l, ml, pcs, packs, cups"),
    category: z.enum(PANTRY_CATEGORIES),
    expires_on: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
      .nullable(),
  })
  .merge(NutritionFields)

export function buildTools(supabase: SupabaseClient, userId: string) {
  return {
    // ─── Client tools (interactive cards) ─────────────────────────────────

    ask_user: tool({
      description:
        "Ask the user a structured question when you need more information before you can continue. " +
        "Use this instead of asking in free text whenever you have 1–4 specific fields to fill.",
      inputSchema: z.object({
        prompt: z.string().describe("Short question shown above the form."),
        fields: z
          .array(
            z.object({
              name: z.string(),
              label: z.string(),
              type: z.enum(["text", "number", "select", "date"]),
              options: z.array(z.string()).nullable(),
              placeholder: z.string().nullable(),
              defaultValue: z.string().nullable(),
            }),
          )
          .min(1)
          .max(4),
      }),
    }),

    choose_option: tool({
      description: "Ask the user to pick one (or several) options from a short list.",
      inputSchema: z.object({
        prompt: z.string(),
        options: z.array(z.string()).min(2).max(8),
        multi: z.boolean().default(false),
      }),
    }),

    propose_meal_log: tool({
      description:
        "Show the user a draft meal card they can review, edit, or cancel BEFORE anything is logged. " +
        "Always call this first when the user tells you what they ate. " +
        "When the user says 'last night', 'yesterday lunch', etc., compute the correct logged_at timestamp relative to the current date/time provided in the system prompt.",
      inputSchema: z.object({
        description: z.string(),
        meal_type: z.enum(MEAL_TYPES),
        calories: z.number().min(0),
        protein_g: z.number().min(0),
        carbs_g: z.number().min(0),
        fat_g: z.number().min(0),
        fiber_g: z.number().min(0).nullable(),
        items: z
          .array(z.object({ name: z.string(), quantity: z.string().nullable() }))
          .default([]),
        notes: z.string().nullable(),
        logged_at: z
          .string()
          .nullable()
          .describe(
            "ISO-8601 timestamp for when the meal was eaten. " +
            "Use the current date/time from the system prompt to compute relative dates like 'last night' (yesterday ~20:00), 'yesterday lunch' (yesterday ~13:00), etc. " +
            "If the user says 'just now' or doesn't specify, set to null (defaults to current time)."
          ),
      }),
    }),

    propose_pantry_items: tool({
      description:
        "Show the user a draft list of pantry items they can review, edit, or cancel BEFORE anything is saved. " +
        "Always call this first when the user mentions groceries or what they have. " +
        "You MUST pick `category` from the allowed enum AND provide per-item nutrition (calories_kcal, protein_g, carbs_g, fat_g, fiber_g, nutrition_basis) " +
        "using common reference values. Prefer per_100g for solids and per_100ml for liquids; use per_piece only for naturally countable items (eggs, bananas).",
      inputSchema: z.object({
        items: z.array(PantryItemInput).min(1).max(20),
      }),
    }),

    // ─── Server tools (authoritative writes / reads) ──────────────────────

    log_meal: tool({
      description:
        "PERSIST a meal to the user's log. Call ONLY after `propose_meal_log` returned `{ confirmed: true }` and use the values the user confirmed (including logged_at).",
      inputSchema: z.object({
        description: z.string(),
        meal_type: z.enum(MEAL_TYPES),
        calories: z.number().min(0),
        protein_g: z.number().min(0),
        carbs_g: z.number().min(0),
        fat_g: z.number().min(0),
        fiber_g: z.number().min(0).nullable(),
        items: z
          .array(z.object({ name: z.string(), quantity: z.string().nullable() }))
          .default([]),
        logged_at: z
          .string()
          .nullable()
          .describe("ISO-8601 timestamp for when the meal was eaten. Null defaults to current time."),
      }),
      execute: async (input) => {
        const insertData: Record<string, unknown> = {
          user_id: userId,
          description: input.description,
          meal_type: input.meal_type,
          calories: input.calories,
          protein_g: input.protein_g,
          carbs_g: input.carbs_g,
          fat_g: input.fat_g,
          fiber_g: input.fiber_g,
          items: input.items,
          source: "chat",
        }
        // Only set logged_at if the AI provided a specific timestamp
        if (input.logged_at) {
          insertData.logged_at = input.logged_at
        }
        const { data, error } = await supabase
          .from("meal_logs")
          .insert(insertData)
          .select("id, logged_at")
          .single()
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, meal_id: data.id, logged_at: data.logged_at }
      },
    }),

    get_daily_totals: tool({
      description: "Get today's nutrition totals and remaining vs targets.",
      inputSchema: z.object({}),
      execute: async () => {
        const now = new Date()
        const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString()
        const [{ data: meals }, { data: targets }] = await Promise.all([
          supabase
            .from("meal_logs")
            .select("calories, protein_g, carbs_g, fat_g, fiber_g")
            .eq("user_id", userId)
            .gte("logged_at", dayStart),
          supabase
            .from("nutrition_targets")
            .select("calories, protein_g, carbs_g, fat_g, fiber_g")
            .eq("user_id", userId)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        const totals = (meals ?? []).reduce(
          (acc, m) => ({
            calories: acc.calories + (m.calories ?? 0),
            protein_g: acc.protein_g + (m.protein_g ?? 0),
            carbs_g: acc.carbs_g + (m.carbs_g ?? 0),
            fat_g: acc.fat_g + (m.fat_g ?? 0),
            fiber_g: acc.fiber_g + (m.fiber_g ?? 0),
          }),
          { calories: 0, protein_g: 0, carbs_g: 0, fat_g: 0, fiber_g: 0 },
        )
        return { totals, targets }
      },
    }),

    list_recent_meals: tool({
      description: "List the user's recent meals.",
      inputSchema: z.object({ limit: z.number().int().min(1).max(50).default(10) }),
      execute: async ({ limit }) => {
        const { data, error } = await supabase
          .from("meal_logs")
          .select("id, logged_at, meal_type, description, calories, protein_g, carbs_g, fat_g")
          .eq("user_id", userId)
          .order("logged_at", { ascending: false })
          .limit(limit)
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, meals: data }
      },
    }),

    delete_meal: tool({
      description: "Delete a meal log by id.",
      inputSchema: z.object({ meal_id: z.string().uuid() }),
      execute: async ({ meal_id }) => {
        const { error } = await supabase.from("meal_logs").delete().eq("id", meal_id).eq("user_id", userId)
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const }
      },
    }),

    add_pantry_items: tool({
      description:
        "PERSIST pantry items (with nutrition). Call ONLY after `propose_pantry_items` returned `{ confirmed: true }`, and only with the items the user confirmed.",
      inputSchema: z.object({ items: z.array(PantryItemInput).min(1) }),
      execute: async ({ items }) => {
        const rows = items.map((i) => ({
          user_id: userId,
          name: i.name,
          quantity: i.quantity,
          unit: i.unit,
          category: normalizeCategory(i.category),
          expires_on: i.expires_on,
          calories_kcal: i.calories_kcal,
          protein_g: i.protein_g,
          carbs_g: i.carbs_g,
          fat_g: i.fat_g,
          fiber_g: i.fiber_g,
          nutrition_basis: i.nutrition_basis,
        }))
        const { data, error } = await supabase.from("pantry_items").insert(rows).select("id, name")
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, inserted: data }
      },
    }),

    list_pantry: tool({
      description:
        "List the user's current pantry, including per-item nutrition so you can answer macro questions about inventory.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from("pantry_items")
          .select(
            "id, name, quantity, unit, category, expires_on, calories_kcal, protein_g, carbs_g, fat_g, fiber_g, nutrition_basis",
          )
          .eq("user_id", userId)
          .order("name")
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, items: data }
      },
    }),

    update_pantry_item: tool({
      description:
        "Update any field on a pantry item by id. Only non-null fields are written, so pass null for fields you don't want to change.",
      inputSchema: z
        .object({
          pantry_item_id: z.string().uuid(),
          name: z.string().min(1).max(80).nullable(),
          quantity: z.number().min(0).nullable(),
          unit: z.string().max(20).nullable(),
          category: z.enum(PANTRY_CATEGORIES).nullable(),
          expires_on: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
        })
        .merge(NutritionFields),
      execute: async ({ pantry_item_id, ...rest }) => {
        const patch: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(rest)) if (v !== null) patch[k] = v
        if (patch.category) patch.category = normalizeCategory(patch.category as string)
        if (Object.keys(patch).length === 0) return { ok: false as const, error: "Nothing to update" }
        const { data, error } = await supabase
          .from("pantry_items")
          .update(patch)
          .eq("id", pantry_item_id)
          .eq("user_id", userId)
          .select("id, name")
          .maybeSingle()
        if (error) return { ok: false as const, error: error.message }
        if (!data) return { ok: false as const, error: "Pantry item not found" }
        return { ok: true as const, updated: data, patch }
      },
    }),

    remove_pantry_item: tool({
      description: "Remove a single pantry item by id.",
      inputSchema: z.object({ pantry_item_id: z.string().uuid() }),
      execute: async ({ pantry_item_id }) => {
        const { error } = await supabase
          .from("pantry_items")
          .delete()
          .eq("id", pantry_item_id)
          .eq("user_id", userId)
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const }
      },
    }),

    clear_pantry_category: tool({
      description: "Delete every pantry item in a given category (e.g. to reset 'spice'). Use sparingly.",
      inputSchema: z.object({ category: z.enum(PANTRY_CATEGORIES) }),
      execute: async ({ category }) => {
        const { error, count } = await supabase
          .from("pantry_items")
          .delete({ count: "exact" })
          .eq("user_id", userId)
          .eq("category", normalizeCategory(category))
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, deleted: count ?? 0 }
      },
    }),

    get_profile: tool({
      description:
        "Read the full user profile, including dietary preferences, allergies, health conditions, kitchen appliances, cuisines, favorite + disliked ingredients, cooking skill, and household size.",
      inputSchema: z.object({}),
      execute: async () => {
        const { data, error } = await supabase
          .from("profiles")
          .select(
            "full_name, age, sex, height_cm, weight_kg, activity_level, goal, dietary_preferences, allergies, health_conditions, kitchen_appliances, cuisines, favorite_ingredients, disliked_ingredients, cooking_skill, household_size, timezone",
          )
          .eq("id", userId)
          .maybeSingle()
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, profile: data }
      },
    }),

    update_profile: tool({
      description:
        "Update any profile field. Only non-null fields are written. If body metrics or goal changed, nutrition targets are recomputed automatically.",
      inputSchema: z.object({
        full_name: z.string().min(1).max(120).nullable(),
        age: z.number().int().min(13).max(120).nullable(),
        sex: z.enum(["male", "female", "other", "prefer_not_say"]).nullable(),
        height_cm: z.number().min(80).max(260).nullable(),
        weight_kg: z.number().min(25).max(400).nullable(),
        activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]).nullable(),
        goal: z.enum(["lose", "maintain", "gain", "recomp"]).nullable(),
        dietary_preferences: z.array(z.string()).nullable(),
        allergies: z.array(z.string()).nullable(),
        health_conditions: z.array(z.string()).nullable(),
        kitchen_appliances: z
          .array(z.string())
          .nullable()
          .describe("e.g. stove, oven, microwave, air_fryer, pressure_cooker, induction, grill, blender"),
        cuisines: z.array(z.string()).nullable().describe("e.g. indian, italian, mexican, thai, chinese"),
        favorite_ingredients: z.array(z.string()).nullable(),
        disliked_ingredients: z.array(z.string()).nullable(),
        cooking_skill: z.enum(["beginner", "intermediate", "advanced"]).nullable(),
        household_size: z.number().int().min(1).max(20).nullable(),
      }),
      execute: async (input) => {
        const patch: Record<string, unknown> = {}
        for (const [k, v] of Object.entries(input)) if (v !== null) patch[k] = v
        if (Object.keys(patch).length === 0) return { ok: false as const, error: "Nothing to update" }

        const { data: updated, error } = await supabase
          .from("profiles")
          .update(patch)
          .eq("id", userId)
          .select("age, sex, height_cm, weight_kg, activity_level, goal")
          .single()
        if (error) return { ok: false as const, error: error.message }

        let newTargets: Awaited<ReturnType<typeof computeTargets>> | null = null
        if (
          updated.age &&
          updated.sex &&
          updated.height_cm &&
          updated.weight_kg &&
          updated.activity_level &&
          updated.goal &&
          ["weight_kg", "height_cm", "activity_level", "goal", "age", "sex"].some((k) => k in patch)
        ) {
          newTargets = computeTargets({
            age: updated.age,
            sex: updated.sex as Parameters<typeof computeTargets>[0]["sex"],
            height_cm: Number(updated.height_cm),
            weight_kg: Number(updated.weight_kg),
            activity_level: updated.activity_level as Parameters<typeof computeTargets>[0]["activity_level"],
            goal: updated.goal as Parameters<typeof computeTargets>[0]["goal"],
          })
          await supabase.from("nutrition_targets").insert({ user_id: userId, ...newTargets })
        }
        return { ok: true as const, updated: patch, recomputed_targets: newTargets }
      },
    }),

    set_targets: tool({
      description: "Manually override daily nutrition targets. Only if the user explicitly asks.",
      inputSchema: z.object({
        calories: z.number().int().min(800).max(6000),
        protein_g: z.number().min(0).max(400),
        carbs_g: z.number().min(0).max(800),
        fat_g: z.number().min(0).max(300),
        fiber_g: z.number().min(0).max(120).nullable(),
      }),
      execute: async (input) => {
        const { error } = await supabase.from("nutrition_targets").insert({ user_id: userId, ...input })
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, targets: input }
      },
    }),

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

    log_weight: tool({
      description:
        "Record a new body-weight measurement. Only call this when the user gives you a clear number in kg (or lb, which you convert). Never guess a weight.",
      inputSchema: z.object({
        weight_kg: z.number().min(20).max(400).describe("Weight in kilograms. Convert from lb if needed."),
        note: z.string().nullable(),
      }),
      execute: async (input) => {
        const { error } = await supabase.from("weight_logs").insert({
          user_id: userId,
          weight_kg: input.weight_kg,
          note: input.note ?? null,
        })
        if (error) return { ok: false as const, error: error.message }
        return { ok: true as const, logged: input }
      },
    }),

    suggest_recipes_from_pantry: tool({
      description:
        "Return recipe ideas that can be made using only the user's current pantry. Call this when the user asks 'what can I cook?' or after they tap the pantry recipe button. You receive the current pantry — respond with at most 5 concrete dishes in the assistant message, each with (a) name, (b) 1-line description, (c) the pantry items it uses.",
      inputSchema: z.object({
        mealType: z.enum(MEAL_TYPES).nullable(),
        maxResults: z.number().int().min(1).max(8).default(5),
      }),
      execute: async ({ maxResults }) => {
        const { data, error } = await supabase
          .from("pantry_items")
          .select("name, quantity, unit, category")
          .eq("user_id", userId)
          .order("category", { ascending: true })
          .limit(150)
        if (error) return { ok: false as const, error: error.message }
        return {
          ok: true as const,
          pantry: data ?? [],
          instruction: `Suggest up to ${maxResults} dishes using ONLY these items. Do not invent ingredients the user doesn't have. Prefer dishes that match the user's preferred cuisines and appliances from the system prompt.`,
        }
      },
    }),

    get_weekly_report: tool({
      description:
        "Return a summary of the last 7 days (avg calories, best/worst day, meals logged, weight change). Call this when the user asks about their week or wants a weekly recap.",
      inputSchema: z.object({}),
      execute: async () => {
        const since = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString()
        const [mealsRes, weightsRes, targetsRes] = await Promise.all([
          supabase
            .from("meal_logs")
            .select("logged_at, calories, protein_g, carbs_g, fat_g, fiber_g")
            .eq("user_id", userId)
            .gte("logged_at", since),
          supabase
            .from("weight_logs")
            .select("logged_at, weight_kg")
            .eq("user_id", userId)
            .gte("logged_at", new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString()),
          supabase
            .from("nutrition_targets")
            .select("calories, protein_g, carbs_g, fat_g, fiber_g")
            .eq("user_id", userId)
            .order("effective_from", { ascending: false })
            .limit(1)
            .maybeSingle(),
        ])
        return {
          ok: true as const,
          meals: mealsRes.data ?? [],
          weights: weightsRes.data ?? [],
          targets: targetsRes.data ?? null,
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

/**
 * Toolset names by category. Used by the client view to decide which tool
 * parts render as interactive cards and which render as collapsible traces.
 */
export const CLIENT_TOOL_NAMES = ["ask_user", "choose_option", "propose_meal_log", "propose_pantry_items"] as const
export type ClientToolName = (typeof CLIENT_TOOL_NAMES)[number]
