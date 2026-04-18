"use client";

/**
 * ThinkingPanel
 * -------------
 * Fixed-height white panel anchored to the bottom.
 * User writes thoughts, clicks "Deepen Understanding" to submit (clears text).
 * "View Understanding" flickers when understanding is updated.
 * "End Session" is a subtle link to complete the session.
 *
 * Props:
 *  - visible, disabled, isSending
 *  - onSubmit(text)
 *  - onViewUnderstanding()
 *  - onComplete()
 *  - understandingVersion: increments each time understanding updates (drives flicker)
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThinkingPanel({
  visible = true,
  disabled = false,
  onSubmit,
  onViewUnderstanding,
  isSending = false,
  understandingVersion = 0,
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef(null);
  const [uvFlicker, setUvFlicker] = useState(false);

  // Flicker "View Understanding" each time understandingVersion increments
  useEffect(() => {
    if (understandingVersion === 0) return;
    setUvFlicker(true);
    const t = setTimeout(() => setUvFlicker(false), 2000);
    return () => clearTimeout(t);
  }, [understandingVersion]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isSending) return;
    onSubmit && onSubmit(trimmed);
    setDraft("");
  }

  function handleKeyDown(e) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSubmit();
    }
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="thinking-panel"
          className="fixed left-0 right-0 bottom-0 z-40 pointer-events-none"
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 40, opacity: 0 }}
          transition={{ duration: 0.6, ease: "easeOut" }}
        >
          <div
            className="mx-auto pointer-events-auto bg-white border-t-2 border-change px-5 tb:px-10 pt-4 pb-4 shadow-2xl"
            style={{ maxWidth: "880px" }}
          >
            {/* Fixed-height textarea — never grows the panel */}
            <div className="mb-3">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your thoughts on the puzzle here…"
                disabled={disabled || isSending}
                className="w-full resize-none bg-white text-black placeholder:text-ash/40 text-base leading-relaxed font-sans outline-none border border-ash/20 focus:border-change/50 px-4 py-3 transition-colors"
                style={{ caretColor: "#000000", height: "96px", overflow: "auto" }}
              />
            </div>

            {/* Action row */}
            <div className="flex items-center justify-between gap-3">
              <motion.button
                type="button"
                onClick={onViewUnderstanding}
                disabled={disabled}
                animate={uvFlicker ? { scale: [1, 1.04, 1, 1.04, 1] } : { scale: 1 }}
                transition={{ duration: 0.7 }}
                className={`whitespace-nowrap font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${
                  uvFlicker
                    ? "border-change text-change bg-change/5"
                    : "border-ash/30 text-ash hover:border-change hover:text-change"
                }`}
              >
                View Understanding
              </motion.button>

              <button
                type="button"
                onClick={handleSubmit}
                disabled={!draft.trim() || disabled || isSending}
                className="whitespace-nowrap flex-shrink-0 bg-change text-white font-mono text-[10px] tracking-[0.15em] uppercase px-4 py-2.5 hover:bg-change/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? "…" : "Deepen Understanding"}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
