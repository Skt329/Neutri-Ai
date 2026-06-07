export type Sex = 'male' | 'female' | 'other' | 'prefer_not_say'
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active'
export type Goal = 'lose' | 'maintain' | 'gain' | 'recomp'
export type CookingSkill = 'beginner' | 'intermediate' | 'advanced'

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
  kitchen_appliances: string[]
  cuisines: string[]
  favorite_ingredients: string[]
  disliked_ingredients: string[]
  cooking_skill: CookingSkill | null
  household_size: number | null
  timezone: string
  onboarding_completed: boolean
  created_at: string
  updated_at: string
}
