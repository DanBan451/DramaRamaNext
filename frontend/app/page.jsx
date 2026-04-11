"use client";

import React, { useState, useRef } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion, AnimatePresence, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";
import { PUZZLES } from "@/lib/puzzles";

export default function Home() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
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
      {/* Hero Section with Original Design */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/header.png')" }}
        />

        {/* LEFT: B&W Mask */}
        <div className="absolute inset-0 w-1/3 lp:w-1/4 h-full backdrop-brightness-100 backdrop-saturate-0" />

        {/* RIGHT: Bright Mask */}
        <div className="absolute inset-y-0 right-0 w-2/3 lp:w-3/4 h-full backdrop-brightness-150" />

        {/* White overlay that fades in as you scroll */}
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none z-10"
          style={{ opacity: whiteOverlayOpacity }}
        />

        {/* Hero Content */}
        <motion.div
          className="relative z-20 h-full flex flex-col justify-end pb-16 lp:pb-20"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="max-w-[1536px] mx-auto px-6 w-full">
            <div className="lp:absolute lp:bottom-20 lp:left-1/4 lp:ml-10 mr-3 max-w-none">
              <h1 className="font-display text-3xl tb:text-5xl lp:text-6xl text-black mb-4 lp:mb-6 lp:max-w-[1000px] drop-shadow-sm italic">
                Understand Deeply.
              </h1>
              <p className="text-lg tb:text-xl lp:text-2xl text-black/80 lp:max-w-[800px] mb-6 lp:mb-8">
                Describe any problem you're facing. Our AI guides you to deeper 
                understanding through proven thinking frameworks.
              </p>
              <div className="flex flex-col tb:flex-row gap-4">
                <SignedIn>
                  <Link href="/workspace">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Exploring
                    </Button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/login">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Exploring
                    </Button>
                  </Link>
                </SignedOut>
                <Link href="/framework">
                  <Button 
                    className="bg-transparent border border-smoke text-black hover:bg-mist w-full tb:w-[220px] h-[64px] text-lg font-semibold hover:scale-105 transition-all"
                    radius="none"
                  >
                    Learn the Framework
                  </Button>
                </Link>
              </div>
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
      <section className="py-24 tb:py-32 px-6 bg-gradient-to-b from-white to-mist/30">
        <div className="max-w-[1536px] mx-auto">
          <motion.span 
            className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12 tb:mb-16"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
          >
            The Process
          </motion.span>

          <div className="grid tb:grid-cols-3 gap-8 tb:gap-12">
            {[
              {
                step: "01",
                title: "Choose a challenge",
                desc: "Select from carefully crafted thinking puzzles. Each one targets a specific cognitive skill.",
              },
              {
                step: "02",
                title: "Explore with guidance",
                desc: "An AI coach asks the right questions and guides you deeper — without giving you the answer.",
              },
              {
                step: "03",
                title: "Watch understanding grow",
                desc: "Your realizations build into a document in real time. Structured, clear, yours.",
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
                <div className="p-6 tb:p-8">
                  <span className="font-mono text-2xl tb:text-3xl text-change/30 font-light block mb-4">
                    {item.step}
                  </span>
                  <h3 className="font-display text-xl tb:text-2xl text-black mb-3 tb:mb-4">
                    {item.title}
                  </h3>
                  <p className="text-smoke text-sm tb:text-base leading-relaxed">
                    {item.desc}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── The Framework Section ── */}
      <section className="py-24 px-6 bg-mist">
        <div className="max-w-[1536px] mx-auto">
          <div className="grid lp:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
                The Framework
              </span>
              <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
                Invisible scaffolding for better thinking
              </h2>
              <p className="text-lg text-ash mb-6">
                Behind every conversation is the 5 Elements of Effective Thinking—a proven
                framework for developing deep understanding. But you'll never see it.
              </p>
              <p className="text-lg text-ash mb-8">
                The system invisibly applies the right thinking lens at the right moment,
                so you can focus on your problem, not on methodology.
              </p>
              <Link href="/framework">
                <Button 
                  className="bg-primary text-white hover:bg-primary/90 px-8 py-6 text-lg font-semibold"
                  radius="none"
                >
                  Explore the Framework
                </Button>
              </Link>
            </div>

            <div className="bg-white border border-mist rounded-xl p-8 shadow-lg">
              <div className="space-y-4">
                {[
                  { name: "Earth", emoji: "🌳", desc: "Ground your understanding" },
                  { name: "Fire", emoji: "🔥", desc: "Try and fail forward" },
                  { name: "Air", emoji: "💨", desc: "Question assumptions" },
                  { name: "Water", emoji: "🌊", desc: "See connections flow" },
                  { name: "Change", emoji: "🪨", desc: "Reflect on transformation" },
                ].map((element) => (
                  <div 
                    key={element.name}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gray-100/80 border border-gray-200 element-shimmer"
                  >
                    <div className="text-3xl grayscale opacity-70">{element.emoji}</div>
                    <div>
                      <div className="font-semibold text-black">{element.name}</div>
                      <div className="text-sm text-smoke">{element.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Puzzle Preview ── */}
      <section className="py-24 tb:py-32 px-6 bg-white">
        <div className="max-w-[1536px] mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12 tb:mb-16">
            The Puzzles
          </span>

          <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4 tb:gap-6">
            {PUZZLES.slice(0, 6).map((puzzle, i) => (
              <motion.button
                key={puzzle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                onClick={() => setSelectedPuzzle(puzzle)}
                className="group bg-white border border-mist hover:border-change/30 p-6 tb:p-8 min-h-[180px] tb:min-h-[200px] flex flex-col justify-between transition-all duration-300 hover:shadow-lg hover:-translate-y-1 text-left cursor-pointer"
              >
                <div>
                  <span className="font-mono text-[10px] text-change/60 tracking-widest">
                    {puzzle.number}
                  </span>
                  <h4 className="font-display text-lg tb:text-xl text-black mt-2 mb-3 group-hover:text-change transition-colors">
                    {puzzle.title}
                  </h4>
                  <p className="text-smoke text-sm leading-relaxed line-clamp-2">
                    {puzzle.text.split("\n")[0]}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-smoke/40 uppercase tracking-wider mt-4">
                  {puzzle.category}
                </span>
              </motion.button>
            ))}
          </div>
        </div>
      </section>

      {/* ── Puzzle Modal ── */}
      <AnimatePresence>
        {selectedPuzzle && (
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
              
              <div className="text-ash text-sm tb:text-base leading-relaxed whitespace-pre-line mb-8 tb:mb-10">
                {selectedPuzzle.text}
              </div>

              <div className="flex flex-col tb:flex-row gap-3 tb:gap-4">
                <SignedIn>
                  <Link href="/workspace" className="flex-1">
                    <Button
                      className="bg-black text-white w-full h-12 tb:h-14 text-base font-medium hover:bg-ash transition-colors"
                      radius="none"
                    >
                      Start This Puzzle
                    </Button>
                  </Link>
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
                <Link href="/framework" className="flex-1">
                  <Button
                    className="bg-transparent border border-black text-black w-full h-12 tb:h-14 text-base font-medium hover:bg-black/5 transition-colors"
                    radius="none"
                  >
                    Explore the Framework
                  </Button>
                </Link>
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
          <h2 className="font-display text-3xl tb:text-4xl lp:text-5xl text-white mb-4 tb:mb-6">
            Ready to think?
          </h2>
          <p className="text-white/50 text-base tb:text-lg mb-8 tb:mb-10 max-w-lg mx-auto">
            The puzzles are waiting. Your understanding is not.
          </p>
          <SignedIn>
            <Link href="/workspace">
              <Button
                className="bg-white text-black px-8 tb:px-10 h-12 tb:h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start a Puzzle
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/login">
              <Button
                className="bg-white text-black px-8 tb:px-10 h-12 tb:h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start a Puzzle
              </Button>
            </Link>
          </SignedOut>
        </motion.div>
      </section>

      <Footer />
    </div>
  );
}
