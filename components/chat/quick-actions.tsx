'use client'

import { Utensils, Package, BarChart3, Lightbulb } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface QuickActionsProps {
  onMeals: () => void
  onPantry: () => void
  onAnalytics: () => void
  onInsights: () => void
}

export function QuickActions({
  onMeals,
  onPantry,
  onAnalytics,
  onInsights,
}: QuickActionsProps) {
  const actions = [
    {
      icon: Utensils,
      label: 'Meals',
      description: 'View & manage meals',
      onClick: onMeals,
      color: 'from-orange-500 to-red-500',
    },
    {
      icon: Package,
      label: 'Pantry',
      description: 'Check pantry items',
      onClick: onPantry,
      color: 'from-green-500 to-emerald-500',
    },
    {
      icon: BarChart3,
      label: 'Analytics',
      description: 'View nutrition stats',
      onClick: onAnalytics,
      color: 'from-blue-500 to-cyan-500',
    },
    {
      icon: Lightbulb,
      label: 'Insights',
      description: 'Get recommendations',
      onClick: onInsights,
      color: 'from-purple-500 to-pink-500',
    },
  ]

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
      {actions.map((action, idx) => {
        const Icon = action.icon
        return (
          <button
            key={idx}
            onClick={action.onClick}
            className={`
              group relative p-3 rounded-lg transition-all duration-300 ease-out
              bg-gradient-to-br ${action.color} opacity-20
              hover:opacity-30 active:scale-95
              flex flex-col items-center justify-center gap-2
              border border-current/20 hover:border-current/40
            `}
          >
            <Icon className="w-5 h-5" />
            <span className="text-xs font-semibold text-center">{action.label}</span>
            <span className="text-xs opacity-75 hidden group-hover:block">{action.description}</span>
          </button>
        )
      })}
    </div>
  )
}
