export default function DashboardLoading() {
  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <div className="h-8 w-56 rounded-full bg-cream3" />
          <div className="h-4 w-36 rounded-full bg-cream3 mt-2" />
        </div>
        <div className="h-10 w-32 rounded-full bg-cream3 hidden md:block" />
      </div>

      {/* Grid */}
      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        {/* Calorie ring placeholder */}
        <div className="bg-card rounded-3xl border border-border p-6">
          <div className="h-3 w-24 rounded bg-cream3 mb-4" />
          <div className="flex items-center justify-center py-8">
            <div className="size-44 rounded-full border-[12px] border-cream3" />
          </div>
        </div>

        {/* Meals timeline */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="h-3 w-28 rounded bg-cream3" />
            <div className="h-3 w-16 rounded bg-cream3" />
          </div>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-4 flex items-center gap-3">
              <div className="size-10 rounded-xl bg-cream3" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-20 rounded bg-cream3" />
                <div className="h-4 w-36 rounded bg-cream3" />
              </div>
              <div className="h-3 w-16 rounded bg-cream3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
