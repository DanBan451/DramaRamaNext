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

import React, { useEffect, useRef, useState } from "react";
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

  // Intro gate: only once the cinematic settles do the panel + whispers light up.
  const [introDone, setIntroDone] = useState(false);

  // Whisper state — the AI's nudges. One at a time, newest replaces previous.
  const [whisper, setWhisper] = useState("");

  // Settled notes (the user's own writing, retained on the glass).
  const [notes, setNotes] = useState([]);
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

          // User messages → settled notes on the glass
          const userNotes = allMsgs
            .filter((m) => m.role === "user")
            .map((m, i) => ({
              id: `hist-${i}-${m.createdAt}`,
              text: m.text,
              submittedAt: m.createdAt,
            }));
          if (userNotes.length) setNotes(userNotes);

          // Latest assistant message → whisper; tracks element tint
          const lastAssistant = [...allMsgs].reverse().find(
            (m) => m.role === "assistant"
          );
          if (lastAssistant) {
            setWhisper(lastAssistant.text);
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
    const noteId = `note-${Date.now()}`;
    setNotes((prev) => [...prev, { id: noteId, text, submittedAt: Date.now() }]);
    setSending(true);
    setWhisper("");

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
      setWhisper(data.response || "");
      setElement(data.element || "earth");
      if (data.understanding) setDocumentText(data.understanding);
    } catch (e) {
      console.error("Chat error:", e);
      setWhisper("Something slipped. Try again.");
    } finally {
      setSending(false);
    }
  }

  // ── Explicit nudge request (the "hint" glyph) ──────────────────────────────
  // We treat a hint as a minimal user turn; the backend decides what the
  // element should be based on state. This reuses the same chat stream so
  // nudge personality is unchanged.
  function requestNudge() {
    if (sending) return;
    sendThought("(I'd like a nudge — push me a little.)");
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

      {/* ── Nudge whisper (top-right) ─────────────────────────────────── */}
      {introDone && (
        <NudgeWhisper
          text={whisper}
          streaming={false}
          onRequest={requestNudge}
          disabled={sending}
        />
      )}

      {/* ── Understanding overlay trigger (bottom-left) ─────────────────── */}
      <AnimatePresence>
        {introDone && !docOpen && (
          <motion.button
            key="doc-trigger"
            onClick={() => setDocOpen(true)}
            aria-label="open understanding document"
            className="fixed bottom-6 left-6 z-40 flex flex-col gap-[3px] p-2 pointer-events-auto"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.55 }}
            whileHover={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.4 }}
          >
            <span className="block w-5 h-px bg-white" />
            <span className="block w-5 h-px bg-white" />
            <span className="block w-5 h-px bg-white" />
            <span className="mt-1 font-mono text-[9px] tracking-[0.3em] uppercase text-white/70">
              doc
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Finish session trigger (bottom-center, subtle) ─────────────── */}
      <AnimatePresence>
        {introDone && notes.length >= 2 && !completionData && (
          <motion.button
            key="finish"
            onClick={handleComplete}
            disabled={completeLoading}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 font-mono text-[10px] tracking-[0.3em] uppercase text-white/30 hover:text-white/80 transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {completeLoading ? "closing…" : "finish"}
          </motion.button>
        )}
      </AnimatePresence>

      {/* ── Thinking panel (frosted glass, bottom) ─────────────────────── */}
      <ThinkingPanel
        visible={introDone && !completionData}
        disabled={!introDone}
        notes={notes}
        onSubmit={sendThought}
        isSending={sending}
      />

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
