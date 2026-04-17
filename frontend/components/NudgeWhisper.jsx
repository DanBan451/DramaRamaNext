"use client";

/**
 * NudgeWhisper
 * ------------
 * The AI nudge never appears as a chat reply. It appears as an italic
 * serif-display whisper at the top-right of the screen. It holds at full
 * opacity for ~8s, then settles to 30% opacity until the next nudge
 * replaces it.
 *
 * A small "hint" glyph at the top-right requests a new nudge.
 *
 * Props:
 *  - text: current nudge text (or streaming partial)
 *  - streaming: true while tokens are arriving
 *  - onRequest: called when user asks for a hint
 *  - disabled: hint button disabled (e.g. during cinematic)
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function NudgeWhisper({
  text,
  streaming = false,
  onRequest,
  disabled = false,
}) {
  const [faded, setFaded] = useState(false);
  const timerRef = useRef(null);

  // Whenever a new nudge arrives (text changes and not streaming),
  // start the 8s "loud" period, then fade to 30%.
  useEffect(() => {
    if (streaming) {
      setFaded(false);
      return;
    }
    if (!text) return;
    setFaded(false);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setFaded(true), 8000);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [text, streaming]);

  return (
    <>
      {/* Hint request glyph */}
      <button
        type="button"
        onClick={() => !disabled && onRequest && onRequest()}
        disabled={disabled}
        aria-label="ask for a nudge"
        className="fixed top-6 right-6 z-40 font-mono text-[10px] tracking-[0.2em] uppercase px-3 py-1.5 border border-primary/70 text-primary bg-black/60 hover:bg-primary hover:text-white disabled:opacity-20 disabled:cursor-not-allowed transition-all backdrop-blur-sm"
      >
        hint
      </button>

      {/* The whisper itself */}
      <AnimatePresence>
        {text && (
          <motion.div
            key={`whisper-${text.slice(0, 16)}`}
            className="fixed top-16 right-6 z-40 max-w-[340px] tb:max-w-[420px] pointer-events-none"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: faded ? 0.3 : 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            transition={{ duration: 0.8, ease: "easeOut" }}
          >
            <p className="font-display italic text-white text-sm tb:text-base leading-relaxed text-right">
              {text}
              {streaming && (
                <span className="inline-block w-1.5 h-3 bg-white/60 ml-1 animate-pulse align-middle" />
              )}
            </p>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
