import { tool } from "ai"
import { z } from "zod"
import { lookupNutrition } from "@/lib/nutrition/nutrition-lookup"

/**
 * Nutrition lookup tools — query USDA/OpenFoodFacts for food data.
 */
export function buildNutritionTools() {
  return {
    lookup_nutrition: tool({
      description:
        "Look up nutrition data for a food item using USDA FoodData Central and Open Food Facts. " +
        "Returns up to 3 matches with per-100 g macros. If quantity_g is provided, values are scaled.",
      inputSchema: z.object({
        query: z.string().min(1).max(200),
        quantity_g: z
          .number()
          .nullable()
          .default(null)
          .describe("If provided, scale all macros from per-100 g to this weight."),
      }),
      execute: async (input) => {
        try {
          const results = await lookupNutrition(input.query)
          if (!results.length) {
            return {
              ok: true as const,
              results: [],
              instruction:
                "No matches found in USDA or Open Food Facts. Use your built-in reference values and mark as [estimated].",
            }
          }

          const scaled = input.quantity_g
            ? results.map((r) => ({
                ...r,
                calories_kcal: Math.round((r.calories_kcal * input.quantity_g!) / 100),
                protein_g: Math.round(((r.protein_g * input.quantity_g!) / 100) * 10) / 10,
                carbs_g: Math.round(((r.carbs_g * input.quantity_g!) / 100) * 10) / 10,
                fat_g: Math.round(((r.fat_g * input.quantity_g!) / 100) * 10) / 10,
                fiber_g: Math.round(((r.fiber_g * input.quantity_g!) / 100) * 10) / 10,
                scaled_for_g: input.quantity_g,
              }))
            : results

          return {
            ok: true as const,
            results: scaled.slice(0, 3),
            source_note: `Data from ${results[0].source === "usda" ? "USDA FoodData Central" : "Open Food Facts"}`,
          }
        } catch (err) {
          console.error("[lookup_nutrition]", err)
          return {
            ok: true as const,
            results: [],
            instruction:
              "Nutrition lookup service unavailable. Use your built-in reference values and mark as [estimated].",
          }
        }
      },
    }),

    lookup_nutrition_batch: tool({
      description:
        "Look up nutrition for MULTIPLE food items in one call. More efficient than calling lookup_nutrition " +
        "multiple times. Use when logging a multi-item meal (e.g. 'I had rice, dal, and chicken').",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              query: z.string().min(1).max(200),
              quantity_g: z.number().nullable().default(null),
            }),
          )
          .min(1)
          .max(10),
      }),
      execute: async ({ items }) => {
        try {
          const results = await Promise.all(
            items.map(async (item) => {
              const hits = await lookupNutrition(item.query)
              const best = hits[0] ?? null
              if (!best) return { query: item.query, found: false as const }
              const scale = item.quantity_g ? item.quantity_g / 100 : 1
              return {
                query: item.query,
                found: true as const,
                source: best.source,
                name: best.name,
                calories_kcal: Math.round(best.calories_kcal * scale),
                protein_g: Math.round(best.protein_g * scale * 10) / 10,
                carbs_g: Math.round(best.carbs_g * scale * 10) / 10,
                fat_g: Math.round(best.fat_g * scale * 10) / 10,
                fiber_g: Math.round(best.fiber_g * scale * 10) / 10,
                per_100g: !item.quantity_g,
              }
            }),
          )
          return { ok: true as const, items: results }
        } catch (err) {
          console.error("[lookup_nutrition_batch]", err)
          return {
            ok: true as const,
            items: items.map((i) => ({ query: i.query, found: false as const })),
            instruction: "Batch lookup failed. Use built-in reference values and mark as [estimated].",
          }
        }
      },
    }),
  }
}
