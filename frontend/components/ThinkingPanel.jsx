"use client";

/**
 * ThinkingPanel
 * -------------
 * A frosted glass surface anchored to the bottom of the screen.
 * Replaces the chatbot UI. No bubbles, no send button — just a
 * writing surface where the user thinks out loud.
 *
 * Past submissions stay on the glass as "settled" notes (smaller, dimmer),
 * scrolling upward. The active paragraph is bright; once submitted it
 * softens. The intention is the opposite of a messaging app: the user
 * is looking at *their own thinking*, not a conversation thread.
 *
 * Submit: Cmd/Ctrl+Enter OR the tiny tick glyph in the bottom-right.
 * Focus: the panel expands from 40% to 70% of screen height.
 *
 * Voice input: no Web Speech API. The textarea accepts OS-level dictation.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export default function ThinkingPanel({
  visible = true,
  disabled = false,
  notes = [], // [{ id, text, submittedAt }]
  onSubmit,
  isSending = false,
}) {
  const [draft, setDraft] = useState("");
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  // Keep the settled notes scrolled to the most recent.
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [notes.length]);

  function handleSubmit() {
    const trimmed = draft.trim();
    if (!trimmed || disabled || isSending) return;
    onSubmit && onSubmit(trimmed);
    setDraft("");
  }

  function handleKeyDown(e) {
    // Cmd/Ctrl + Enter submits. Plain Enter inserts a newline for free
    // multi-paragraph thinking.
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
            className="mx-auto pointer-events-auto bg-black/90 backdrop-blur-xl border-t-2 border-primary px-5 tb:px-10 pt-4 pb-4"
            style={{ maxWidth: "880px" }}
          >
            {/* Settled notes — past thoughts, above the input */}
            {notes.length > 0 && (
              <div
                ref={scrollRef}
                className="mb-3 max-h-[20vh] overflow-y-auto space-y-2 scrollbar-none"
                style={{ scrollbarWidth: "none" }}
              >
                {notes.map((note) => (
                  <motion.p
                    key={note.id}
                    initial={{ opacity: 0, y: 4 }}
                    animate={{ opacity: 0.45, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-white/45 text-sm leading-relaxed whitespace-pre-wrap font-sans border-l border-primary/40 pl-3"
                  >
                    {note.text}
                  </motion.p>
                ))}
              </div>
            )}

            {/* Active writing surface */}
            <div className="flex gap-3 items-start">
              <textarea
                ref={textareaRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Write your thoughts on the puzzle here…"
                disabled={disabled}
                rows={3}
                className="flex-1 resize-none bg-transparent text-white placeholder:text-white/40 text-base tb:text-lg leading-relaxed font-sans outline-none border-0"
                style={{ caretColor: "#ffffff", verticalAlign: "top" }}
              />
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!draft.trim() || disabled || isSending}
                className="flex-shrink-0 mt-1 bg-primary text-white font-mono text-[11px] tracking-[0.2em] uppercase px-4 py-2 hover:bg-primary/80 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
              >
                {isSending ? "…" : "Submit"}
              </button>
            </div>

            <p className="mt-2 font-mono text-[9px] tracking-[0.25em] uppercase text-white/35">
              ⌘↵ to submit
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
