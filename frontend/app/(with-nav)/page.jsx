"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";
import PuzzleTypewriter from "@/components/PuzzleTypewriter";
import SandboxIntroSection from "@/components/SandboxIntroSection";
import ThinkIntroSection from "@/components/ThinkIntroSection";
import HomeModeSequence from "@/components/HomeModeSequence";
import { PUZZLES } from "@/lib/puzzles";

export default function Home() {
  // selectedPuzzle is kept as state-only because the modal that used it was
  // gated behind {false && ...} and the legacy /workspace flow it linked to
  // has been removed. The puzzle list still calls setSelectedPuzzle(p) on
  // click — we just no-op the modal until the homepage is redesigned.
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [puzzleReady, setPuzzleReady] = useState(false);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Scroll animation - white overlay fades in, content fades out
  const whiteOverlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, -50]);

  return (
    <div id="home-page-scroll" className="min-w-0 overflow-x-hidden bg-white">
      {/* 100svh fold: flexible hero image + intrinsic-height modes row (split flex so modes never clip). */}
      <section
        ref={heroRef}
        className="snap-start relative flex h-[100svh] max-h-[100svh] min-h-0 flex-col overflow-hidden bg-white supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
      >
        <div className="relative min-h-0 flex-1 w-full overflow-hidden">
          {/* Background Image — focal point nudged down (higher % = puzzle sits lower in frame) */}
          <div
            className="absolute inset-0 bg-cover bg-no-repeat bg-[center_64%]"
            style={{ backgroundImage: "url('/images/header.png')" }}
          />

          {/* Mobile: White overlay for readability */}
          <div className="absolute inset-0 bg-white/90 tb:hidden" />

          {/* LEFT: B&W — fixed split: 1/3 at tb, 1/4 at lp */}
          <div className="absolute inset-y-0 left-0 hidden w-1/3 backdrop-brightness-100 backdrop-saturate-0 tb:block lp:w-1/4" />

          {/* RIGHT: Bright mask from split */}
          <div className="absolute inset-y-0 right-0 hidden backdrop-brightness-150 tb:left-1/3 tb:block lp:left-1/4" />

          {/* Gradient fade — from split */}
          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden tb:left-1/3 tb:block lp:left-1/4"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 58%, rgba(255,255,255,1) 72%)",
            }}
          />

          {/* White overlay that fades in as you scroll (image region only) */}
          <motion.div
            className="pointer-events-none absolute inset-0 z-10 bg-white"
            style={{ opacity: whiteOverlayOpacity }}
          />

          {/* Hero Content — story / puzzle: original right column (centered in image band) */}
          <motion.div
            className="absolute inset-0 z-20 flex flex-col tb:block"
            style={{ opacity: contentOpacity, y: contentY }}
          >
            {/* Mobile: headline — nudged from left toward seam */}
            <div className="pointer-events-none z-30 mt-auto flex flex-1 flex-col justify-end px-6 pb-10 tb:hidden">
              <div className="pointer-events-auto pl-[28vw]">
                <h1 className="font-display text-4xl leading-[1.05] tracking-tight text-black sm:text-5xl">
                  Become a more effective <em className="italic text-black">thinker</em>.
                </h1>
              </div>
            </div>

            {/* Tablet+: headline starts at B&W seam, extends right; larger type, no accent color */}
            <div className="pointer-events-none absolute bottom-0 left-1/3 right-0 z-30 hidden pb-8 pl-4 pr-6 tb:block lp:bottom-0 lp:left-1/4 lp:pb-10 lp:pl-5 lp:pr-8">
              <div className="pointer-events-auto max-w-[min(920px,100%)]">
                <h1 className="font-display text-[clamp(2.75rem,5vw,4.25rem)] leading-[0.96] tracking-[-0.02em] text-black lp:text-[clamp(3.25rem,5.2vw,4.75rem)] xl:text-[clamp(3.75rem,5.5vw,5.25rem)]">
                  Become a more
                  <br />
                  effective <em className="italic text-black">thinker</em>.
                </h1>
              </div>
            </div>

            <div className="absolute inset-x-0 top-0 bottom-0 mx-auto hidden max-w-[1536px] flex-col px-6 tb:flex tb:px-0 tb:pl-[38%] lp:pl-[40%] tb:pr-5 lp:pr-8 tb:pt-24 tb:pb-6 lp:pt-28 lp:pb-8">
              <div className="flex min-h-0 w-full min-w-0 max-w-none flex-1 flex-col justify-center tb:pl-[calc(1.5rem+5vw)] lp:pl-[calc(2rem+5vw)]">
                <span className="mb-6 block font-mono text-[12px] font-medium uppercase tracking-[0.24em] text-[#5B9BD5] lp:text-[14px]">
                  A quick story
                </span>
                <PuzzleTypewriter onReady={() => setPuzzleReady(true)} />
                <AnimatePresence>
                  {puzzleReady && (
                    <motion.div
                      className="mt-8"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.6, ease: "easeOut" }}
                    >
                      <Link
                        href="#the-sandbox"
                        className="group inline-flex items-center gap-3 font-display text-xl italic text-[#5B9BD5] transition-colors hover:text-[#4A8FCE] lp:text-2xl"
                      >
                        <span className="relative">
                          Find out how
                          <span className="absolute left-0 -bottom-0.5 h-px w-full bg-[#5B9BD5]/45 transition-colors group-hover:bg-[#4A8FCE]" />
                        </span>
                        <span
                          aria-hidden
                          className="inline-block transition-transform duration-300 group-hover:translate-x-1"
                        >
                          →
                        </span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <HomeModeSequence />

      <SandboxIntroSection />

      <ThinkIntroSection />

      {/* ── Puzzle Preview removed in Phase 1 ── */}
      {false && (
      <section id="puzzles" className="py-24 tb:py-32 px-6 bg-white">
        <div className="max-w-[1536px] mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12 tb:mb-16">
            The Puzzles
          </span>

          <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4 tb:gap-6">
            {PUZZLES.slice(0, 6).map((puzzle, i) => {
              const isActive = puzzle.id === "whos-who" || puzzle.id === "top-10-list" || puzzle.id === "three-switches" || puzzle.id === "star-is-born";
              return (
                <motion.button
                  key={puzzle.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  onClick={() => isActive && setSelectedPuzzle(puzzle)}
                  disabled={!isActive}
                  className={`group bg-white border p-6 tb:p-8 min-h-[180px] tb:min-h-[200px] flex flex-col justify-between transition-all duration-300 text-left relative ${
                    isActive
                      ? "border-mist hover:border-change/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                      : "border-mist/70 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <span className="font-mono text-[10px] text-change/60 tracking-widest">
                      {puzzle.number}
                    </span>
                    <h4
                      className={`font-display text-xl tb:text-2xl text-black mt-2 mb-3 ${
                        isActive ? "group-hover:text-change transition-colors" : ""
                      }`}
                    >
                      {puzzle.title}
                    </h4>
                    <p className="text-smoke text-base tb:text-lg leading-relaxed line-clamp-2 italic">
                      {puzzle.hook || puzzle.text.split("\n")[0]}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-mono text-smoke/40 uppercase tracking-wider">
                      {puzzle.category}
                    </span>
                    {!isActive && (
                      <span className="text-[10px] font-mono text-smoke/60 uppercase tracking-[0.25em]">
                        coming soon
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Legacy puzzle-modal removed: it linked to the deleted /workspace
          legacy session flow. The pitch puzzle list still scrolls/animates
          via PUZZLES; clicking a puzzle is a no-op until the homepage
          puzzle-CTA is redesigned. */}

      {/* Attribution — soft lift from Think gray into white footer band */}
      <div className="border-t border-mist/60 bg-gradient-to-b from-[#c9ccd2] from-0% via-white via-[min(8vh,3.5rem)] to-white to-100%">
        <div className="nav-shell py-12">
        <p className="mx-auto max-w-lg text-center text-sm leading-relaxed text-smoke">
          DramaRama is built on the 5 Elements of Effective Thinking by Edward B. Burger, with deep gratitude to <em>Making Up Your Own Mind</em>.
        </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
