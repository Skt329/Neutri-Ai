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

export interface DailyTotals {
  calories: number
  protein_g: number
  carbs_g: number
  fat_g: number
  fiber_g: number
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
  kind: 'protein' | 'fiber' | 'calories_low' | 'calories_high' | 'gap'
  severity: 'info' | 'warning'
  title: string
  message: string
  quickFix?: string
}
