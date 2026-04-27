'use client'

import React from 'react'
import { cn } from '@/lib/utils'
import { Trash2, Clock } from 'lucide-react'
import { Button } from '@/components/ui/button'

export interface MealCardProps {
  id: string
  name: string
  calories: number
  protein: number
  carbs: number
  fat: number
  time: string
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack'
  onDelete?: () => void
}

export function MealCard({
  id,
  name,
  calories,
  protein,
  carbs,
  fat,
  time,
  mealType,
  onDelete,
}: MealCardProps) {
  const mealTypeColors = {
    breakfast: 'from-orange-500/20 to-amber-500/10',
    lunch: 'from-green-500/20 to-emerald-500/10',
    dinner: 'from-blue-500/20 to-cyan-500/10',
    snack: 'from-purple-500/20 to-pink-500/10',
  }

  return (
    <div
      className={cn(
        'group rounded-xl border border-border/50 bg-gradient-to-br p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5',
        mealTypeColors[mealType]
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{name}</h3>
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            {time}
          </div>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2 text-center text-xs">
        <div>
          <div className="text-lg font-bold text-red-400">{calories}</div>
          <div className="text-muted-foreground">Cal</div>
        </div>
        <div>
          <div className="text-lg font-bold text-orange-400">{protein}g</div>
          <div className="text-muted-foreground">Protein</div>
        </div>
        <div>
          <div className="text-lg font-bold text-amber-400">{carbs}g</div>
          <div className="text-muted-foreground">Carbs</div>
        </div>
        <div>
          <div className="text-lg font-bold text-blue-400">{fat}g</div>
          <div className="text-muted-foreground">Fat</div>
        </div>
      </div>
    </div>
  )
}

export interface PantryCardProps {
  id: string
  name: string
  category: string
  quantity: number
  unit: string
  calories: number
  protein: number
  onDelete?: () => void
}

export function PantryCard({
  id,
  name,
  category,
  quantity,
  unit,
  calories,
  protein,
  onDelete,
}: PantryCardProps) {
  const categoryColors: Record<string, string> = {
    protein: 'from-orange-500/20 to-red-500/10',
    vegetables: 'from-green-500/20 to-emerald-500/10',
    fruits: 'from-pink-500/20 to-rose-500/10',
    grains: 'from-amber-500/20 to-yellow-500/10',
    dairy: 'from-blue-500/20 to-cyan-500/10',
    oils: 'from-yellow-500/20 to-amber-500/10',
    beverages: 'from-purple-500/20 to-indigo-500/10',
    snacks: 'from-pink-500/20 to-purple-500/10',
    spices: 'from-red-500/20 to-orange-500/10',
    other: 'from-gray-500/20 to-slate-500/10',
  }

  return (
    <div
      className={cn(
        'group rounded-xl border border-border/50 bg-gradient-to-br p-4 transition-all duration-300 hover:border-primary/50 hover:shadow-lg hover:shadow-primary/10 hover:-translate-y-0.5',
        categoryColors[category] || categoryColors.other
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold truncate group-hover:text-primary transition-colors">{name}</h3>
          <p className="text-xs text-muted-foreground capitalize mt-1">{category}</p>
        </div>
        {onDelete && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="w-4 h-4 text-destructive" />
          </Button>
        )}
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Quantity</span>
          <span className="font-semibold">
            {quantity} {unit}
          </span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Calories</span>
          <span className="font-semibold text-red-400">{calories}</span>
        </div>
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">Protein</span>
          <span className="font-semibold text-orange-400">{protein}g</span>
        </div>
      </div>
    </div>
  )
}

export function MealsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 w-full">
      {children}
    </div>
  )
}

export function PantryGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 w-full">
      {children}
    </div>
  )
}
