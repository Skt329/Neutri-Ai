export default function MealsLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 rounded-full bg-cream3" />
        <div className="h-10 w-28 rounded-full bg-cream3" />
      </div>
      {/* Summary cards */}
      <div className="grid gap-3 grid-cols-2 md:grid-cols-4 mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <div className="h-3 w-12 rounded bg-cream3" />
            <div className="h-6 w-16 rounded bg-cream3" />
          </div>
        ))}
      </div>
      {/* Meal items */}
      <div className="space-y-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
            <div className="size-10 rounded-lg bg-cream3 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-40 rounded bg-cream3" />
              <div className="h-3 w-28 rounded bg-cream3" />
            </div>
            <div className="h-4 w-16 rounded bg-cream3" />
          </div>
        ))}
      </div>
    </div>
  )
}
