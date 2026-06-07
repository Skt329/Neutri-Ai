export type NutritionBasis = 'per_100g' | 'per_100ml' | 'per_piece' | 'per_serving'

export interface PantryItem {
  id: string
  user_id: string
  name: string
  quantity: number | null
  unit: string | null
  category: string | null
  expires_on: string | null
  calories_kcal: number | null
  protein_g: number | null
  carbs_g: number | null
  fat_g: number | null
  fiber_g: number | null
  nutrition_basis: NutritionBasis | null
  created_at: string
  updated_at: string
}
