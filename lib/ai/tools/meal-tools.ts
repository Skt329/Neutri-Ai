import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { MEAL_TYPES } from "@/lib/categories"
import { getDayStartISO } from "@/lib/timezone"

/**
 * Meal logging and retrieval tools.
 */
export function buildMealTools(supabase: SupabaseClient, userId: string, timezone?: string | null) {
  return {
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
        const dayStart = getDayStartISO(timezone)
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
  }
}
