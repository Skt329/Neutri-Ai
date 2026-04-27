'use client'

import React from 'react'
import { cn } from '@/lib/utils'

interface AnimatedCardProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'gradient' | 'glass' | 'premium'
  hoverEffect?: 'lift' | 'glow' | 'scale' | 'none'
  children: React.ReactNode
}

export function AnimatedCard({
  className,
  variant = 'default',
  hoverEffect = 'lift',
  children,
  ...props
}: AnimatedCardProps) {
  const baseStyles = 'rounded-xl border transition-all duration-300'

  const variantStyles = {
    default: 'bg-card border-border hover:border-primary/50',
    gradient: 'bg-gradient-to-br from-card via-muted to-card border-primary/20',
    glass: 'glass-morphism',
    premium: 'bg-gradient-to-br from-primary/10 via-secondary/5 to-accent/10 border-primary/30',
  }

  const hoverStyles = {
    lift: 'hover:shadow-lg hover:-translate-y-1 hover:shadow-primary/20',
    glow: 'hover:shadow-lg hover:shadow-primary/40',
    scale: 'hover:scale-105',
    none: '',
  }

  return (
    <div
      className={cn(baseStyles, variantStyles[variant], hoverStyles[hoverEffect], className)}
      {...props}
    >
      {children}
    </div>
  )
}

export function AnimatedCardContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('p-6', className)} {...props}>
      {children}
    </div>
  )
}

export function AnimatedCardHeader({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn('flex items-center justify-between pb-4 border-b border-border/50', className)} {...props}>
      {children}
    </div>
  )
}

export function AnimatedCardTitle({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3 className={cn('text-lg font-semibold text-foreground', className)} {...props}>
      {children}
    </h3>
  )
}

export function AnimatedCardDescription({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn('text-sm text-muted-foreground', className)} {...props}>
      {children}
    </p>
  )
}
