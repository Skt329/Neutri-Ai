export default function SwiggyLoading() {
  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 rounded-full bg-cream3" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="bg-card rounded-2xl border border-border overflow-hidden">
            <div className="h-36 bg-cream3" />
            <div className="p-4 space-y-2">
              <div className="h-5 w-32 rounded bg-cream3" />
              <div className="h-3 w-24 rounded bg-cream3" />
              <div className="h-3 w-20 rounded bg-cream3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
