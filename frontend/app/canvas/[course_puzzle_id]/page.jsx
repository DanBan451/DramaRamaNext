"use client";

// Phase 4b canvas page. One route per course_puzzle.
// Owns network state + optimistic updates + rollback; delegates UI to
// the shared Canvas component. Errors from the backend pop a tiny
// bottom-right toast that auto-dismisses after ~4 seconds.

import { useState, useEffect, useCallback, useMemo } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import Canvas from "@/components/canvas/Canvas";
import ElementsSidebar from "@/components/canvas/ElementsSidebar";
import StageChat from "@/components/canvas/StageChat";
import ReflectionForgePanel from "@/components/canvas/ReflectionForgePanel";
import CanvasSkeleton from "@/components/canvas/CanvasSkeleton";
// Note: `ELEMENTS` is no longer imported here — the new ElementsSidebar
// component owns its own data import. Don't add it back without a reason.
import { getElement } from "@/lib/elements";
import {
  getCanvasState,
  createThought,
  createReflection,
  updateThoughtPosition,
  updateThoughtContent,
  updateThoughtTagging,
  deleteThought as apiDeleteThought,
  createConnection as apiCreateConnection,
  deleteConnection as apiDeleteConnection,
  generateStage2Nudges,
  updateCurrentStage,
} from "@/lib/canvas-api";

