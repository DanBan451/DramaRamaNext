"use client";

/**
 * NudgeWhisper
 * ------------
 * Session action buttons (top-right) + hint modal.
 *
 * Props:
 *  - hint:            { text, element, subElement }
 *  - hintLoading:     true while fetching a new hint
 *  - onRequestHint:   called when user asks for a new hint
 *  - canRequestHint:  true when deepenCount > hintCount && not sending
 *  - deepenCount:     how many times the user has deepened
 *  - onComplete:      end session callback
 *  - onLeave:         leave session (navigate away) without ending
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NudgeWhisper({
  hint = { text: "", element: "", subElement: "" },
  hintLoading = false,
  onRequestHint,
  canRequestHint = false,
  deepenCount = 0,
  onComplete,
  onLeave,
}) {
  const [showModal, setShowModal] = useState(false);
  const [gatedMsg, setGatedMsg] = useState("");
  const wasLoadingRef = useRef(false);

  // Auto-open modal when a new hint finishes loading
  useEffect(() => {
    if (wasLoadingRef.current && !hintLoading && hint.text) {
      setShowModal(true);
    }
    wasLoadingRef.current = hintLoading;
  }, [hintLoading, hint.text]);

  function handleNewHint() {
    if (hintLoading) return;
    if (deepenCount === 0) {
      setGatedMsg("Write your thoughts and deepen your understanding first.");
      setTimeout(() => setGatedMsg(""), 4000);
      return;
    }
    if (!canRequestHint) {
      setGatedMsg("Deepen your understanding again to unlock another nudge.");
      setTimeout(() => setGatedMsg(""), 4000);
      return;
    }
    onRequestHint && onRequestHint();
  }

  return (
    <>
      {/* ── Top bar — leave left, actions right ─────────────────────────── */}
      <div className="fixed top-0 left-0 right-0 z-40 flex items-center justify-between px-6 py-4">
        {/* Left: Leave */}
        <div>
          {onLeave && (
            <button
              type="button"
              onClick={onLeave}
              className="font-mono text-[10px] tracking-[0.15em] uppercase text-white/50 hover:text-white transition-colors flex items-center gap-1.5"
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12" />
                <polyline points="12 19 5 12 12 5" />
              </svg>
              Leave
            </button>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex gap-3 items-center">
          <button
            type="button"
            onClick={() => hint.text && setShowModal(true)}
            disabled={!hint.text}
            aria-label="view current nudge"
            className="font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-white text-change border border-change hover:bg-change/5 disabled:opacity-20 disabled:cursor-not-allowed transition-all"
          >
            View Nudge
          </button>
          <button
            type="button"
            onClick={handleNewHint}
            disabled={hintLoading}
            aria-label="request nudge"
            className="font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-change text-white border border-white/80 hover:bg-change/80 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {hintLoading ? "…" : "Nudge"}
          </button>
          <button
            type="button"
            onClick={onComplete}
            className="font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2 bg-[#8B0000] text-white border border-white/80 hover:bg-[#6B0000] transition-all"
          >
            End Session
          </button>
        </div>
      </div>

      {/* ── Gated hint message ─────────────────────────────────────────── */}
      <AnimatePresence>
        {gatedMsg && (
          <motion.div
            key="gated-msg"
            className="fixed top-16 right-6 z-50 max-w-xs"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
          >
            <div className="bg-white shadow-xl border border-change/20 px-5 py-3">
              <p className="text-ash text-xs leading-relaxed">{gatedMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hint modal ─────────────────────────────────────────────────── */}
      <AnimatePresence>
        {showModal && hint.text && (
          <motion.div
            className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-black/70 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setShowModal(false)}
          >
            <motion.div
              className="bg-white max-w-lg w-full p-8 shadow-2xl relative"
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              transition={{ duration: 0.22 }}
              onClick={(e) => e.stopPropagation()}
            >
              <button
                onClick={() => setShowModal(false)}
                className="absolute top-4 right-4 text-smoke hover:text-black transition-colors"
                aria-label="close hint"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>

              {/* Element + sub-element badges */}
              {(hint.element || hint.subElement) && (
                <div className="flex flex-wrap gap-2 mb-5">
                  {hint.element && (
                    <span className="font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 bg-change/10 text-change border border-change/30">
                      {hint.element}
                    </span>
                  )}
                  {hint.subElement && (
                    <span className="font-mono text-[9px] tracking-[0.25em] uppercase px-2 py-0.5 bg-ash/10 text-ash border border-ash/20">
                      {hint.subElement}
                    </span>
                  )}
                </div>
              )}

              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-smoke mb-3">Nudge</p>
              <p className="font-display italic text-ash text-base leading-relaxed">
                {hint.text}
              </p>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
