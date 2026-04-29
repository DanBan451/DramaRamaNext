"use client";

// Phase 4b canvas page. One route per course_puzzle.
// Owns network state + optimistic updates + rollback; delegates UI to
// the shared Canvas component. Errors from the backend pop a tiny
// bottom-right toast that auto-dismisses after ~4 seconds.

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Canvas from "@/components/canvas/Canvas";
import ElementsSidebar from "@/components/canvas/ElementsSidebar";
import StageChat from "@/components/canvas/StageChat";
import CanvasSkeleton from "@/components/canvas/CanvasSkeleton";
// Note: `ELEMENTS` is no longer imported here — the new ElementsSidebar
// component owns its own data import. Don't add it back without a reason.
import {
  getCanvasState,
  createThought,
  updateThoughtPosition,
  updateThoughtContent,
  updateThoughtTagging,
  deleteThought as apiDeleteThought,
  createConnection as apiCreateConnection,
  deleteConnection as apiDeleteConnection,
  generateStage2Nudges,
  updateCurrentStage,
} from "@/lib/canvas-api";

// Block geometry — must match Canvas.tsx constants. Used to lay nudges
// out without overlapping existing thoughts. If you change these in
// Canvas.tsx, update them here too.
const BLOCK_WIDTH = 280;
const BLOCK_MIN_HEIGHT = 100;
const BLOCK_GAP_X = 80;
const BLOCK_GAP_Y = 60;
// Canvas.tsx mounts centered on (CANVAS_INITIAL/2, CANVAS_INITIAL/2).
// When the user has no thoughts yet and advances to Stage 2 immediately,
// we drop nudges near that center so they're inside the viewport instead
// of all the way at (200, 200).
const CANVAS_VIEWPORT_CENTER = 4000;

// Compute 4 nudge positions that EXTEND the user's existing flow rather
// than landing far away. Strategy:
//   1. If the user has thoughts: place nudges in a 2x2 grid to the RIGHT
//      of the rightmost existing thought, vertically centered around the
//      vertical centroid of the existing thoughts. Avoid overlap with
//      any existing block by nudging Y if a candidate intersects.
//   2. If the user has no thoughts: drop them in a 2x2 grid near origin.
function computeNudgePositions(thoughts) {
  const cols = 2;
  const rows = 2;
  const stepX = BLOCK_WIDTH + BLOCK_GAP_X; // 360
  const stepY = BLOCK_MIN_HEIGHT + BLOCK_GAP_Y; // 160

  if (!thoughts || thoughts.length === 0) {
    // Center the 2x2 grid roughly on the initial canvas viewport so the
    // nudges land in front of the user's eyes the moment they appear.
    const totalW = cols * stepX - BLOCK_GAP_X;
    const totalH = rows * stepY - BLOCK_GAP_Y;
    const startX = CANVAS_VIEWPORT_CENTER - totalW / 2;
    const startY = CANVAS_VIEWPORT_CENTER - totalH / 2;
    const out = [];
    for (let r = 0; r < rows; r += 1) {
      for (let c = 0; c < cols; c += 1) {
        out.push([startX + c * stepX, startY + r * stepY]);
      }
    }
    return out;
  }

  // Bounding box of existing thoughts.
  let minY = Infinity;
  let maxY = -Infinity;
  let maxRight = -Infinity;
  for (const t of thoughts) {
    minY = Math.min(minY, t.pos_y);
    maxY = Math.max(maxY, t.pos_y + BLOCK_MIN_HEIGHT);
    maxRight = Math.max(maxRight, t.pos_x + BLOCK_WIDTH);
  }
  const startX = maxRight + BLOCK_GAP_X;
  const blockHeight = rows * stepY - BLOCK_GAP_Y;
  const centerY = (minY + maxY) / 2;
  const startY = Math.max(0, centerY - blockHeight / 2);

  // Lay out 2x2 grid to the right.
  const candidates = [];
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      candidates.push([startX + c * stepX, startY + r * stepY]);
    }
  }

  // Avoid overlap with any existing thought (cheap rectangular check).
  // If a candidate overlaps, shift it down by stepY until it doesn't.
  const overlaps = (x, y) => {
    for (const t of thoughts) {
      const ox = t.pos_x;
      const oy = t.pos_y;
      const xOverlap = x < ox + BLOCK_WIDTH && x + BLOCK_WIDTH > ox;
      const yOverlap = y < oy + BLOCK_MIN_HEIGHT && y + BLOCK_MIN_HEIGHT > oy;
      if (xOverlap && yOverlap) return true;
    }
    return false;
  };
  return candidates.map(([x, y]) => {
    let cy = y;
    let safety = 20;
    while (overlaps(x, cy) && safety > 0) {
      cy += stepY;
      safety -= 1;
    }
    return [x, cy];
  });
}

