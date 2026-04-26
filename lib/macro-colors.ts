/**
 * Central reference for the four macro accents + fiber.
 * All four use CSS custom properties declared in app/globals.css so dark mode
 * works automatically. Each entry has a display label, the CSS var name, and
 * an inline `color` string usable in `style` props when Tailwind classes
 * aren't available (e.g. SVG fills or color-mix() expressions).
 */

export type MacroKey = "calories" | "protein" | "carbs" | "fat" | "fiber"

export interface MacroMeta {
  key: MacroKey
  label: string
  short: string
  unit: string
  /** CSS variable name (without var()). */
  var: `--macro-${string}`
  /** Ready-to-use var() reference. */
  color: string
  /** Soft background tint used for pills. */
  bg: string
}

const make = (
  key: MacroKey,
  label: string,
  short: string,
  unit: string,
  varName: `--macro-${string}`,
): MacroMeta => ({
  key,
  label,
  short,
  unit,
  var: varName,
  color: `var(${varName})`,
  bg: `color-mix(in oklab, var(${varName}) 14%, transparent)`,
})

export const MACRO_META: Record<MacroKey, MacroMeta> = {
  calories: make("calories", "Calories", "Cal", "kcal", "--macro-cal"),
  protein: make("protein", "Protein", "P", "g", "--macro-protein"),
  carbs: make("carbs", "Carbs", "C", "g", "--macro-carbs"),
  fat: make("fat", "Fat", "F", "g", "--macro-fat"),
  fiber: make("fiber", "Fiber", "Fi", "g", "--macro-fiber"),
}

export const MACRO_ORDER: MacroKey[] = ["calories", "protein", "carbs", "fat", "fiber"]
