'use client'

import React from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import { cn } from '@/lib/utils'

interface ChartProps {
  data: any[]
  className?: string
}

export function AnimatedBarChart({ data, className }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} className={cn('animate-fade-in-up', className)}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Bar dataKey="value" fill="hsl(var(--primary))" radius={[8, 8, 0, 0]} animationDuration={800} />
      </BarChart>
    </ResponsiveContainer>
  )
}

export function AnimatedLineChart({ data, className }: ChartProps) {
  return (
    <ResponsiveContainer width="100%" height={300} className={cn('animate-fade-in-up', className)}>
      <LineChart data={data} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
        <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" />
        <YAxis stroke="hsl(var(--muted-foreground))" />
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))' }}
          animationDuration={800}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export function AnimatedPieChart({ data, className }: ChartProps) {
  const COLORS = [
    'hsl(var(--macro-cal))',
    'hsl(var(--macro-protein))',
    'hsl(var(--macro-carbs))',
    'hsl(var(--macro-fat))',
    'hsl(var(--macro-fiber))',
  ]

  return (
    <ResponsiveContainer width="100%" height={300} className={cn('animate-fade-in-up', className)}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, value }) => `${name}: ${value}g`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
          animationDuration={800}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
          labelStyle={{ color: 'hsl(var(--foreground))' }}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}

interface MacroBreakdownProps {
  calories: number
  protein: number
  carbs: number
  fat: number
  fiber?: number
}

export function MacroBreakdown({ calories, protein, carbs, fat, fiber = 0 }: MacroBreakdownProps) {
  const total = calories
  const macros = [
    { name: 'Protein', value: protein, color: 'bg-orange-500' },
    { name: 'Carbs', value: carbs, color: 'bg-amber-500' },
    { name: 'Fat', value: fat, color: 'bg-blue-500' },
  ]

  return (
    <div className="space-y-4">
      <div className="flex h-8 gap-1 overflow-hidden rounded-full bg-muted">
        {macros.map((macro) => (
          <div
            key={macro.name}
            className={cn('transition-all duration-500', macro.color)}
            style={{ width: `${(macro.value / total) * 100}%` }}
            title={`${macro.name}: ${macro.value}g`}
          />
        ))}
      </div>
      <div className="grid grid-cols-3 gap-3 text-sm">
        {macros.map((macro) => (
          <div key={macro.name} className="flex flex-col gap-1">
            <span className="text-xs text-muted-foreground">{macro.name}</span>
            <span className="font-semibold">{macro.value}g</span>
          </div>
        ))}
      </div>
    </div>
  )
}

interface ProgressRingProps {
  percentage: number
  label: string
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'accent' | 'destructive'
}

export function ProgressRing({ percentage, label, size = 'md', variant = 'primary' }: ProgressRingProps) {
  const circumference = 2 * Math.PI * 45
  const strokeDashoffset = circumference - (percentage / 100) * circumference
  const sizeMap = { sm: 100, md: 140, lg: 180 }
  const dimension = sizeMap[size]

  const variantColors = {
    primary: 'text-primary',
    secondary: 'text-secondary',
    accent: 'text-accent',
    destructive: 'text-destructive',
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: dimension, height: dimension }}>
        <svg width={dimension} height={dimension} className="transform -rotate-90">
          <circle cx={dimension / 2} cy={dimension / 2} r={45} fill="none" stroke="hsl(var(--muted))" strokeWidth={6} />
          <circle
            cx={dimension / 2}
            cy={dimension / 2}
            r={45}
            fill="none"
            stroke="currentColor"
            strokeWidth={6}
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className={cn(variantColors[variant], 'transition-all duration-500')}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center">
            <div className="text-2xl font-bold">{Math.round(percentage)}%</div>
            <div className="text-xs text-muted-foreground">{label}</div>
          </div>
        </div>
      </div>
    </div>
  )
}