function makeTempId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `temp-${crypto.randomUUID()}`;
  }
  return `temp-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export default function CanvasPage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const params = useParams();
  const coursePuzzleId = params?.course_puzzle_id;

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [coursePuzzle, setCoursePuzzle] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedSubElement, setSelectedSubElement] = useState(null);
  const [toast, setToast] = useState(null);

  // Stage state (1 = think, 2 = extend, 3 = synthesize). Currently
  // client-only — the backend doesn't persist stage yet (Phase 5+).
  // Once you advance you can't go back: that's the intended UX.
  const [stage, setStage] = useState(1);
  const [confirmAdvance, setConfirmAdvance] = useState(false);
  // Stage 2 seeds AI "nudge" thoughts onto the canvas. We track an
  // in-flight flag so the user can't double-trigger generation while the
  // model is thinking. The endpoint itself is idempotent at the puzzle
  // level — re-calling returns the existing nudges — so this flag is
  // mostly UX (prevents spinners flickering on re-renders).
  const [seedingNudges, setSeedingNudges] = useState(false);

  // Collapsible side panels. Hidden state is local UI only — no need to
  // persist between sessions yet.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);

  // Count thoughts per primary element for the sidebar badges.
  const thoughtsByElement = useMemo(() => {
    const m = {};
    for (const t of thoughts) {
      if (t.element) m[t.element] = (m[t.element] || 0) + 1;
    }
    return m;
  }, [thoughts]);

  // Auth gate
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.push(`/login?redirect=/canvas/${coursePuzzleId}`);
    }
  }, [isLoaded, isSignedIn, router, coursePuzzleId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const notifyError = useCallback((msg) => {
    setToast(msg || "Couldn't save — try again.");
  }, []);

  // Initial load
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !coursePuzzleId) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const state = await getCanvasState(coursePuzzleId, getToken);
        if (cancelled) return;
        setCoursePuzzle(state.course_puzzle);
        setThoughts(state.thoughts || []);
        setConnections(state.connections || []);
        // Restore persisted stage so leaving the canvas and returning
        // resumes where the user left off (instead of dropping back to
        // Stage 1 every refresh).
        const persistedStage = Number(state.course_puzzle?.current_stage) || 1;
        setStage(Math.min(3, Math.max(1, persistedStage)));
      } catch (e) {
        if (!cancelled) setError(e?.message || "Failed to load canvas");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, coursePuzzleId, getToken]);

  // ---------- Optimistic handlers ----------

  const handleCreateThought = useCallback(
    async (body) => {
      const tempId = makeTempId();
      const tempThought = {
        id: tempId,
        course_puzzle_id: coursePuzzleId,
        element: body.element ?? null,
        sub_element: body.sub_element ?? null,
        content: body.content,
        flow_order: 0,
        time_spent_seconds: body.time_spent_seconds ?? null,
        pos_x: body.pos_x,
        pos_y: body.pos_y,
        created_at: new Date().toISOString(),
      };
      setThoughts((prev) => [...prev, tempThought]);
      try {
        const real = await createThought(coursePuzzleId, body, getToken);
        setThoughts((prev) => prev.map((t) => (t.id === tempId ? real : t)));
        return real;
      } catch (e) {
        setThoughts((prev) => prev.filter((t) => t.id !== tempId));
        notifyError(e?.message);
        throw e;
      }
    },
    [coursePuzzleId, getToken, notifyError],
  );

  const handleUpdateThoughtPosition = useCallback(
    async (thoughtId, pos_x, pos_y) => {
      // Temp ids can't be PATCH'd. If the user drags before the server responds,
      // skip the network call; the in-flight create will land with the latest
      // pos_x/pos_y the canvas eventually sends on next drag end.
      if (String(thoughtId).startsWith("temp-")) return;

      let previous = null;
      setThoughts((prev) =>
        prev.map((t) => {
          if (t.id === thoughtId) {
            previous = t;
            return { ...t, pos_x, pos_y };
          }
          return t;
        }),
      );
      try {
        await updateThoughtPosition(thoughtId, pos_x, pos_y, getToken);
      } catch (e) {
        if (previous) {
          setThoughts((prev) =>
            prev.map((t) => (t.id === thoughtId ? previous : t)),
          );
        }
        notifyError(e?.message);
        throw e;
      }
    },
    [getToken, notifyError],
  );

  const handleUpdateThoughtContent = useCallback(
    async (thoughtId, content) => {
      if (String(thoughtId).startsWith("temp-")) return;
      let previous = null;
      setThoughts((prev) =>
        prev.map((t) => {
          if (t.id === thoughtId) {
            previous = t;
            return { ...t, content };
          }
          return t;
        }),
      );
      try {
        await updateThoughtContent(thoughtId, content, getToken);
      } catch (e) {
        if (previous) {
          setThoughts((prev) =>
            prev.map((t) => (t.id === thoughtId ? previous : t)),
          );
        }
        notifyError(e?.message);
        throw e;
      }
    },
    [getToken, notifyError],
  );

  const handleUpdateThoughtTagging = useCallback(
    async (thoughtId, element, sub_element) => {
      if (String(thoughtId).startsWith("temp-")) return;
      let previous = null;
      setThoughts((prev) =>
        prev.map((t) => {
          if (t.id === thoughtId) {
            previous = t;
            return { ...t, element, sub_element };
          }
          return t;
        }),
      );
      try {
        await updateThoughtTagging(thoughtId, element, sub_element, getToken);
      } catch (e) {
        if (previous) {
          setThoughts((prev) =>
            prev.map((t) => (t.id === thoughtId ? previous : t)),
          );
        }
        notifyError(e?.message);
        throw e;
      }
    },
    [getToken, notifyError],
  );

  const handleDeleteThought = useCallback(
    async (thoughtId) => {
      // Snapshot for rollback, then optimistically remove thought + its edges.
      let removedThought = null;
      let removedConns = [];
      setThoughts((prev) => {
        removedThought = prev.find((t) => t.id === thoughtId) || null;
        return prev.filter((t) => t.id !== thoughtId);
      });
      setConnections((prev) => {
        removedConns = prev.filter(
          (c) =>
            c.from_thought_id === thoughtId || c.to_thought_id === thoughtId,
        );
        return prev.filter(
          (c) =>
            c.from_thought_id !== thoughtId && c.to_thought_id !== thoughtId,
        );
      });

      // Temp ids never hit the server. Just drop them locally.
      if (String(thoughtId).startsWith("temp-")) return;

      try {
        await apiDeleteThought(thoughtId, getToken);
      } catch (e) {
        if (removedThought) {
          setThoughts((prev) => [...prev, removedThought]);
        }
        if (removedConns.length) {
          setConnections((prev) => [...prev, ...removedConns]);
        }
        notifyError(e?.message);
        throw e;
      }
    },
    [getToken, notifyError],
  );

  const handleCreateConnection = useCallback(
    async (from_thought_id, to_thought_id) => {
      // If either endpoint is still a temp id, we can't safely persist yet.
      // The connector-dot gesture from the canvas is gated on real ids anyway;
      // this is defense-in-depth for edge cases.
      if (
        String(from_thought_id).startsWith("temp-") ||
        String(to_thought_id).startsWith("temp-")
      ) {
        notifyError("Thought hasn't finished saving — try again in a moment.");
        throw new Error("Cannot connect before thought is saved");
      }

      const tempId = makeTempId();
      const tempConn = {
        id: tempId,
        course_puzzle_id: coursePuzzleId,
        from_thought_id,
        to_thought_id,
        created_at: new Date().toISOString(),
      };
      setConnections((prev) => [...prev, tempConn]);
      try {
        const real = await apiCreateConnection(
          coursePuzzleId,
          from_thought_id,
          to_thought_id,
          getToken,
        );
        setConnections((prev) =>
          prev.map((c) => (c.id === tempId ? real : c)),
        );
        return real;
      } catch (e) {
        setConnections((prev) => prev.filter((c) => c.id !== tempId));
        notifyError(e?.message);
        throw e;
      }
    },
    [coursePuzzleId, getToken, notifyError],
  );

  const handleDeleteConnection = useCallback(
    async (connectionId) => {
      let removed = null;
      setConnections((prev) => {
        removed = prev.find((c) => c.id === connectionId) || null;
        return prev.filter((c) => c.id !== connectionId);
      });
      if (String(connectionId).startsWith("temp-")) return;
      try {
        await apiDeleteConnection(connectionId, getToken);
      } catch (e) {
        if (removed) setConnections((prev) => [...prev, removed]);
        notifyError(e?.message);
        throw e;
      }
    },
    [getToken, notifyError],
  );

  function clearSelection() {
    setSelectedElement(null);
    setSelectedSubElement(null);
  }

  async function advanceStage() {
    if (stage >= 3) return;
    // Once you advance, you can't go back. The big confirm dialog drives
    // this point home; user explicitly asked for the commitment to be
    // visible.
    const nextStage = stage + 1;
    setStage(nextStage);
    setConfirmAdvance(false);

    // Persist stage to the server so leaving the canvas and coming back
    // restores the same stage. Fire-and-forget — UI already reflects the
    // new stage; we just don't want to drop back on next load.
    updateCurrentStage(coursePuzzleId, nextStage, getToken).catch((e) => {
      // Surface but don't roll back — the user clearly intended to advance.
      // Worst case: refresh shows the old stage and they advance again.
      notifyError(
        e?.message || "Stage saved locally, but couldn't sync to server.",
      );
    });

    // Stage 1 → 2 seeds AI nudge blocks on the canvas. Only nudges if
    // none already exist (the backend is idempotent on this anyway, but
    // we still gate locally to avoid an unnecessary network call). We
    // pass the user's current thought contents so the model can extend
    // their flow rather than start from scratch, and explicit positions
    // so nudges land NEXT TO the existing flow rather than far off-screen.
    if (nextStage === 2 && !seedingNudges) {
      const alreadyHasNudges = thoughts.some((t) => t.is_nudge);
      if (alreadyHasNudges) return;

      setSeedingNudges(true);
      const userOnly = thoughts.filter((t) => !t.is_nudge);
      const userThoughts = userOnly.map((t) => t.content).filter(Boolean);
      const positions = computeNudgePositions(userOnly);
      try {
        const { nudges } = await generateStage2Nudges(
          coursePuzzleId,
          userThoughts,
          positions,
          getToken,
        );
        if (nudges?.length) {
          // Merge in: skip any duplicates (defense against double-clicks).
          setThoughts((prev) => {
            const have = new Set(prev.map((t) => t.id));
            const fresh = nudges.filter((n) => !have.has(n.id));
            return [...prev, ...fresh];
          });
        }
      } catch (e) {
        notifyError(
          e?.message || "Couldn't drop AI nudges on your canvas — try again later.",
        );
      } finally {
        setSeedingNudges(false);
      }
    }
  }

  // ---------- Render ----------

  if (!isLoaded || !isSignedIn || loading) {
    return <CanvasSkeleton />;
  }
  if (error) {
    return (
      <div className="p-8">
        <div className="text-red-600 text-sm mb-4">Error: {error}</div>
        <button
          onClick={() => router.push("/courses")}
          className="text-sm underline text-gray-700"
        >
          Back to Your Courses
        </button>
      </div>
    );
  }
  if (!coursePuzzle) {
    return <div className="p-8 text-sm text-gray-500">Puzzle not found.</div>;
  }

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ─── Left: Elements sidebar (collapsible) ──────────────────────── */}
      {sidebarOpen ? (
        <aside className="w-64 shrink-0 border-r border-mist flex flex-col bg-white">
          {/* Prominent back button — separated from the elements list with
              its own bordered section. The user's previous version was a
              tiny gray link squashed into the elements panel; this is hard
              to miss. */}
          <div className="px-3 py-3 border-b border-mist flex items-center gap-2">
            <button
              onClick={() => router.push("/courses")}
              className="flex-1 flex items-center gap-2 text-sm text-ash hover:text-black hover:bg-mist/60 rounded-md px-2.5 py-2 transition-colors"
              title="Back to your courses"
            >
              <span aria-hidden>←</span>
              <span className="font-medium">Back to courses</span>
            </button>
            <button
              onClick={() => setSidebarOpen(false)}
              className="text-smoke hover:text-black p-2 rounded-md hover:bg-mist/60 transition-colors"
              title="Hide elements panel"
              aria-label="Hide elements panel"
            >
              «
            </button>
          </div>

          <div className="flex-1 min-h-0">
            <ElementsSidebar
              selectedElement={selectedElement}
              selectedSubElement={selectedSubElement}
              onSelect={(el, sub) => {
                setSelectedElement(el);
                setSelectedSubElement(sub);
              }}
              onClear={clearSelection}
              thoughtsByElement={thoughtsByElement}
            />
          </div>
        </aside>
      ) : (
        <button
          onClick={() => setSidebarOpen(true)}
          className="w-9 shrink-0 border-r border-mist flex items-start justify-center pt-4 hover:bg-mist/40 transition-colors group"
          title="Show elements panel"
          aria-label="Show elements panel"
        >
          <span className="text-smoke group-hover:text-black text-sm">»</span>
        </button>
      )}

      {/* ─── Center: header + canvas ───────────────────────────────────── */}
      <div className="flex-1 min-w-0 flex flex-col">
        <header className="border-b border-mist px-4 py-3 flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="text-[11px] uppercase tracking-[0.2em] text-change mb-1 font-mono">
              Puzzle {coursePuzzle.position}
            </div>
            <h1 className="text-lg font-serif text-black break-words leading-tight">
              {coursePuzzle.title}
            </h1>
            <p className="text-sm text-smoke italic mt-1 whitespace-pre-wrap break-words">
              {coursePuzzle.puzzle_text}
            </p>
          </div>

          {/* Stage indicator + Next Stage button */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <StageIndicator current={stage} />
            {stage < 3 ? (
              <button
                onClick={() => setConfirmAdvance(true)}
                className="text-sm font-medium px-3 py-1.5 bg-primary text-white rounded-md hover:bg-primary/90 transition-colors"
                title="Advance to the next stage (no going back)"
              >
                Next Stage →
              </button>
            ) : (
              <span className="text-[11px] font-mono text-smoke">
                Final stage
              </span>
            )}
          </div>
        </header>

        {/* No more "coming in Phase X" banners. Stage 2 is real (canned
            per-element flow + scripted deflection). Stage 3 still has a
            placeholder welcome inside the chat itself; no banner needed. */}

        <div className="flex-1 relative overflow-hidden">
          {/* Nudge-seeding banner. Shown while the Stage 2 nudge endpoint
              is in flight so the user has clear feedback that something
              is happening on the canvas (the network round-trip + LLM
              call can take several seconds). Sits above the canvas as a
              non-blocking overlay so the user can still pan/zoom while
              waiting. Disappears the instant nudges are appended. */}
          {seedingNudges && (
            <div className="absolute top-3 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
              <div className="flex items-center gap-2 px-3.5 py-2 rounded-full bg-white/95 border border-change/30 shadow-md backdrop-blur">
                <span className="relative flex h-2.5 w-2.5">
                  <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                  <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-change" />
                </span>
                <span className="text-xs font-medium text-change">
                  Dropping AI nudges on your canvas…
                </span>
              </div>
            </div>
          )}
          <Canvas
            coursePuzzleId={coursePuzzleId}
            thoughts={thoughts}
            connections={connections}
            selectedElement={selectedElement}
            selectedSubElement={selectedSubElement}
            onCreateThought={handleCreateThought}
            onUpdateThoughtPosition={handleUpdateThoughtPosition}
            onUpdateThoughtContent={handleUpdateThoughtContent}
            onUpdateThoughtTagging={handleUpdateThoughtTagging}
            onDeleteThought={handleDeleteThought}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
          />
        </div>
      </div>

      {/* ─── Right: Stage chat panel (collapsible) ─────────────────────── */}
      {chatOpen ? (
        <aside className="w-80 shrink-0">
          <StageChat
            stage={stage}
            primaryElement={coursePuzzle.primary_element}
            coursePuzzleId={coursePuzzleId}
            onClose={() => setChatOpen(false)}
          />
        </aside>
      ) : (
        <button
          onClick={() => setChatOpen(true)}
          className="w-9 shrink-0 border-l border-mist flex items-start justify-center pt-4 hover:bg-mist/40 transition-colors group"
          title="Show guide chat"
          aria-label="Show guide chat"
        >
          <span className="text-smoke group-hover:text-change text-sm">«</span>
        </button>
      )}

      {/* ─── Confirm-advance modal ─────────────────────────────────────── */}
      {confirmAdvance && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <h2 className="font-display text-2xl text-black mb-2">
              Advance to Stage {stage + 1}?
            </h2>
            <p className="text-sm text-smoke mb-2">
              Once you move on, you can&apos;t come back to Stage {stage}.
              Make sure you&apos;ve put real thinking work in here first.
            </p>
            {stage === 1 && (
              <p className="text-sm text-change mb-6">
                When you advance, the guide will drop a few <strong>nudge
                blocks</strong> onto your canvas to extend your flow. You
                can move, edit, or delete them like your own thoughts.
              </p>
            )}
            {stage !== 1 && <div className="mb-6" />}
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAdvance(false)}
                disabled={seedingNudges}
                className="px-4 py-2 text-sm text-smoke hover:text-black disabled:opacity-40"
              >
                Stay on Stage {stage}
              </button>
              <button
                onClick={advanceStage}
                disabled={seedingNudges}
                className="px-4 py-2 text-sm bg-primary text-white rounded-md hover:bg-primary/90 font-medium disabled:opacity-60"
              >
                {seedingNudges
                  ? "Dropping nudges…"
                  : `Advance to Stage ${stage + 1}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-600 text-white text-xs px-4 py-2 rounded shadow-lg max-w-sm">
          {toast}
        </div>
      )}
    </div>
  );
}

function StageIndicator({ current }) {
  // Stage names rephrased per user feedback:
  //   2 (Redirect) — AI nudges the user back onto a productive path.
  //   3 (Quintessence) — connect this puzzle back to the larger goal that
  //     prompted the course.
  const stages = [
    { n: 1, label: "Think" },
    { n: 2, label: "Redirect" },
    { n: 3, label: "Quintessence" },
  ];
  return (
    <div className="hidden tb:flex items-center gap-1 text-[11px] font-mono">
      {stages.map((s, i) => {
        const isCurrent = s.n === current;
        const isDone = s.n < current;
        return (
          <div key={s.n} className="flex items-center gap-1">
            <span
              className={`inline-flex items-center gap-1 px-2 py-1 rounded ${
                isCurrent
                  ? "bg-change text-white"
                  : isDone
                    ? "bg-change/15 text-change"
                    : "bg-mist text-smoke"
              }`}
            >
              <span className="font-bold">{s.n}</span>
              <span className="uppercase tracking-wider">{s.label}</span>
            </span>
            {i < stages.length - 1 && (
              <span className="text-smoke">›</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
