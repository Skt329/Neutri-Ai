import { tool } from "ai"
import { z } from "zod"
import { MEAL_TYPES, PANTRY_CATEGORIES } from "@/lib/categories"
import { NutritionFields } from "./schemas"

/**
 * Client tools — no `execute` function.
 * These render interactive cards on the client. The user confirms/edits/cancels,
 * and the client calls `addToolOutput` to return the result to the model.
 */
export function buildClientTools() {
  return {
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
              options: z
                .array(z.string())
                .nullable()
                .describe("Only for type='select'"),
              placeholder: z.string().nullable(),
              defaultValue: z.string().nullable(),
            }),
          )
          .min(1)
          .max(6),
      }),
    }),

    choose_option: tool({
      description:
        "Show the user a set of options to pick from. " +
        "Use when there are 2–8 discrete choices (e.g. meal_type, unit, category).",
      inputSchema: z.object({
        prompt: z.string(),
        options: z.array(z.string()).min(2).max(12),
        multi: z.boolean().default(false),
      }),
    }),

    propose_meal_log: tool({
      description:
        "Show an editable meal-log proposal card. Use AFTER looking up nutrition. " +
        "The user can adjust macros, items, meal type. On confirm the model calls `log_meal`.",
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
      }),
    }),

    propose_pantry_items: tool({
      description:
        "Show an editable list of pantry items for the user to review before adding. " +
        "The user can edit names, quantities, categories, and nutrition. On confirm the model calls `add_pantry_items`.",
      inputSchema: z.object({
        items: z
          .array(
            z
              .object({
                name: z.string().min(1).max(80),
                quantity: z.number().min(0).nullable(),
                unit: z.string().nullable(),
                category: z.enum(PANTRY_CATEGORIES),
                expires_on: z
                  .string()
                  .regex(/^\d{4}-\d{2}-\d{2}$/, "YYYY-MM-DD")
                  .nullable(),
              })
              .merge(NutritionFields),
          )
          .min(1),
      }),
    }),

    propose_swiggy_order: tool({
      description:
        "Present a Swiggy order summary for user confirmation. " +
        "Show restaurant, items, total cost, and delivery time.",
      inputSchema: z.object({
        restaurant_name: z.string(),
        items: z.array(z.object({ name: z.string(), price: z.number(), quantity: z.number() })).min(1),
        total: z.number(),
        delivery_time: z.string().nullable(),
      }),
    }),

    propose_restaurant_pick: tool({
      description:
        "Show a filtered list of restaurants for the user to pick from. " +
        "Used after swiggy_search to let the user choose where to order.",
      inputSchema: z.object({
        restaurants: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              cuisines: z.string(),
              rating: z.number().nullable(),
              delivery_time: z.string().nullable(),
              cost_for_two: z.number().nullable(),
            }),
          )
          .min(1)
          .max(8),
      }),
    }),

    propose_menu_selection: tool({
      description:
        "Show menu items from a restaurant for the user to pick. " +
        "Includes nutrition data if available.",
      inputSchema: z.object({
        restaurant_name: z.string(),
        items: z
          .array(
            z.object({
              id: z.string(),
              name: z.string(),
              price: z.number(),
              description: z.string().nullable(),
              is_veg: z.boolean().nullable(),
              calories: z.number().nullable(),
            }),
          )
          .min(1)
          .max(20),
      }),
    }),

    propose_pantry_restock: tool({
      description:
        "Suggest pantry items to restock based on user's recipes, meals, and current pantry.",
      inputSchema: z.object({
        items: z
          .array(
            z.object({
              name: z.string(),
              reason: z.string(),
              estimated_qty: z.string().nullable(),
            }),
          )
          .min(1)
          .max(15),
      }),
    }),
  }
}
