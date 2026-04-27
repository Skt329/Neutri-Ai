'use client'

import React, { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface AnimatedStatProps {
  label: string
  value: number | string
  unit?: string
  variant?: 'default' | 'primary' | 'secondary' | 'accent'
  format?: (value: number) => string
  animated?: boolean
  size?: 'sm' | 'md' | 'lg'
}

export function AnimatedStat({
  label,
  value,
  unit = '',
  variant = 'default',
  format = (v) => v.toString(),
  animated = true,
  size = 'md',
}: AnimatedStatProps) {
  const [displayValue, setDisplayValue] = useState<string>(
    typeof value === 'number' && animated ? '0' : format(typeof value === 'number' ? value : 0)
  )

  useEffect(() => {
    if (typeof value !== 'number' || !animated) {
      setDisplayValue(typeof value === 'number' ? format(value) : value)
      return
    }

    const startValue = 0
    const endValue = value
    const duration = 1000 // 1 second
    const steps = 60
    const stepDuration = duration / steps
    let currentStep = 0

    const interval = setInterval(() => {
      currentStep++
      const progress = currentStep / steps
      const currentValue = Math.round(startValue + (endValue - startValue) * progress)
      setDisplayValue(format(currentValue))

      if (currentStep >= steps) {
        clearInterval(interval)
        setDisplayValue(format(endValue))
      }
    }, stepDuration)

    return () => clearInterval(interval)
  }, [value, animated, format])

  const variantStyles = {
    default: 'text-muted-foreground',
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
  }

  const sizeStyles = {
    sm: {
      value: 'text-2xl',
      label: 'text-xs',
    },
    md: {
      value: 'text-4xl',
      label: 'text-sm',
    },
    lg: {
      value: 'text-6xl',
      label: 'text-base',
    },
  }

  return (
    <div className="flex flex-col gap-2">
      <div className={cn('font-bold tabular-nums', sizeStyles[size].value, variantStyles[variant])}>
        {displayValue}
        {unit && <span className="text-lg ml-1">{unit}</span>}
      </div>
      <div className={cn('font-medium text-muted-foreground', sizeStyles[size].label)}>{label}</div>
    </div>
  )
}

export function StatsGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 w-full">
      {children}
    </div>
  )
}

export function StatCard({
  label,
  value,
  icon,
  unit,
  trend,
  trendDirection = 'up',
}: {
  label: string
  value: number
  icon?: React.ReactNode
  unit?: string
  trend?: number
  trendDirection?: 'up' | 'down'
}) {
  return (
    <div className="rounded-xl border border-border/50 bg-gradient-to-br from-card/50 via-card to-muted/20 p-6 backdrop-blur-sm hover:border-primary/30 transition-all duration-300">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground font-medium">{label}</p>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-3xl font-bold tabular-nums">{value}</span>
            {unit && <span className="text-sm text-muted-foreground">{unit}</span>}
          </div>
          {trend !== undefined && (
            <p className={cn('text-xs font-semibold mt-2', trendDirection === 'up' ? 'text-green-400' : 'text-orange-400')}>
              {trendDirection === 'up' ? '↑' : '↓'} {Math.abs(trend)}% this week
            </p>
          )}
        </div>
        {icon && <div className="text-primary/60">{icon}</div>}
      </div>
    </div>
  )
}