// Stage 2 nudge positions are computed server-side now (fan-shape engine).
// The previous client-side 2x2 grid was removed when the diagnostic engine
// took over.

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
  const [completionOverlay, setCompletionOverlay] = useState(null);

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
  
  // Stage 2 chat welcome message from the diagnostic nudge engine.
  // This replaces the per-element template system.
  const [stage2WelcomeMessage, setStage2WelcomeMessage] = useState(null);
  // When Stage 2 nudges are seeded, focus the canvas on them so the user
  // doesn't have to hunt for where they landed.
  const [focusThoughtIds, setFocusThoughtIds] = useState(null);

  // Stage 3 sub-phase tracking. Set from server on load, updated locally
  // on advance. Null means not in Stage 3 yet.
  const [stage3Phase, setStage3Phase] = useState(null);

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

  // Auth gate — brief delay so Clerk can finish hydrating a returning session
  // without flashing the login layout.
  useEffect(() => {
    if (!isLoaded || isSignedIn) return;
    const t = setTimeout(() => {
      router.push(`/login?redirect=/canvas/${coursePuzzleId}`);
    }, 1200);
    return () => clearTimeout(t);
  }, [isLoaded, isSignedIn, router, coursePuzzleId]);

  // Auto-dismiss toast
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), 4000);
    return () => clearTimeout(id);
  }, [toast]);

  const notifyError = useCallback((msg) => {
    setToast({ message: msg || "Couldn't save — try again.", type: "error" });
  }, []);

  const canvasElementsSummary = useMemo(() => {
    const names = new Set();
    for (const t of thoughts) {
      if (t.is_nudge || !t.element) continue;
      const el = getElement(t.element);
      if (el) names.add(el.name);
    }
    return Array.from(names).join(", ");
  }, [thoughts]);

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
        // Restore Stage 3 sub-phase from server
        if (persistedStage === 3 && state.course_puzzle?.stage3_phase) {
          setStage3Phase(state.course_puzzle.stage3_phase);
        } else if (persistedStage === 3) {
          setStage3Phase("reflect");
        }
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

  // Reloading mid–Stage 2: nudges exist but the opening guide line lived only
  // in memory. Restore a welcome-back line without calling the nudge endpoint.
  useEffect(() => {
    if (loading || !coursePuzzleId) return;
    if (stage !== 2) return;
    const hasNudges = thoughts.some((t) => t.is_nudge);
    if (!hasNudges || stage2WelcomeMessage) return;
    setStage2WelcomeMessage(
      "Welcome back — your **Push Further** nudge blocks are still on the canvas. Continue where you left off: pick a nudge, answer it on a fresh block, or edit what no longer fits. When you're ready, use **Next Stage** above.",
    );
  }, [loading, coursePuzzleId, stage, thoughts, stage2WelcomeMessage]);

  // ---------- Optimistic handlers ----------

  const handleCreateThought = useCallback(
    async (body) => {
      const tempId = makeTempId();
      const isReflection = stage === 3;
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
        kind: isReflection ? "reflection" : "thought",
        created_at: new Date().toISOString(),
      };
      setThoughts((prev) => [...prev, tempThought]);
      try {
        // Stage 3 thoughts are reflections — different endpoint, kind='reflection'
        const real = isReflection
          ? await createReflection(coursePuzzleId, body, getToken)
          : await createThought(coursePuzzleId, body, getToken);
        setThoughts((prev) => prev.map((t) => (t.id === tempId ? real : t)));
        return real;
      } catch (e) {
        setThoughts((prev) => prev.filter((t) => t.id !== tempId));
        notifyError(e?.message);
        throw e;
      }
    },
    [coursePuzzleId, getToken, notifyError, stage],
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

    // Stage 2 → 3: initialize the reflect sub-phase
    if (nextStage === 3) {
      setStage3Phase("reflect");
    }

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

    // Stage 1 → 2 seeds an AI intervention on the canvas via the fan-shape
    // diagnostic engine. The server picks the move (simplify, push_extreme,
    // socrates, etc.), shape (fan or single), the branch source, and node
    // positions — we just ferry the result into local state. Idempotent on
    // the backend; we still gate locally to avoid a redundant request.
    if (nextStage === 2 && !seedingNudges) {
      const alreadyHasNudges = thoughts.some((t) => t.is_nudge);
      if (alreadyHasNudges) return;

      setSeedingNudges(true);
      // Make the chat explicit about what's happening BEFORE any nodes exist.
      // (Stage 2 welcome fallback must never claim nodes were dropped early.)
      setStage2WelcomeMessage(
        "Generating **Push Further** nudge blocks now — I'll populate them onto your canvas in a moment.",
      );
      try {
        const response = await generateStage2Nudges(coursePuzzleId, getToken);
        const { nudges, connections: newConnections, chat_message } = response;
        const newNudgeIds = Array.isArray(nudges) ? nudges.map((n) => n.id) : [];

        if (nudges?.length) {
          // Defense against double-clicks: skip ids we already have locally.
          setThoughts((prev) => {
            const have = new Set(prev.map((t) => t.id));
            const fresh = nudges.filter((n) => !have.has(n.id));
            return [...prev, ...fresh];
          });
        }

        // Merge connections (source->anchor and anchor->child edges from
        // the fan-shape engine, or source->single from single-node moves).
        if (newConnections?.length) {
          setConnections((prev) => {
            const have = new Set(prev.map((c) => c.id));
            const fresh = newConnections.filter((c) => !have.has(c.id));
            return [...prev, ...fresh];
          });
        }

        // Store the server-generated opening chat message. StageChat reads
        // this as the first assistant turn instead of a per-element template.
        if (chat_message) {
          setStage2WelcomeMessage(chat_message);
        } else if (nudges?.length) {
          setStage2WelcomeMessage(
            "Done — I just populated a few **Push Further** nudge blocks onto your canvas (dashed purple borders).",
          );
        } else {
          // Defensive: avoid leaving a misleading "generating" message hanging
          // forever if the server returned no nudges and no chat text.
          setStage2WelcomeMessage(
            "You're in **Stage 2 — Push Further**. If you don't see any nudges yet, try **Continue to Stage 3** again in a moment.",
          );
        }

        // Focus the canvas on the newly-created nudges so they're easy to find.
        if (newNudgeIds.length) {
          setFocusThoughtIds(newNudgeIds);
        }
      } catch (e) {
        notifyError(
          e?.message || "Couldn't drop AI nudges on your canvas — try again later.",
        );
        setStage2WelcomeMessage(
          "I couldn't populate the AI nudge blocks just now. Please try again in a moment.",
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
          onClick={() => router.push("/goals")}
          className="text-sm underline text-gray-700"
        >
          Back to your goals
        </button>
      </div>
    );
  }
  if (!coursePuzzle) {
    return <div className="p-8 text-sm text-gray-500">Puzzle not found.</div>;
  }

  const isCompleted = coursePuzzle.status === "completed";
  const forgeStage3ReadOnly = stage === 3 && !isCompleted;

  return (
    <div className="flex h-screen bg-white overflow-hidden">
      {/* ─── Left: Elements sidebar (collapsible) ──────────────────────── */}
      {sidebarOpen ? (
        <aside className="w-[300px] shrink-0 border-r border-mist flex flex-col bg-white">
          {/* Prominent back button — separated from the elements list with
              its own bordered section. The user's previous version was a
              tiny gray link squashed into the elements panel; this is hard
              to miss. */}
          <div className="px-3 py-3 border-b border-mist flex items-center gap-2">
            <button
              onClick={() => router.push("/goals")}
              className="flex-1 flex items-center gap-2 text-sm text-ash hover:text-black hover:bg-mist/60 rounded-md px-2.5 py-2 transition-colors"
              title="Back to your goals"
            >
              <span aria-hidden>←</span>
              <span className="font-medium">Back to goals</span>
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
              onCollapse={() => setSidebarOpen(false)}
              onSelect={(el, sub) => {
                if (selectedSubElement === sub) {
                  setSelectedElement(null);
                  setSelectedSubElement(null);
                } else {
                  setSelectedElement(el);
                  setSelectedSubElement(sub);
                }
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
            {isCompleted ? (
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                Completed ✓
              </span>
            ) : stage < 3 ? (
              <button
                onClick={() => setConfirmAdvance(true)}
                className="text-sm font-medium px-3 py-1.5 bg-change text-white rounded-md hover:bg-change/90 transition-colors"
                title="Advance to the next stage (no going back)"
              >
                {stage === 1 ? "Continue to Stage 2 →" : "Continue to Stage 3 →"}
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
          {/* Completed summary banner. Shows the AI-generated synthesis
              so the user can review their puzzle's conclusion. */}
          {isCompleted && coursePuzzle.synthesis && (
            <div className="absolute top-0 left-0 right-0 z-20 bg-emerald-50/95 border-b border-emerald-200 px-6 py-4 backdrop-blur-sm">
              <div className="max-w-2xl flex flex-col gap-3">
                <div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-700 mb-2">
                    Puzzle complete — our closing note
                  </p>
                  <p className="text-sm text-emerald-900 leading-relaxed whitespace-pre-wrap">
                    {coursePuzzle.synthesis}
                  </p>
                </div>
                {coursePuzzle.course_id && (
                  <Link
                    href={`/goals/${coursePuzzle.course_id}/ready`}
                    className="text-sm font-medium text-emerald-800 underline underline-offset-2 hover:text-emerald-950 w-fit"
                  >
                    Back to goal →
                  </Link>
                )}
              </div>
            </div>
          )}

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
            focusThoughtIds={focusThoughtIds}
            onCreateThought={forgeStage3ReadOnly || isCompleted ? null : handleCreateThought}
            onUpdateThoughtPosition={forgeStage3ReadOnly || isCompleted ? null : handleUpdateThoughtPosition}
            onUpdateThoughtContent={forgeStage3ReadOnly || isCompleted ? null : handleUpdateThoughtContent}
            onUpdateThoughtTagging={forgeStage3ReadOnly || isCompleted ? null : handleUpdateThoughtTagging}
            onDeleteThought={forgeStage3ReadOnly || isCompleted ? null : handleDeleteThought}
            onCreateConnection={forgeStage3ReadOnly || isCompleted ? null : handleCreateConnection}
            onDeleteConnection={forgeStage3ReadOnly || isCompleted ? null : handleDeleteConnection}
            onClearElement={clearSelection}
            viewOnly={forgeStage3ReadOnly}
          />

          {stage === 3 && !isCompleted && (
            <ReflectionForgePanel
              layout="bottom"
              coursePuzzleId={coursePuzzleId}
              initialAnswers={coursePuzzle.reflection_answers}
              canvasElementsSummary={canvasElementsSummary}
              getToken={getToken}
              onSavedAnswers={async () => {
                try {
                  const state = await getCanvasState(coursePuzzleId, getToken);
                  setCoursePuzzle(state.course_puzzle);
                } catch (e) {
                  notifyError(e?.message);
                }
              }}
              onForged={async (name) => {
                try {
                  const state = await getCanvasState(coursePuzzleId, getToken);
                  const cp = state.course_puzzle;
                  setCoursePuzzle(cp);
                  setCompletionOverlay({
                    name,
                    synthesis: cp?.synthesis || null,
                    courseId: cp?.course_id || coursePuzzle?.course_id,
                  });
                } catch (e) {
                  notifyError(e?.message);
                  const cid = coursePuzzle?.course_id;
                  if (cid) router.push(`/goals/${cid}/ready`);
                  else router.push("/goals");
                }
              }}
            />
          )}
        </div>
      </div>

      {/* ─── Right: Stage chat panel (collapsible) ─────────────────────── */}
      {chatOpen && !(stage === 3 && !isCompleted) ? (
        <aside className="w-80 shrink-0">
          <StageChat
            stage={stage}
            coursePuzzleId={coursePuzzleId}
            onClose={() => setChatOpen(false)}
            stage2WelcomeMessage={stage2WelcomeMessage}
            stage3Phase={stage3Phase}
            isCompleted={isCompleted}
            synthesis={coursePuzzle.synthesis}
          />
        </aside>
      ) : !(stage === 3 && !isCompleted) ? (
        <button
          onClick={() => setChatOpen(true)}
          className="w-9 shrink-0 border-l border-mist flex items-start justify-center pt-4 hover:bg-mist/40 transition-colors group"
          title="Show guide chat"
          aria-label="Show guide chat"
        >
          <span className="text-smoke group-hover:text-change text-sm">«</span>
        </button>
      ) : null}

      {completionOverlay && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-xl w-full max-h-[85vh] overflow-y-auto p-6">
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-emerald-700 mb-2">
              Puzzle complete — our closing note
            </p>
            <h2 className="font-display text-2xl text-black mb-3">
              Fire Starter forged: {completionOverlay.name}
            </h2>
            {completionOverlay.synthesis ? (
              <p className="text-sm text-black leading-relaxed whitespace-pre-wrap mb-6">
                {completionOverlay.synthesis}
              </p>
            ) : (
              <p className="text-sm text-smoke mb-6">
                Your insight is saved. You can revisit this puzzle anytime from your goal workspace.
              </p>
            )}
            <button
              type="button"
              onClick={() => {
                const cid = completionOverlay.courseId;
                setCompletionOverlay(null);
                if (cid) router.push(`/goals/${cid}/ready`);
                else router.push("/goals");
              }}
              className="w-full py-2.5 rounded-md bg-change text-white text-sm font-semibold hover:bg-change/90"
            >
              Back to goal →
            </button>
          </div>
        </div>
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
                className="px-4 py-2 text-sm bg-change text-white rounded-md hover:bg-change/90 font-medium disabled:opacity-60"
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
        <div
          className={`fixed bottom-4 right-4 z-50 text-white text-xs px-4 py-2 rounded shadow-lg max-w-sm ${
            toast.type === "success" ? "bg-emerald-700" : "bg-red-600"
          }`}
        >
          {toast.message}
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
    { n: 1, label: "Think on Your Own" },
    { n: 2, label: "Push Further" },
    { n: 3, label: "Reflect" },
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
                  ? "bg-primary text-white"
                  : isDone
                    ? "bg-primary/15 text-primary"
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
