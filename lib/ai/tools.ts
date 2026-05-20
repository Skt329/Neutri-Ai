import type { SupabaseClient } from "@supabase/supabase-js"
import { buildClientTools } from "./tools/client-tools"
import { buildNutritionTools } from "./tools/nutrition-tools"
import { buildMealTools } from "./tools/meal-tools"
import { buildPantryTools } from "./tools/pantry-tools"
import { buildProfileTools } from "./tools/profile-tools"
import { buildSwiggyTools } from "./tools/swiggy-tools"

export { buildSwiggySmartTools } from "@/lib/ai/tools/swiggy-smart"

/**
 * All tools NutriAI can call. Split into two groups:
 *
 *  - Server tools (have `execute`): hit the DB with the authenticated Supabase
 *    client. RLS guarantees the user can only ever read/write their own rows.
 *
 *  - Client tools (no `execute`): render an interactive card on the client.
 *    The user confirms, edits, or cancels, and the client calls
 *    `addToolOutput` to hand the answer back to the model.
 *
 * Tool implementations are split across domain modules in lib/ai/tools/:
 *   - client-tools.ts   → Interactive UI cards (no server logic)
 *   - nutrition-tools.ts → USDA/OFF lookups
 *   - meal-tools.ts     → Meal logging & retrieval
 *   - pantry-tools.ts   → Pantry CRUD + recipe suggestions
 *   - profile-tools.ts  → Profile, targets, weight, weekly report
 *   - swiggy-tools.ts   → Swiggy ordering
 */
export function buildTools(supabase: SupabaseClient, userId: string, opts?: { timezone?: string | null }) {
  return {
    ...buildClientTools(),
    ...buildNutritionTools(),
    ...buildMealTools(supabase, userId, opts?.timezone),
    ...buildPantryTools(supabase, userId),
    ...buildProfileTools(supabase, userId),
    ...buildSwiggyTools(supabase, userId),
  }
}

/**
 * Toolset names by category. Used by the client view to decide which tool
 * parts render as interactive cards and which render as collapsible traces.
 */
export const CLIENT_TOOL_NAMES = [
  "ask_user",
  "choose_option",
  "propose_meal_log",
  "propose_pantry_items",
  "propose_swiggy_order",
  "propose_restaurant_pick",
  "propose_menu_selection",
  "propose_pantry_restock",
] as const
export type ClientToolName = (typeof CLIENT_TOOL_NAMES)[number]
