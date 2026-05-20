import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { PANTRY_CATEGORIES, MEAL_TYPES, normalizeCategory } from "@/lib/categories"
import { PantryItemInput, NutritionFields } from "./schemas"

/**
 * Pantry management tools.
 */
export function buildPantryTools(supabase: SupabaseClient, userId: string) {
  return {
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
        "READ-ONLY: Fetch the user's current pantry inventory. " +
        "Call this when the user asks what they have, wants to see their pantry, or asks about stock/ingredients on hand. " +
        "Also use this before answering macro questions about their inventory. " +
        "This tool only reads data — it never modifies the pantry.",
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

    suggest_recipes_from_pantry: tool({
      description:
        "Fetch the user's pantry and generate recipe ideas from it. " +
        "Call this when the user asks 'what can I cook?', 'suggest recipes', 'what should I make for breakfast?', " +
        "or any variation of recipe/meal suggestions based on their available ingredients. " +
        "This tool fetches the pantry internally — do NOT call `list_pantry` first. " +
        "Respond with at most 5 concrete dishes, each with (a) name, (b) 1-line description, (c) the pantry items it uses.",
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
  }
}
