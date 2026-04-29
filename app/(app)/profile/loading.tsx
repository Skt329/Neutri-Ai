export default function ProfileLoading() {
  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-6 md:py-8 animate-pulse">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="h-8 w-36 rounded-full bg-cream3" />
      </div>

      <div className="grid gap-6 md:grid-cols-[320px_1fr]">
        {/* Left column */}
        <div className="space-y-4">
          {/* Profile card */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-4">
            <div className="flex items-center gap-4">
              <div className="size-16 rounded-full bg-cream3" />
              <div className="flex-1 space-y-2">
                <div className="h-5 w-32 rounded bg-cream3" />
                <div className="h-3 w-20 rounded bg-cream3" />
              </div>
            </div>
            <div className="h-4 w-full rounded bg-cream3" />
            <div className="h-4 w-3/4 rounded bg-cream3" />
          </div>
          {/* BMI card */}
          <div className="bg-card rounded-2xl border border-border p-6 space-y-3">
            <div className="h-5 w-20 rounded bg-cream3" />
            <div className="h-10 w-full rounded-xl bg-cream3" />
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="bg-card rounded-2xl border border-border p-6 space-y-3">
              <div className="flex items-center justify-between">
                <div className="h-5 w-28 rounded bg-cream3" />
                <div className="h-8 w-16 rounded-lg bg-cream3" />
              </div>
              <div className="h-4 w-full rounded bg-cream3" />
              <div className="h-4 w-2/3 rounded bg-cream3" />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
