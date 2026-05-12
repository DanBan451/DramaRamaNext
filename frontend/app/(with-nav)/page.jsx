"use client";

import React, { useState, useRef } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";
import PuzzleTypewriter from "@/components/PuzzleTypewriter";
import HowItWorksSteps from "@/components/HowItWorksSteps";
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
    <div className="bg-white">
      {/* 100svh fold: flexible hero image + intrinsic-height modes row (split flex so modes never clip). */}
      <section
        ref={heroRef}
        className="relative flex h-[100svh] max-h-[100svh] min-h-0 flex-col overflow-hidden bg-white supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
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

            <div className="absolute inset-x-0 top-0 bottom-0 mx-auto hidden max-w-[1536px] px-6 tb:block tb:px-0 tb:pl-[45%] lp:pl-[50%] tb:pr-6">
              <div className="flex h-full max-w-none flex-col justify-center tb:max-w-[560px] tb:translate-y-5 tb:pb-20 lp:max-w-[620px] lp:translate-y-7 lp:pl-[100px] lp:pb-24">
                <span
                  className="mb-6 block font-mono text-[12px] font-medium uppercase tracking-[0.24em] lp:text-[14px]"
                  style={{ color: "#2D8FAD" }}
                >
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
                        href="#how-it-works"
                        className="group inline-flex items-center gap-3 font-display text-xl italic text-primary transition-colors hover:text-primary/70 lp:text-2xl"
                      >
                        <span className="relative">
                          Find out why
                          <span className="absolute left-0 -bottom-0.5 h-px w-full bg-primary/40 transition-colors group-hover:bg-primary" />
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

        <div className="relative shrink-0 flex flex-col overflow-hidden border-t border-mist bg-mist/60 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-5 shadow-[0_-8px_32px_rgba(0,0,0,0.06)] tb:pt-6 tb:pb-6 lp:pt-7 lp:pb-7">
          {/* Shimmer: real layer + Tailwind keyframes (styled-jsx ::before was not reliably visible). */}
          <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden" aria-hidden>
            <div className="absolute inset-y-0 w-[min(70%,520px)] -skew-x-12 bg-gradient-to-r from-transparent via-white/90 to-transparent shadow-[0_0_40px_rgba(255,255,255,0.35)] animate-[shimmerSlide_3.2s_ease-in-out_infinite]" />
          </div>

          <div className="relative z-10 mx-auto w-full max-w-[1536px] flex flex-col px-6">
            <div className="mt-5 w-full tb:mt-0">
              <div className="grid w-full grid-cols-1 divide-y divide-mist/50 tb:grid-cols-2 tb:divide-x tb:divide-y-0">
                <Link
                  href="/course/new"
                  className="group flex min-h-[8.5rem] flex-col justify-between bg-transparent py-8 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 focus-visible:ring-offset-mist tb:min-h-0 tb:flex-1 tb:py-8 tb:pr-10 lp:py-8 lp:pr-14"
                >
                  <div>
                    <div className="mb-3 h-px w-9 bg-primary" aria-hidden />
                    <h2 className="font-display text-[clamp(1.45rem,2.8vw,1.85rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-black">
                      The Practice
                    </h2>
                    <p className="mt-2.5 max-w-[22rem] font-sans text-[0.9375rem] font-medium leading-snug tracking-tight text-ash tb:max-w-none tb:text-base">
                      Where the muscles get built.
                    </p>
                  </div>
                  <span className="mt-7 flex w-full items-center justify-center border-2 border-change bg-transparent py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-change transition-[background-color,box-shadow] duration-200 group-hover:bg-change/5 group-hover:shadow-sm tb:mt-8 tb:text-xs">
                    Start the practice
                  </span>
                </Link>
                <Link
                  href="/courses"
                  className="group flex min-h-[8.5rem] flex-col justify-between bg-transparent py-8 text-left outline-none transition-colors duration-200 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 focus-visible:ring-offset-mist tb:min-h-0 tb:flex-1 tb:py-8 tb:pl-10 lp:py-8 lp:pl-14"
                >
                  <div>
                    <div className="mb-3 h-px w-9 bg-primary" aria-hidden />
                    <h2 className="font-display text-[clamp(1.45rem,2.8vw,1.85rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-black">
                      Understand
                    </h2>
                    <p className="mt-2.5 max-w-[22rem] font-sans text-[0.9375rem] font-medium leading-snug tracking-tight text-ash tb:max-w-none tb:text-base">
                      Where they get used.
                    </p>
                  </div>
                  <span className="mt-7 flex w-full items-center justify-center border-2 border-change bg-transparent py-3.5 text-center text-[11px] font-bold uppercase tracking-[0.18em] text-change transition-[background-color,box-shadow] duration-200 group-hover:bg-change/5 group-hover:shadow-sm tb:mt-8 tb:text-xs">
                    Go to Understand
                  </span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── How DramaRama Works ── four static step previews of the full product arc */}
      <section
        id="how-it-works"
        className="py-20 tb:py-24 lp:py-28 px-6 bg-white scroll-mt-24"
      >
        <div className="max-w-[1536px] mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-4">
            How DramaRama works
          </span>
          <p className="font-display italic text-[22px] tb:text-[26px] lp:text-[30px] leading-[1.3] text-ash mb-12 tb:mb-16 lp:mb-20 max-w-[760px]">
            From your goal to a more effective mind. Here&apos;s the path.
          </p>

          <HowItWorksSteps />
        </div>
      </section>

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

      {/* ── CTA ── */}
      <section className="py-24 tb:py-32 px-6 bg-gradient-to-br from-ash via-void to-ash relative overflow-hidden">
        {/* Subtle purple glow */}
        <div className="absolute top-0 right-1/4 w-96 h-96 bg-change/10 rounded-full blur-3xl" />
        
        <motion.div
          className="max-w-[1536px] mx-auto text-center relative z-10"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-3xl tb:text-4xl lp:text-5xl text-white mb-4 tb:mb-6 italic">
            Pick what you want to master.
          </h2>
          <p className="text-white/50 text-base tb:text-lg mb-8 tb:mb-10 max-w-lg mx-auto">
            A course of puzzles. One goal. See how your thinking changes.
          </p>
          <SignedIn>
            <Link href="/course/new">
              <Button
                className="bg-white text-black px-8 tb:px-10 h-12 tb:h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start Your Course
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/course/new">
              <Button
                className="bg-white text-black px-8 tb:px-10 h-12 tb:h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start Your Course
              </Button>
            </Link>
          </SignedOut>
        </motion.div>
      </section>

      {/* Attribution */}
      <div className="py-12 px-6 border-t border-mist">
        <p className="text-center text-smoke text-sm max-w-lg mx-auto leading-relaxed">
          DramaRama is built on the 5 Elements of Effective Thinking by Edward B. Burger, with deep gratitude to <em>Making Up Your Own Mind</em>.
        </p>
      </div>

      <Footer />
    </div>
  );
}
