export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack'
export type MealSource = 'manual' | 'chat' | 'swiggy'

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
