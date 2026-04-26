"use client";

// Sidebar + canvas + chat skeleton shown while the canvas data is loading.
// Mirrors the real layout (left sidebar, center canvas with header, right
// chat panel) so the page doesn't visibly reflow when content arrives.
// Uses Tailwind's `animate-pulse` on muted gray blocks.

export default function CanvasSkeleton() {
  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* Left sidebar skeleton */}
      <aside className="w-64 shrink-0 border-r border-mist p-4 space-y-4">
        <div className="h-3 w-20 bg-mist rounded animate-pulse" />
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-mist/70 rounded-lg animate-pulse"
              style={{ animationDelay: `${i * 80}ms` }}
            />
          ))}
        </div>
      </aside>

      {/* Center column skeleton */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Header */}
        <header className="border-b border-mist p-4 space-y-2">
          <div className="h-3 w-32 bg-mist rounded animate-pulse" />
          <div className="h-6 w-2/3 bg-mist rounded animate-pulse" />
          <div className="h-3 w-3/4 bg-mist/70 rounded animate-pulse" />
          <div className="h-3 w-1/2 bg-mist/70 rounded animate-pulse" />
        </header>

        {/* Canvas surface */}
        <div className="flex-1 relative bg-mist/20">
          {/* Faint dot grid */}
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
          {/* A few placeholder thought blocks pulsing in scattered spots */}
          <div
            className="absolute bg-white border border-mist rounded-xl shadow-sm h-24 w-44 animate-pulse"
            style={{ top: "18%", left: "14%" }}
          />
          <div
            className="absolute bg-white border border-mist rounded-xl shadow-sm h-24 w-44 animate-pulse"
            style={{ top: "42%", left: "44%", animationDelay: "120ms" }}
          />
          <div
            className="absolute bg-white border border-mist rounded-xl shadow-sm h-24 w-44 animate-pulse"
            style={{ top: "66%", left: "22%", animationDelay: "240ms" }}
          />
          <div
            className="absolute bg-white border border-mist rounded-xl shadow-sm h-24 w-44 animate-pulse"
            style={{ top: "30%", left: "70%", animationDelay: "360ms" }}
          />
        </div>
      </div>

      {/* Right chat skeleton */}
      <aside className="w-80 shrink-0 border-l border-mist p-4 space-y-4 hidden lp:block">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-change/40" />
          <div className="h-3 w-28 bg-mist rounded animate-pulse" />
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-full bg-mist animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full bg-mist rounded animate-pulse" />
            <div className="h-3 w-5/6 bg-mist rounded animate-pulse" />
            <div className="h-3 w-4/6 bg-mist rounded animate-pulse" />
          </div>
        </div>
        <div className="flex gap-2">
          <div className="h-7 w-7 rounded-full bg-mist animate-pulse flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-3 w-full bg-mist rounded animate-pulse" />
            <div className="h-3 w-3/4 bg-mist rounded animate-pulse" />
          </div>
        </div>
      </aside>
    </div>
  );
}
