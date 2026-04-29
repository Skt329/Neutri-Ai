export default function ChatLoading() {
  return (
    <div className="flex flex-1 flex-col animate-pulse">
      {/* Header skeleton */}
      <div className="flex items-center gap-3 border-b border-border bg-card px-4 py-3 md:px-6">
        <div className="h-5 w-40 rounded-full bg-cream3" />
        <div className="ml-auto h-8 w-8 rounded-full bg-cream3" />
      </div>

      {/* Messages skeleton */}
      <div className="flex-1 p-4 md:p-6 space-y-5 max-w-3xl mx-auto w-full">
        {/* User message */}
        <div className="flex gap-3 flex-row-reverse">
          <div className="size-8 rounded-full bg-sage/20 shrink-0" />
          <div className="h-12 w-48 rounded-2xl bg-cream3" />
        </div>
        {/* AI message */}
        <div className="flex gap-3">
          <div className="size-8 rounded-full bg-mint/30 shrink-0" />
          <div className="space-y-2 flex-1 max-w-md">
            <div className="h-4 w-full rounded bg-cream3" />
            <div className="h-4 w-3/4 rounded bg-cream3" />
            <div className="h-4 w-1/2 rounded bg-cream3" />
          </div>
        </div>
        {/* User message */}
        <div className="flex gap-3 flex-row-reverse">
          <div className="size-8 rounded-full bg-sage/20 shrink-0" />
          <div className="h-10 w-56 rounded-2xl bg-cream3" />
        </div>
        {/* AI message */}
        <div className="flex gap-3">
          <div className="size-8 rounded-full bg-mint/30 shrink-0" />
          <div className="space-y-2 flex-1 max-w-lg">
            <div className="h-4 w-full rounded bg-cream3" />
            <div className="h-4 w-5/6 rounded bg-cream3" />
          </div>
        </div>
      </div>

      {/* Input bar skeleton */}
      <div className="border-t border-border bg-card px-4 py-3 md:px-6">
        <div className="mx-auto flex max-w-3xl items-center gap-2">
          <div className="flex-1 h-12 rounded-2xl bg-cream2" />
          <div className="size-12 rounded-full bg-cream3" />
        </div>
      </div>
    </div>
  )
}
