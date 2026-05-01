'use client'

const ACTIONS = [
  { label: 'Log a meal', prompt: 'I want to log a meal' },
  { label: 'Update pantry', prompt: 'Add items to my pantry' },
  { label: 'Meal plan', prompt: 'Suggest a meal plan for today' },
  { label: 'My progress', prompt: 'How am I doing today? Show me my daily totals' },
  { label: 'Find recipe', prompt: 'Suggest a recipe from my pantry items' },
] as const

export function QuickActions({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="flex flex-wrap gap-1.5 px-4 pt-3 pb-1 md:px-6 overflow-x-auto scrollbar-none">
      {ACTIONS.map((a) => (
        <button
          key={a.label}
          onClick={() => onPick(a.prompt)}
          className="inline-flex items-center rounded-full border border-border/70 bg-card/80 px-3 py-1.5 text-[11px] font-medium text-stone/80 hover:border-sage/30 hover:bg-cream2/80 hover:text-ink smooth-hover whitespace-nowrap"
        >
          {a.label}
        </button>
      ))}
    </div>
  )
}
