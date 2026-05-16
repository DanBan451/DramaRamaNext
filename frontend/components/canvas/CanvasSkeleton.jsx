"use client";

// Sidebar + canvas + chat skeleton shown while the canvas data is loading.
// Mirrors the real layout (left sidebar, center canvas with header, right
// chat panel) so the page doesn't visibly reflow when content arrives.
// Uses Tailwind's `animate-pulse` on muted gray blocks.

export default function CanvasSkeleton({ withNavbar = false }) {
  const rootClass = withNavbar
    ? "mt-[var(--navbar-height)] flex min-h-0 h-[calc(100svh-var(--navbar-height))] max-h-[calc(100svh-var(--navbar-height))] supports-[height:100dvh]:h-[calc(100dvh-var(--navbar-height))] supports-[height:100dvh]:max-h-[calc(100dvh-var(--navbar-height))] bg-white overflow-hidden"
    : "flex h-screen bg-white overflow-hidden";

  const chatAsideClass = withNavbar
    ? "w-[380px] shrink-0 border-l border-mist p-4 space-y-4 hidden lp:block"
    : "w-80 shrink-0 border-l border-mist p-4 space-y-4 hidden lp:block";

  return (
    <div className={rootClass}>
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

      <div className="flex-1 min-w-0 flex flex-col">
        <header
          className={
            withNavbar
              ? "shrink-0 border-b border-mist h-10 flex items-center gap-3 px-3"
              : "border-b border-mist p-4 space-y-2"
          }
        >
          {withNavbar ? (
            <>
              <div className="h-3 w-16 bg-mist rounded animate-pulse shrink-0" />
              <div className="h-3 flex-1 max-w-md bg-mist/70 rounded animate-pulse" />
            </>
          ) : (
            <>
              <div className="h-3 w-32 bg-mist rounded animate-pulse" />
              <div className="h-6 w-2/3 bg-mist rounded animate-pulse" />
              <div className="h-3 w-3/4 bg-mist/70 rounded animate-pulse" />
              <div className="h-3 w-1/2 bg-mist/70 rounded animate-pulse" />
            </>
          )}
        </header>

        <div className="flex-1 relative bg-mist/20 min-h-0">
          <div
            className="absolute inset-0 opacity-40"
            style={{
              backgroundImage:
                "radial-gradient(circle, #d1d5db 1px, transparent 1px)",
              backgroundSize: "24px 24px",
            }}
          />
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

      <aside className={chatAsideClass}>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-smoke/60" />
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
