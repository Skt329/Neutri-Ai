export default function PantryLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-32 rounded-full bg-cream3" />
        <div className="h-10 w-28 rounded-full bg-cream3" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border p-4 space-y-2">
            <div className="flex items-center gap-2">
              <div className="size-8 rounded-lg bg-cream3" />
              <div className="h-4 w-28 rounded bg-cream3" />
            </div>
            <div className="h-3 w-20 rounded bg-cream3" />
            <div className="h-3 w-16 rounded bg-cream3" />
          </div>
        ))}
      </div>
    </div>
  )
}
