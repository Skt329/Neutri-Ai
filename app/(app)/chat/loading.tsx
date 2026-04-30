export default function ChatLayoutLoading() {
  return (
    <div className="flex h-[calc(100dvh-56px)] md:h-[calc(100dvh-57px)] bg-cream">
      {/* Sidebar skeleton — desktop only */}
      <div className="hidden md:flex w-[280px] flex-col bg-forest p-4 animate-pulse">
        {/* User header */}
        <div className="flex items-center gap-3 mb-6 pt-2">
          <div className="size-9 rounded-full bg-white/10" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3.5 w-24 rounded bg-white/10" />
            <div className="h-3 w-16 rounded bg-white/10" />
          </div>
        </div>
        {/* New chat button */}
        <div className="h-10 w-full rounded-xl bg-white/10 mb-4" />
        {/* Section label */}
        <div className="h-3 w-12 rounded bg-white/8 mb-3" />
        {/* Conversation items */}
        <div className="space-y-1.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex items-center gap-2 p-2.5 rounded-lg">
              <div className="size-4 rounded bg-white/8 shrink-0" />
              <div className="h-3.5 rounded bg-white/8" style={{ width: `${60 + Math.random() * 40}%` }} />
            </div>
          ))}
        </div>
      </div>
      {/* Main content area */}
      <div className="flex flex-1 flex-col min-w-0 items-center justify-center animate-pulse">
        <div className="size-16 rounded-full bg-cream3 mb-6" />
        <div className="h-7 w-52 rounded-full bg-cream3 mb-3" />
        <div className="h-4 w-72 rounded bg-cream3" />
      </div>
    </div>
  )
}
