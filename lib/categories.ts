import {
  Apple,
  Carrot,
  Wheat,
  Milk,
  Beef,
  Flame,
  Droplets,
  CupSoda,
  Cookie,
  Package,
  Sun,
  Sandwich,
  Moon,
  Coffee,
  type LucideIcon,
} from "lucide-react"

export const PANTRY_CATEGORIES = [
  "vegetable",
  "fruit",
  "grain",
  "dairy",
  "protein",
  "spice",
  "oil",
  "beverage",
  "snack",
  "other",
] as const
export type PantryCategory = (typeof PANTRY_CATEGORIES)[number]

export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const
export type MealType = (typeof MEAL_TYPES)[number]

type CategoryMeta = {
  label: string
  icon: LucideIcon
  /** CSS colors sourced from globals.css custom chart tokens */
  tint: string
  /** Static photo path (see /public/categories) */
  photo: string
}

export const CATEGORY_META: Record<PantryCategory, CategoryMeta> = {
  vegetable: {
    label: "Vegetables",
    icon: Carrot,
    tint: "oklch(0.78 0.16 140)",
    photo: "/categories/vegetables.jpg",
  },
  fruit: {
    label: "Fruits",
    icon: Apple,
    tint: "oklch(0.78 0.19 25)",
    photo: "/categories/fruits.jpg",
  },
  grain: {
    label: "Grains",
    icon: Wheat,
    tint: "oklch(0.82 0.13 80)",
    photo: "/categories/grains.jpg",
  },
  dairy: {
    label: "Dairy",
    icon: Milk,
    tint: "oklch(0.88 0.06 220)",
    photo: "/categories/dairy.jpg",
  },
  protein: {
    label: "Protein",
    icon: Beef,
    tint: "oklch(0.74 0.18 20)",
    photo: "/categories/protein.jpg",
  },
  spice: {
    label: "Spices",
    icon: Flame,
    tint: "oklch(0.72 0.18 50)",
    photo: "/categories/spices.jpg",
  },
  oil: {
    label: "Oils",
    icon: Droplets,
    tint: "oklch(0.85 0.13 95)",
    photo: "/categories/oils.jpg",
  },
  beverage: {
    label: "Beverages",
    icon: CupSoda,
    tint: "oklch(0.78 0.12 230)",
    photo: "/categories/beverages.jpg",
  },
  snack: {
    label: "Snacks",
    icon: Cookie,
    tint: "oklch(0.78 0.13 60)",
    photo: "/categories/snacks.jpg",
  },
  other: {
    label: "Other",
    icon: Package,
    tint: "oklch(0.75 0.02 260)",
    photo: "/categories/other.jpg",
  },
}

export const MEAL_TYPE_META: Record<MealType, { label: string; icon: LucideIcon; tint: string }> = {
  breakfast: { label: "Breakfast", icon: Sun, tint: "oklch(0.82 0.15 75)" },
  lunch: { label: "Lunch", icon: Sandwich, tint: "oklch(0.78 0.16 140)" },
  dinner: { label: "Dinner", icon: Moon, tint: "oklch(0.72 0.13 270)" },
  snack: { label: "Snack", icon: Coffee, tint: "oklch(0.78 0.13 60)" },
}

export function normalizeCategory(input: string | null | undefined): PantryCategory {
  if (!input) return "other"
  const v = input.toLowerCase().trim()
  if ((PANTRY_CATEGORIES as readonly string[]).includes(v)) return v as PantryCategory
  // A few common synonyms the model might emit.
  if (["veg", "veggies", "vegetables"].includes(v)) return "vegetable"
  if (["fruits"].includes(v)) return "fruit"
  if (["carb", "carbs", "grains", "rice", "bread"].includes(v)) return "grain"
  if (["meat", "poultry", "fish", "seafood", "egg", "eggs", "legume", "legumes"].includes(v)) return "protein"
  if (["herb", "herbs", "condiment", "sauce"].includes(v)) return "spice"
  if (["fat", "fats", "ghee", "butter"].includes(v)) return "oil"
  if (["drink", "drinks", "juice", "tea", "coffee"].includes(v)) return "beverage"
  if (["snacks"].includes(v)) return "snack"
  return "other"
}
