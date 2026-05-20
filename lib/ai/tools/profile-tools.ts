import { tool } from "ai"
import { z } from "zod"
import type { SupabaseClient } from "@supabase/supabase-js"
import { computeTargets } from "@/lib/nutrition"

/**
 * Profile, targets, weight, and weekly report tools.
 */
export function buildProfileTools(supabase: SupabaseClient, userId: string) {
  return {
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
  }
}
