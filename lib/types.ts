export type Sex = "male" | "female" | "other" | "prefer_not_say"
export type ActivityLevel = "sedentary" | "light" | "moderate" | "active" | "very_active"
export type Goal = "lose" | "maintain" | "gain" | "recomp"
export type MealType = "breakfast" | "lunch" | "dinner" | "snack"
export type MealSource = "manual" | "chat" | "swiggy"
export type CookingSkill = "beginner" | "intermediate" | "advanced"
export type NutritionBasis = "per_100g" | "per_100ml" | "per_piece" | "per_serving"

export interface Profile {
  id: string
  full_name: string | null
  age: number | null
  sex: Sex | null
  height_cm: number | null
  weight_kg: number | null
  activity_level: ActivityLevel | null
  goal: Goal | null
  dietary_preferences: string[]
  allergies: string[]
  health_conditions: string[]
  /** Appliances/equipment available in the user's kitchen (stove, oven, air-fryer, pressure cooker, etc). */
  kitchen_appliances: string[]
  /** Cuisine types the user likes to eat (indian, italian, thai, ...). */
  cuisines: string[]
  /** Ingredients the user loves — the AI biases suggestions toward these. */
  favorite_ingredients: string[]
  /** Ingredients the user dislikes — the AI avoids these in suggestions. */
  disliked_ingredients: string[]
  cooking_skill: CookingSkill | null
  household_size: number | null
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}

export interface NutritionTargets {
  id: string
  user_id: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number | null
  effective_from: string
  created_at: string
}

export interface MealItem {
  name: string
  quantity?: string
}

export interface MealLog {
  id: string
  user_id: string
  logged_at: string
  meal_type: MealType | null
  description: string
  calories: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  items: MealItem[]
  source: MealSource
  created_at: string
}

export interface PantryItem {
  id: string
  user_id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  expires_on: string | null
  /** Nutrition per 100g / 100ml / piece / serving (see nutrition_basis). */
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  nutrition_basis: NutritionBasis | null
  created_at: string
  updated_at: string
}

export interface Conversation {
  id: string
  user_id: string
  title: string | null
  created_at: string
  updated_at: string
}

export interface DailyTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
}

export interface WeightLog {
  id: string
  user_id: string
  weight_kg: number
  logged_at: string
  note: string | null
  created_at: string
}

export interface StreakInfo {
  /** Consecutive days ending today (or yesterday if the user hasn't logged today yet) with at least one meal. */
  currentStreak: number
  /** Longest streak ever. */
  longestStreak: number
  /** How many of the last 7 days had at least one meal logged (0-7). */
  weeklyConsistency: number
  /** Flags for individual days in the past week (oldest first). True = logged. */
  last7Days: boolean[]
  /** Whether the user has logged any meal today. */
  loggedToday: boolean
}

export interface DailyBreakdown {
  date: string
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
  mealCount: number
}

export interface WeeklyStats {
  days: DailyBreakdown[]
  avgCalories: number
  bestDay: DailyBreakdown | null
  worstDay: DailyBreakdown | null
  macroConsistencyPct: number
  weightChangeKg: number | null
  startWeightKg: number | null
  endWeightKg: number | null
  totalMealsLogged: number
  targetCalories: number | null
}

export interface DeficitAlert {
  kind: "protein" | "fiber" | "calories_low" | "calories_high" | "gap"
  severity: "info" | "warning"
  title: string
  message: string
  quickFix?: string
}
