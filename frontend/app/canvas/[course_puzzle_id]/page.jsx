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
} from "@/lib/canvas-api";

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

  function advanceStage() {
    if (stage >= 3) return;
    // Once you advance, you can't go back. The big confirm dialog drives
    // this point home; user explicitly asked for the commitment to be
    // visible.
    setStage((s) => s + 1);
    setConfirmAdvance(false);
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
              Puzzle {coursePuzzle.position} · {coursePuzzle.primary_element}
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
                className="text-sm font-medium px-3 py-1.5 bg-change text-white rounded-md hover:bg-change/90 transition-colors"
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

        {/* Stage 2/3 placeholders are rendered as a banner above the canvas
            since their backends don't exist yet. The canvas itself remains
            interactive in all stages — the user can keep editing thoughts. */}
        {stage > 1 && (
          <div className="border-b border-mist bg-change/[0.04] px-4 py-3 text-sm text-ash">
            <strong className="text-change">Stage {stage}</strong> isn&apos;t
            wired to the AI backend yet. The canvas stays editable and the
            chat panel on the right has a placeholder describing what this
            stage will do once Phase 5 ships.
          </div>
        )}

        <div className="flex-1 relative overflow-hidden">
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
          <StageChat stage={stage} onClose={() => setChatOpen(false)} />
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
            <p className="text-sm text-smoke mb-6">
              Once you move on, you can&apos;t come back to Stage {stage}.
              Make sure you&apos;ve put real thinking work in here first.
            </p>
            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setConfirmAdvance(false)}
                className="px-4 py-2 text-sm text-smoke hover:text-black"
              >
                Stay on Stage {stage}
              </button>
              <button
                onClick={advanceStage}
                className="px-4 py-2 text-sm bg-change text-white rounded-md hover:bg-change/90 font-medium"
              >
                Advance to Stage {stage + 1}
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
  const stages = [
    { n: 1, label: "Think" },
    { n: 2, label: "Extend" },
    { n: 3, label: "Synthesize" },
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
