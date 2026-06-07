/**
 * Client tool names — a simple constant shared between server and client code.
 *
 * Kept in a separate file so that client components (e.g. chat-view.tsx) can
 * import this list WITHOUT pulling in server-only tool builders.
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
