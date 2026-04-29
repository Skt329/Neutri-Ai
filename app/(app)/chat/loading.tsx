export default function ChatIndexLoading() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 p-8 animate-pulse">
      <div className="size-20 rounded-full bg-cream3" />
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-64 rounded-full bg-cream3" />
        <div className="h-4 w-80 rounded bg-cream3" />
      </div>
      <div className="h-12 w-48 rounded-full bg-cream3" />
      <div className="w-full max-w-lg md:hidden space-y-2 mt-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-card border border-border">
            <div className="size-9 rounded-lg bg-cream3 shrink-0" />
            <div className="flex-1 space-y-1.5">
              <div className="h-4 w-32 rounded bg-cream3" />
              <div className="h-3 w-20 rounded bg-cream3" />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
