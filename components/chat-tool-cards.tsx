"use client"

/**
 * Barrel re-export — all tool card components.
 *
 * The original monolithic chat-tool-cards.tsx (788 lines) has been split into:
 *   - components/chat/tool-card-shared.tsx    (shell, macro inputs, formatBasisLabel)
 *   - components/chat/ask-user-card.tsx       (AskUserCard)
 *   - components/chat/choose-option-card.tsx  (ChooseOptionCard)
 *   - components/chat/propose-meal-card.tsx   (ProposeMealCard)
 *   - components/chat/propose-pantry-card.tsx (ProposePantryCard)
 *
 * This file re-exports everything so existing imports keep working:
 *   import { AskUserCard, ProposeMealCard, ... } from "@/components/chat-tool-cards"
 */

export { AskUserCard } from "./chat/ask-user-card"
export type { AskUserField, AskUserInput, AskUserOutput } from "./chat/ask-user-card"

export { ChooseOptionCard } from "./chat/choose-option-card"
export type { ChooseOptionInput, ChooseOptionOutput } from "./chat/choose-option-card"

export { ProposeMealCard } from "./chat/propose-meal-card"
export type { ProposeMealInput, ProposeMealOutput } from "./chat/propose-meal-card"

export { ProposePantryCard } from "./chat/propose-pantry-card"
export type {
  ProposePantryItem,
  ProposePantryInput,
  ProposePantryOutput,
  NutritionBasis,
} from "./chat/propose-pantry-card"

// Re-export Textarea to preserve the existing export signature
export { Textarea } from "@/components/ui/textarea"
