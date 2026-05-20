import { z } from "zod"
import { PANTRY_CATEGORIES } from "@/lib/categories"

/** Nutrition basis options */
export const NUTRITION_BASIS = ["per_100g", "per_100ml", "per_piece", "per_serving"] as const

/** Reusable nutrition sub-schema for pantry items */
export const NutritionFields = z.object({
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

/** Full pantry item input schema */
export const PantryItemInput = z
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
