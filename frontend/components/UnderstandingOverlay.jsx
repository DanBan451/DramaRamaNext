"use client";

/**
 * UnderstandingOverlay
 * --------------------
 * Full-screen overlay that slides in from the right revealing the live
 * Understanding Document. Triggered by a small stacked-lines glyph at the
 * bottom-left of the cinematic surface.
 *
 * Dismiss: tap backdrop, swipe-left, or press Esc.
 */

import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import LiveDocument from "@/components/LiveDocument";

export default function UnderstandingOverlay({
  open,
  onClose,
  documentText,
  loading,
}) {
  // Esc to close
  useEffect(() => {
    if (!open) return;
    function onKey(e) {
      if (e.key === "Escape") onClose && onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <>
          {/* Backdrop */}
          <motion.div
            key="doc-backdrop"
            className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
          />

          {/* Panel */}
          <motion.aside
            key="doc-panel"
            className="fixed right-0 top-0 bottom-0 z-50 w-full tb:w-[540px] bg-white shadow-2xl overflow-hidden flex flex-col"
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={{ left: 0, right: 0.3 }}
            onDragEnd={(_, info) => {
              // Swipe-right to dismiss
              if (info.offset.x > 80 || info.velocity.x > 400) {
                onClose && onClose();
              }
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-6 tb:px-8 py-5 border-b border-mist">
              <div>
                <span className="font-mono text-[10px] tracking-[0.3em] uppercase text-smoke">
                  Your understanding
                </span>
                <h2 className="font-display text-xl tb:text-2xl text-black mt-1">
                  Your scratch paper
                </h2>
              </div>
              <button
                onClick={onClose}
                aria-label="close"
                className="text-smoke hover:text-black text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto px-6 tb:px-8 py-6">
              {loading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-mist rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-mist rounded animate-pulse w-full" />
                  <div className="h-4 bg-mist rounded animate-pulse w-5/6" />
                </div>
              ) : (
                <LiveDocument text={documentText} />
              )}
            </div>
          </motion.aside>
        </>
      )}
    </AnimatePresence>
  );
}
