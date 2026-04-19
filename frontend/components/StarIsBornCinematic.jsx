"use client";

/**
 * StarIsBornCinematic
 * -------------------
 * ~8s cinematic intro for the "A Star Is Born" puzzle.
 * Uses cinematic-star.webm as the full-screen base layer.
 * After the text typewrites, a transparent star image is shown
 * above the puzzle text so the user can reference it.
 *
 * Stages:
 *   0.0–1.5s  Video fades in from black
 *   1.5–2.5s  Ambient settle
 *   2.5–4.5s  Dark overlay deepens
 *   4.5–5.5s  Star image fades in
 *   5.5–6.5s  Puzzle text begins typewriting
 *   8.0+      Ambient state locked — parent panel activates
 *
 * On replay (same sessionId), a skip affordance appears after 2s.
 */

import React, { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Image from "next/image";

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
export default function StarIsBornCinematic({
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

  // Fire onComplete at 14s or on skip
  useEffect(() => {
    if (completed) return;
    if (skipped || t >= 14000) {
      setCompleted(true);
      try { storageKey && sessionStorage.setItem(storageKey, "1"); } catch {}
      onComplete && onComplete();
    }
  }, [t, skipped, completed, onComplete, storageKey]);

  // Stages
  const stage = {
    dimOverlay: t >= 4000,
    starImage:  t >= 4800,
    puzzleOn:   t >= 5500,
    settled:    t >= 10000,
  };

  const showSkip = isReplay && t >= 2000 && !stage.settled;

  return (
    <div className="fixed inset-0 z-30 overflow-hidden pointer-events-none bg-black">

      {/* ── Video ─────────────────────────────────────────────────────── */}
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
        <source src="/cinematic-star.webm" type="video/webm" />
      </motion.video>

      {/* ── Grain ─────────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 opacity-[0.06] mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage: "radial-gradient(rgba(255,255,255,0.6) 1px, transparent 1px)",
          backgroundSize: "3px 3px",
        }}
      />

      {/* ── Vignette ──────────────────────────────────────────────────── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, transparent 36%, rgba(0,0,0,0.78) 100%)",
        }}
      />

      {/* ── Dim overlay ───────────────────────────────────────────────── */}
      <motion.div
        className="absolute inset-0 bg-black pointer-events-none"
        animate={{ opacity: stage.dimOverlay ? 0.5 : 0 }}
        transition={{ duration: 2, ease: "easeInOut" }}
      />

      {/* ── Star image + Puzzle text ──────────────────────────────────── */}
      {stage.starImage && (
        <motion.div
          className="absolute inset-x-0 flex flex-col items-center pointer-events-auto px-8 tb:px-20 lp:px-32"
          style={{ top: 0, bottom: "190px" }}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1.0, ease: "easeOut" }}
        >
          <div
            className="pointer-events-auto overflow-y-auto scrollbar-thin scrollbar-thumb-white/20 scrollbar-track-transparent px-2 w-full flex flex-col items-center"
            style={{ maxHeight: "100%" }}
          >
            {/* Star reference image */}
            <motion.div
              className="mt-6 mb-4 flex-shrink-0"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            >
              <Image
                src="/images/415-4155175_drawn-stare-star-background-transparent-drawn-star-png.png"
                alt="Five-pointed star"
                width={160}
                height={160}
                className="drop-shadow-[0_2px_20px_rgba(255,255,255,0.3)] invert brightness-200"
                style={{ filter: "invert(1) brightness(2) drop-shadow(0 2px 20px rgba(255,255,255,0.3))" }}
              />
            </motion.div>

            {/* Puzzle text */}
            {stage.puzzleOn && (
              <p
                className="font-display text-white text-lg tb:text-xl lp:text-2xl text-left inline-block max-w-2xl leading-relaxed drop-shadow-[0_2px_28px_rgba(0,0,0,0.95)] whitespace-pre-wrap py-4"
              >
                <Typewriter
                  text={puzzleText}
                  startDelay={0}
                  speed={18}
                />
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* ── Skip affordance (replays only) ────────────────────────────── */}
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
