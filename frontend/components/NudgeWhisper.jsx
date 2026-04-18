"use client";

/**
 * NudgeWhisper
 * ------------
 * Two buttons at top-right: "View Hint" (opens modal with current hint) and
 * "New Hint" (requests a new hint from the AI). The modal auto-opens when a
 * new hint finishes loading. Shows element + sub-element badges in the modal.
 *
 * Props:
 *  - hint:          { text, element, subElement }
 *  - hintLoading:   true while fetching a new hint
 *  - onRequestHint: called when user asks for a new hint
 *  - canRequestHint: true once user has deepened understanding at least once
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NudgeWhisper({
  hint = { text: "", element: "", subElement: "" },
  hintLoading = false,
  onRequestHint,
  canRequestHint = false,
  onComplete,
}) {
  const [showModal, setShowModal] = useState(false);
  const wasLoadingRef = useRef(false);

  // Auto-open modal when a new hint finishes loading
  useEffect(() => {
    if (wasLoadingRef.current && !hintLoading && hint.text) {
      setShowModal(true);
    }
    wasLoadingRef.current = hintLoading;
  }, [hintLoading, hint.text]);

  return (
    <>
      {/* End Session + hint buttons — top-right */}
      <div className="fixed top-6 right-6 z-40 flex gap-3 items-center">
        <button
          type="button"
          onClick={onComplete}
          className="font-mono text-[9px] tracking-[0.2em] uppercase text-white/40 hover:text-white/80 transition-colors"
        >
          End Session
        </button>
        <button
          type="button"
          onClick={() => hint.text && setShowModal(true)}
          disabled={!hint.text}
          aria-label="view current hint"
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-white/40 text-white/70 bg-black/60 hover:text-white hover:border-white/80 disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
        >
          View Hint
        </button>
        <button
          type="button"
          onClick={() => !hintLoading && canRequestHint && onRequestHint && onRequestHint()}
          disabled={!canRequestHint || hintLoading}
          aria-label="request new hint"
          className="font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 bg-primary text-white hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
        >
          {hintLoading ? "…" : "New Hint"}
        </button>
      </div>

      {/* Hint modal */}
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

              <p className="font-mono text-[10px] tracking-[0.3em] uppercase text-smoke mb-3">Hint</p>
              <p className="font-display italic text-ash text-base leading-relaxed mb-6">
                {hint.text}
              </p>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    onRequestHint && onRequestHint();
                  }}
                  disabled={!canRequestHint || hintLoading}
                  className="font-mono text-[10px] tracking-[0.2em] uppercase px-4 py-2 bg-primary text-white hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  New Hint
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
