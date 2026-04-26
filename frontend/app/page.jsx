"use client";

import React, { useEffect, useState, useRef } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";
import PuzzleTypewriter from "@/components/PuzzleTypewriter";
import { PUZZLES } from "@/lib/puzzles";

export default function Home() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [puzzleReady, setPuzzleReady] = useState(false);
  const [activeSessions, setActiveSessions] = useState([]);
  const { getToken, isSignedIn } = useAuth();
  const heroRef = useRef(null);

  // Fetch active sessions to detect duplicates
  useEffect(() => {
    if (!isSignedIn) return;
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setActiveSessions(
            (data.sessions || []).filter((s) => s.status === "in_progress")
          );
        }
      } catch { /* silent */ }
    }
    load();
    return () => { cancelled = true; };
  }, [isSignedIn, getToken]);

  function getActiveSessionForPuzzle(puzzle) {
    return activeSessions.find(
      (s) => s.problem_description?.includes(puzzle.title)
    );
  }
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
      {/* Hero Section — the puzzle IS the pitch */}
      <section ref={heroRef} className="relative min-h-screen overflow-hidden bg-white">
        {/* Background Image — left side only */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/header.png')" }}
        />

        {/* Mobile: White overlay for readability */}
        <div className="absolute inset-0 bg-white/90 tb:hidden" />

        {/* LEFT: B&W Mask - hidden on mobile */}
        <div className="hidden tb:block absolute inset-0 w-1/3 lp:w-1/4 h-full backdrop-brightness-100 backdrop-saturate-0" />

        {/* RIGHT: Bright Mask — restores the original brightness boost on the image */}
        <div className="hidden tb:block absolute inset-y-0 right-0 w-2/3 lp:w-3/4 h-full backdrop-brightness-150" />

        {/* RIGHT: Gradient fade to solid white — fully white before the puzzle text */}
        <div
          className="hidden tb:block absolute inset-y-0 right-0 pointer-events-none"
          style={{
            width: "75%",
            background: "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 58%, rgba(255,255,255,1) 72%)",
          }}
        />

        {/* White overlay that fades in as you scroll */}
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none z-10"
          style={{ opacity: whiteOverlayOpacity }}
        />

        {/* Hero Content */}
        <motion.div
          className="relative z-20 min-h-screen flex items-center"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          {/* LEFT: PRIMARY pitch — title + subtitle + primary CTA.
              Anchored near the bottom but lifted a touch for breathing room. */}
          <div className="hidden tb:flex absolute inset-0 z-30 items-end pointer-events-none pb-28 lp:pb-32">
            <div className="w-full max-w-[1536px] mx-auto px-6">
              <div className="max-w-[440px] lp:max-w-[520px] ml-[24%] lp:ml-[20%] pointer-events-auto">
                {/* Primary headline — bigger, still italic-accented */}
                <h1 className="font-display text-[56px] lp:text-[76px] xl:text-[88px] text-black leading-[0.96] tracking-[-0.015em] mb-7">
                  Become a more<br />
                  effective <em className="italic">thinker</em>.
                </h1>
                <p className="text-ash text-[19px] lp:text-[22px] leading-[1.5] mb-9 max-w-[440px]">
                  Tell us what you want to master. We&apos;ll build you a course of puzzles that train you to get there.
                </p>
                <Link href="/workspace">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white w-full tb:w-[240px] h-[56px] text-base font-semibold tracking-wide shadow-lg hover:shadow-xl hover:scale-[1.02] transition-all"
                    radius="none"
                  >
                    Start Your Course
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          <div className="w-full max-w-[1536px] mx-auto py-20 tb:pt-20 tb:pb-24 px-6 tb:px-0 tb:pl-[45%] lp:pl-[50%] tb:pr-6">
            {/* Mobile-only title block (left panel is hidden on mobile) */}
            <div className="tb:hidden mb-10">
              <h1 className="font-display text-4xl text-black leading-[1.1] tracking-tight mb-4">
                Become a more effective thinker.
              </h1>
              <p className="text-ash text-base leading-relaxed">
                Tell us what you want to master. We&apos;ll build you a course of puzzles that train you to get there.
              </p>
            </div>

            <div className="lp:pl-[100px]">
              {/* Supporting label — teal mono, takes the place of the old "One match." setting */}
              <span
                className="font-mono text-[13px] lp:text-[14px] font-medium tracking-[0.24em] uppercase block mb-8"
                style={{ color: "#2D8FAD" }}
              >
                A quick story
              </span>

              {/* Typewriter puzzle animation */}
              <PuzzleTypewriter onReady={() => setPuzzleReady(true)} />

              {/* Editorial link — matches the typewriter's voice, scrolls to How-it-works */}
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
                      className="group inline-flex items-center gap-3 font-display italic text-primary text-xl lp:text-2xl hover:text-primary/70 transition-colors"
                    >
                      <span className="relative">
                        Find out why
                        <span className="absolute left-0 -bottom-0.5 w-full h-px bg-primary/40 group-hover:bg-primary transition-colors" />
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

          {/* Scroll indicator */}
          <div className="hidden lp:block absolute bottom-10 right-10 animate-float">
            <Image
              src="/images/icons8-down-arrow-100.png"
              width={30}
              height={30}
              alt="Scroll down"
              className="opacity-60"
            />
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section id="how-it-works" className="py-12 tb:py-16 px-6 bg-gradient-to-b from-white to-mist/30 scroll-mt-24">
        <div className="max-w-[1536px] mx-auto">
          <motion.span 
            className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-6 tb:mb-8"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            How DramaRama works
          </motion.span>

          <div className="flex flex-col lp:flex-row lp:gap-20">
            {/* LEFT: Steps justified evenly top-to-bottom, stretches to match GIF height */}
            <div className="flex-1 flex flex-col justify-between mb-12 lp:mb-0">
              {[
                {
                  step: "01",
                  title: "You set the goal",
                  desc: "Tell us what you want to become more effective at. Software engineering. Writing. Negotiation. Anything you want to think better about.",
                },
                {
                  step: "02",
                  title: "We build your course",
                  desc: "Eight puzzles tailored to your goal. Designed to train the thinking muscles you need.",
                },
                {
                  step: "03",
                  title: "You think through them",
                  desc: "One puzzle at a time. The puzzle is the gym. Your thinking is the workout. Your goal is what gets stronger.",
                },
              ].map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 30 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.15, duration: 0.6 }}
                  className="relative"
                >
                  <div>
                    <span className="font-mono text-2xl tb:text-3xl text-change/30 font-light block mb-3">
                      {item.step}
                    </span>
                    <h3 className="font-display text-2xl tb:text-3xl text-black mb-2 tb:mb-3">
                      {item.title}
                    </h3>
                    <p className="text-smoke text-base tb:text-lg leading-relaxed">
                      {item.desc}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* RIGHT: Demo GIF — top-aligned so bottom of GIF = bottom of step 03 */}
            <motion.div
              className="flex-shrink-0 lp:w-[45%] flex items-end justify-center"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.7 }}
            >
              <video
                autoPlay
                loop
                muted
                playsInline
                className="w-full max-w-[360px] tb:max-w-[440px] lp:max-w-none lp:w-full object-contain border-none outline-none"
                style={{ display: "block", lineHeight: 0, clipPath: "inset(2px)" }}
              >
                <source src="/hero-gif.mov" type="video/quicktime" />
                <source src="/hero-gif.mov" type="video/mp4" />
              </video>
            </motion.div>
          </div>
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

      {/* ── Puzzle Modal (removed in Phase 1) ── */}
      <AnimatePresence>
        {false && selectedPuzzle && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4 tb:p-6"
            onClick={() => setSelectedPuzzle(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-white max-w-2xl w-full max-h-[80vh] overflow-y-auto p-8 tb:p-12 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-start mb-6">
                <span className="font-mono text-xs text-change/60 tracking-widest">
                  {selectedPuzzle.number} · {selectedPuzzle.category}
                </span>
                <button 
                  onClick={() => setSelectedPuzzle(null)}
                  className="text-smoke hover:text-black transition-colors text-2xl leading-none"
                >
                  ×
                </button>
              </div>
              
              <h2 className="font-display text-2xl tb:text-3xl text-black mb-6">
                {selectedPuzzle.title}
              </h2>
              
              <div className="text-ash text-sm tb:text-base leading-relaxed whitespace-pre-line mb-8 tb:mb-10 text-left">
                {selectedPuzzle.text}
              </div>

              <div className="flex flex-col tb:flex-row gap-3 tb:gap-4">
                <SignedIn>
                  {(() => {
                    const existing = selectedPuzzle && getActiveSessionForPuzzle(selectedPuzzle);
                    if (existing) {
                      return (
                        <Link href={`/workspace?session=${existing.id}`} className="flex-1">
                          <Button
                            className="bg-black text-white w-full h-12 tb:h-14 text-base font-medium hover:bg-ash transition-colors"
                            radius="none"
                          >
                            Resume Existing Session
                          </Button>
                        </Link>
                      );
                    }
                    return (
                      <Link href={`/workspace?puzzle=${selectedPuzzle.id}`} className="flex-1">
                        <Button
                          className="bg-black text-white w-full h-12 tb:h-14 text-base font-medium hover:bg-ash transition-colors"
                          radius="none"
                        >
                          Start This Puzzle
                        </Button>
                      </Link>
                    );
                  })()}
                </SignedIn>
                <SignedOut>
                  <Link href="/login" className="flex-1">
                    <Button
                      className="bg-black text-white w-full h-12 tb:h-14 text-base font-medium hover:bg-ash transition-colors"
                      radius="none"
                    >
                      Get Started
                    </Button>
                  </Link>
                </SignedOut>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
            8 puzzles. One goal. See how your thinking changes.
          </p>
          <SignedIn>
            <Link href="/workspace">
              <Button
                className="bg-white text-black px-8 tb:px-10 h-12 tb:h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start Your Course
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/login">
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
