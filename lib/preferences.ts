/**
 * Shared vocabulary used by onboarding, profile, and the AI system prompt.
 * Always lowercase snake_case; the UI renders a prettier version.
 */
export const KITCHEN_APPLIANCES = [
  "stove",
  "oven",
  "microwave",
  "air_fryer",
  "pressure_cooker",
  "induction",
  "grill",
  "blender",
  "toaster",
  "mixer",
  "refrigerator",
] as const

export const CUISINES = [
  "indian",
  "south_indian",
  "italian",
  "mexican",
  "thai",
  "chinese",
  "japanese",
  "mediterranean",
  "continental",
  "middle_eastern",
] as const

export const DIETARY_PREFERENCES = [
  "vegetarian",
  "vegan",
  "eggetarian",
  "jain",
  "pescatarian",
  "high_protein",
  "low_carb",
  "keto",
  "gluten_free",
  "dairy_free",
] as const

export const COMMON_ALLERGIES = ["peanuts", "tree_nuts", "dairy", "gluten", "soy", "eggs", "shellfish", "fish"] as const
export const COMMON_HEALTH = ["diabetes", "hypertension", "pcos", "thyroid", "high_cholesterol", "anemia"] as const
