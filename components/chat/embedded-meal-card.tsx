'use client'

import { Button } from '@/components/ui/button'
import { Clock, Flame, Dumbbell } from 'lucide-react'

interface EmbeddedMealCardProps {
  mealName: string
  calories: number
  protein: number
  prepTime: number
  available: boolean
  imageEmoji?: string
  actions?: Array<{ label: string; icon?: string; onClick?: () => void }>
}

export function EmbeddedMealCard({
  mealName,
  calories,
  protein,
  prepTime,
  available,
  imageEmoji = '🍽️',
  actions = [],
}: EmbeddedMealCardProps) {
  return (
    <div className="w-full bg-sage text-white rounded-xl p-4 space-y-3 max-w-md">
      {/* Meal Header */}
      <div className="flex items-start gap-3">
        <div className="text-3xl">{imageEmoji}</div>
        <div className="flex-1">
          <h4 className="font-semibold text-sm">{mealName}</h4>
          {available && (
            <p className="text-xs opacity-90">✓ in pantry</p>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 bg-sage-700 rounded-lg p-2">
        <div className="text-center">
          <div className="text-xs opacity-80">Calories</div>
          <div className="text-sm font-bold">{calories} kcal</div>
        </div>
        <div className="text-center">
          <div className="text-xs opacity-80">Protein</div>
          <div className="text-sm font-bold">{protein}g</div>
        </div>
        <div className="text-center flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" />
          <div className="text-sm font-bold">{prepTime} min</div>
        </div>
      </div>

      {/* Actions */}
      {actions.length > 0 && (
        <div className="flex gap-2 pt-2">
          {actions.map((action, idx) => (
            <Button
              key={idx}
              onClick={action.onClick}
              className="flex-1 bg-turmeric hover:bg-turmeric-dark text-ink font-semibold text-xs h-8"
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </div>
  )
}
