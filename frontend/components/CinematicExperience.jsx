"use client";

/**
 * CinematicExperience
 * -------------------
 * The single-screen replacement for the old 3-pane workspace. Orchestrates:
 *   - WhosWhoCinematic   (full-screen intro + ambient stage)
 *   - ThinkingPanel      (frosted notes surface at bottom)
 *   - NudgeWhisper       (margin-whisper AI nudges at top-right)
 *   - UnderstandingOverlay (swipe-in doc overlay)
 *   - Element-driven atmospheric tint (fire/water/earth/air/change)
 *   - Finish session flow (reuses /session/complete)
 *
 * Data contract (props):
 *   - puzzle:            { id, title, text, ... } or null (resume)
 *   - problemDescription (string passed at session start)
 *   - sessionId          (string)
 *   - firstMessage       (string | null) — the opening nudge from the AI,
 *                        shown as the *first whisper* once the intro settles.
 *   - onComplete         callback: session finished → return to picker
 */

import React, { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import { motion, AnimatePresence } from "framer-motion";
import WhosWhoCinematic from "@/components/WhosWhoCinematic";
import ThinkingPanel from "@/components/ThinkingPanel";
import NudgeWhisper from "@/components/NudgeWhisper";
import UnderstandingOverlay from "@/components/UnderstandingOverlay";
import { PUZZLES } from "@/lib/puzzles";

// Element → tint overlay descriptor. All within the DramaRama palette
// (no yellow/cream/orange — ever).
const ELEMENT_TINTS = {
  earth:  { background: "rgba(74, 91, 110, 0.10)", blend: "multiply" },   // sepia-grey
  fire:   { background: "rgba(139, 0, 0, 0.14)",   blend: "multiply" },   // warmer red
  water:  { background: "rgba(74, 91, 110, 0.22)", blend: "multiply" },   // steel-blue
  air:    { background: "rgba(255, 255, 255, 0.04)", blend: "screen" },   // +2% lift
  change: { background: "rgba(155, 93, 229, 0.12)", blend: "multiply" },  // purple
};

export default function CinematicExperience({
  puzzle,
  problemDescription,
  sessionId,
  firstMessage,
  onComplete,
}) {
  const { getToken } = useAuth();

  // Intro gate: only once the cinematic settles do the panel + hint buttons light up.
  const [introDone, setIntroDone] = useState(false);

  // Hint state — separate from thought submissions.
  const [hint, setHint] = useState({ text: "", element: "", subElement: "" });
  const [hintLoading, setHintLoading] = useState(false);

  // How many times the user has successfully deepened understanding.
  // Hints are only unlocked after at least one deepening.
  const [deepenCount, setDeepenCount] = useState(0);

  // Increments each time the understanding document updates — drives ThinkingPanel flicker.
  const [understandingVersion, setUnderstandingVersion] = useState(0);

  // Shows "no insights" popup when backend finds nothing concrete in user's text.
  const [noInsights, setNoInsights] = useState(false);

  const [sending, setSending] = useState(false);

  // Current element (drives the background tint).
  const [element, setElement] = useState("earth");

  // Understanding Document
  const [docOpen, setDocOpen] = useState(false);
  const [documentText, setDocumentText] = useState("");
  const [documentLoading, setDocumentLoading] = useState(true);

  // Completion
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completionData, setCompletionData] = useState(null);

  const activePuzzle =
    puzzle || PUZZLES.find((p) => problemDescription?.includes(p.title)) ||
    PUZZLES.find((p) => p.id === "whos-who");

  // ── Load existing session data (messages + doc) ────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken({ skipCache: true });
        const [msgsRes, duRes] = await Promise.all([
          fetch(`/api/backend-api/session/${sessionId}/element-messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/backend-api/session/${sessionId}/deep-understanding`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!cancelled && msgsRes.ok) {
          const data = await msgsRes.json();
          const allMsgs = [];
          Object.values(data.messages || {}).forEach((list) => {
            list.forEach((m) => {
              allMsgs.push({
                role: m.role,
                text: m.message_text,
                element: m.element_applied || "earth",
                createdAt: m.created_at,
              });
            });
          });
          allMsgs.sort(
            (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
          );

          // Latest assistant message → restore element tint
          const lastAssistant = [...allMsgs].reverse().find(
            (m) => m.role === "assistant"
          );
          if (lastAssistant) {
            setElement(lastAssistant.element || "earth");
          }
        }

        if (!cancelled && duRes.ok) {
          const data = await duRes.json();
          if (data.understanding_document)
            setDocumentText(data.understanding_document);
        }
      } catch (e) {
        console.error("Failed to load session data:", e);
      } finally {
        if (!cancelled) setDocumentLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [sessionId, getToken]);

  // ── Send a thought (user submission from the thinking panel) ───────────────
  async function sendThought(text) {
    setSending(true);

    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(
        `/api/backend-api/session/${sessionId}/chat`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_message: text }),
        }
      );
      if (!res.ok) throw new Error("Failed to send");

      const data = await res.json();
      setElement(data.element || "earth");
      if (data.understanding === "__no_insights__") {
        setNoInsights(true);
        setTimeout(() => setNoInsights(false), 4000);
      } else if (data.understanding) {
        setDocumentText(data.understanding);
        setUnderstandingVersion((v) => v + 1);
      }
      setDeepenCount((c) => c + 1);
    } catch (e) {
      console.error("Chat error:", e);
    } finally {
      setSending(false);
    }
  }

  // ── Request a hint from the AI (separate loading state from sendThought) ────
  async function requestHint() {
    if (hintLoading) return;
    setHintLoading(true);

    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(
        `/api/backend-api/session/${sessionId}/chat`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ user_message: "(Please give me a hint)" }),
        }
      );
      if (!res.ok) throw new Error("Failed to get hint");

      const data = await res.json();
      setHint({
        text: data.response || "",
        element: data.element || "",
        subElement: data.sub_element || "",
      });
      setElement(data.element || "earth");
      if (data.understanding) {
        setDocumentText(data.understanding);
        setUnderstandingVersion((v) => v + 1);
      }
    } catch (e) {
      console.error("Hint error:", e);
      setHint({ text: "Something slipped — try again.", element: "", subElement: "" });
    } finally {
      setHintLoading(false);
    }
  }

  // ── Finish session ─────────────────────────────────────────────────────────
  async function handleComplete() {
    setCompleteLoading(true);
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch("/api/backend-api/session/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      setCompletionData(await res.json());
    } catch (e) {
      console.error("Complete error:", e);
    } finally {
      setCompleteLoading(false);
    }
  }

  const tint = ELEMENT_TINTS[element] || ELEMENT_TINTS.earth;

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      {/* ── Cinematic intro + ambient stage ─────────────────────────────── */}
      <WhosWhoCinematic
        sessionId={sessionId}
        puzzleText={activePuzzle?.text || ""}
        onComplete={() => setIntroDone(true)}
      />

      {/* ── Element tint overlay (crossfade between elements) ───────────── */}
      <AnimatePresence>
        <motion.div
          key={`tint-${element}`}
          className="fixed inset-0 z-20 pointer-events-none"
          style={{
            backgroundColor: tint.background,
            mixBlendMode: tint.blend,
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: introDone ? 1 : 0 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 2, ease: "easeInOut" }}
        />
      </AnimatePresence>

      {/* ── Hint buttons (top-right) ─────────────────────────────────────── */}
      {introDone && (
        <NudgeWhisper
          hint={hint}
          hintLoading={hintLoading}
          onRequestHint={requestHint}
          canRequestHint={deepenCount > 0 && !sending}
          onComplete={handleComplete}
        />
      )}

      {/* ── Thinking panel (white surface, bottom) ─────────────────────── */}
      <ThinkingPanel
        visible={introDone && !completionData}
        disabled={!introDone}
        onSubmit={sendThought}
        onViewUnderstanding={() => setDocOpen(true)}
        isSending={sending}
        understandingVersion={understandingVersion}
      />

      {/* ── No-insights toast ───────────────────────────────────────────── */}
      <AnimatePresence>
        {noInsights && (
          <motion.div
            key="no-insights"
            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 bg-white shadow-2xl px-8 py-5 max-w-sm w-full text-center"
            initial={{ opacity: 0, scale: 0.93 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.93 }}
            transition={{ duration: 0.2 }}
          >
            <p className="font-mono text-[10px] tracking-[0.25em] uppercase text-smoke mb-2">No Key Insights Found</p>
            <p className="text-ash text-sm leading-relaxed">
              Keep writing — nothing concrete enough to capture yet. Try being more specific about what you notice.
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Understanding Document overlay ─────────────────────────────── */}
      <UnderstandingOverlay
        open={docOpen}
        onClose={() => setDocOpen(false)}
        documentText={documentText}
        loading={documentLoading}
      />

      {/* ── Completion modal ────────────────────────────────────────────── */}
      <AnimatePresence>
        {completionData && (
          <motion.div
            className="fixed inset-0 z-[60] bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 tb:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              className="bg-white max-w-lg w-full p-6 tb:p-10 shadow-2xl"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
            >
              <div className="text-center mb-8">
                {activePuzzle && (
                  <h2 className="font-display text-2xl tb:text-3xl text-black">
                    {activePuzzle.title}
                  </h2>
                )}
              </div>

              {completionData.analysis?.how_you_changed && (
                <p className="text-sm text-ash leading-relaxed mb-6">
                  {completionData.analysis.how_you_changed}
                </p>
              )}
              {completionData.analysis?.what_you_know && (
                <div className="mb-6 border-l-2 border-ash/20 pl-4">
                  <p className="text-sm text-ash leading-relaxed">
                    {completionData.analysis.what_you_know}
                  </p>
                </div>
              )}
              {completionData.analysis?.whats_next && (
                <p className="text-xs text-smoke leading-relaxed italic mb-8">
                  {completionData.analysis.whats_next}
                </p>
              )}

              <Button
                className="bg-black text-white font-medium w-full hover:bg-ash"
                radius="none"
                onPress={onComplete}
              >
                Back to Puzzles
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
