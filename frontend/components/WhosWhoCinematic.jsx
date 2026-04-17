"use client";

/**
 * WhosWhoCinematic
 * ----------------
 * ~8s cinematic intro for the "Who's Who" puzzle.
 * Uses a pre-rendered GIF as the full-screen base layer; all text/overlay
 * beats are layered on top via Framer Motion.
 *
 * Stages (timed against the GIF's own animation rhythm):
 *   0.0–1.5s  GIF fades in from black
 *   1.5–2.5s  Speech ribbons rise and typewrite
 *   2.5–4.5s  Asterisk pulses; caption typewrites
 *   4.5–6.0s  Dark overlay deepens; question typewrites at the bottom
 *   6.0–8.0s  Question lifts; ambient state locked — parent panel activates
 *
 * On replay (same sessionId), a skip affordance appears after 2s.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Typewriter helper ────────────────────────────────────────────────────────
function Typewriter({ text, startDelay = 0, speed = 35, className = "", onDone }) {
  const [shown, setShown] = useState("");
  const doneRef = useRef(false);

  useEffect(() => {
    doneRef.current = false;
    setShown("");
    const start = setTimeout(() => {
      let i = 0;
      const tick = setInterval(() => {
        i += 1;
        setShown(text.slice(0, i));
        if (i >= text.length) {
          clearInterval(tick);
          if (!doneRef.current) {
            doneRef.current = true;
            onDone && onDone();
          }
        }
      }, speed);
    }, startDelay);
    return () => clearTimeout(start);
  }, [text, startDelay, speed, onDone]);

  return <span className={className}>{shown}</span>;
}

// ─── Main component ───────────────────────────────────────────────────────────
export default function WhosWhoCinematic({
  sessionId,
  puzzleText = "",
  onComplete,
  speed = 1,
}) {
  const [t, setT] = useState(0);
  const [skipped, setSkipped] = useState(false);
  const [completed, setCompleted] = useState(false);
  const videoRef = useRef(null);

  const storageKey = sessionId ? `cinematic:played:${sessionId}` : null;
  const [isReplay, setIsReplay] = useState(false);

  useEffect(() => {
    if (!storageKey) return;
    try { setIsReplay(Boolean(sessionStorage.getItem(storageKey))); } catch {}
  }, [storageKey]);

  // Clock
  useEffect(() => {
    if (skipped || completed) return;
    const started = performance.now();
    let raf;
    const tick = (now) => {
      setT((now - started) * speed);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [skipped, completed, speed]);

  // Fire onComplete at 12 s (gives full puzzle text time to finish typing) or on skip
  useEffect(() => {
    if (completed) return;
    if (skipped || t >= 12000) {
      setCompleted(true);
      try { storageKey && sessionStorage.setItem(storageKey, "1"); } catch {}
      onComplete && onComplete();
    }
  }, [t, skipped, completed, onComplete, storageKey]);

  // Stages — timed around the 5.07 s video cycle
  const stage = {
    dimOverlay: t >= 4600,
    puzzleOn:   t >= 5300,   // full puzzle text typewrites in after video freezes
    settled:    t >= 8200,
  };

  const showSkip = isReplay && t >= 2000 && !stage.settled;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden pointer-events-none bg-black">

      {/* ── Video — plays once, holds last frame naturally ──────────────── */}
      <motion.video
        ref={videoRef}
        autoPlay
        muted
        playsInline
        className="absolute inset-0 w-full h-full object-cover"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.4, ease: "easeIn" }}
      >
        <source src="/cinematic-whos-who-laptop.webm" type="video/webm" />
        <source src="/cinematic-whos-who-laptop.gif" type="image/gif" />
      </motion.video>

      {/* ── Grain ──────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* ── Vignette ───────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 36%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {/* ── Dim overlay — fades in after freeze so question is legible ─── */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none"
        animate={{ opacity: stage.dimOverlay ? 0.45 : 0 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* ── Full puzzle text — typewrites in after video, stays forever ── */}
      {stage.puzzleOn && (
        <motion.div
          className="absolute inset-x-0 flex flex-col items-center justify-center px-8 tb:px-20 lp:px-32"
          style={{ top: "50%", transform: "translateY(-50%)" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        >
          <div className="max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-2">
            <p
              className="font-display text-white text-lg tb:text-xl lp:text-2xl text-center max-w-2xl leading-relaxed drop-shadow-[0_2px_28px_rgba(0,0,0,0.95)] whitespace-pre-wrap"
            >
              <Typewriter
                text={puzzleText}
                startDelay={0}
                speed={18}
              />
            </p>
          </div>
        </motion.div>
      )}

      {/* ── Skip affordance (replays only) ─────────────────────────────── */}
      <AnimatePresence>
        {showSkip && (
          <motion.button
            key="skip"
            onClick={() => setSkipped(true)}
            className="pointer-events-auto absolute top-6 right-6 font-mono text-[10px] tracking-[0.3em] uppercase text-white/50 hover:text-white transition-colors"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            skip →
          </motion.button>
        )}
      </AnimatePresence>
    </div>
  );
}
