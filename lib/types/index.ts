/**
 * Domain types — re-exports for backward compatibility.
 *
 * New code should import from specific type modules:
 *   import type { Profile } from '@/lib/types/profile.types'
 *   import type { MealLog } from '@/lib/types/meal.types'
 *
 * Legacy imports still work:
 *   import type { Profile, MealLog } from '@/lib/types'
 */

export * from './profile.types'
export * from './meal.types'
export * from './pantry.types'
export * from './nutrition.types'
export * from './conversation.types'
export * from './weight.types'
export * from './streak.types'
