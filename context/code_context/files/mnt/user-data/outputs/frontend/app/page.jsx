"use client";

import React from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";
import { PUZZLES } from "@/lib/puzzles";

export default function Home() {
  return (
    <div className="bg-white">
      {/* ── Hero ── */}
      <section className="min-h-screen flex flex-col justify-center px-6 relative overflow-hidden">
        {/* Subtle background texture */}
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, black 1px, transparent 0)`,
          backgroundSize: "32px 32px",
        }} />

        <motion.div
          className="max-w-3xl mx-auto relative z-10"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, ease: [0.25, 0.1, 0, 1] }}
        >
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-8">
            DramaRama
          </span>

          <h1 className="font-display text-5xl tb:text-6xl lp:text-7xl text-black mb-8 leading-[1.1]">
            Think through it.
          </h1>

          <p className="text-smoke text-lg lp:text-xl max-w-lg leading-relaxed mb-12">
            Pick a puzzle. An AI coach guides your thinking — invisibly — through
            proven frameworks. Your understanding builds in real time.
            The answer comes on its own.
          </p>

          <div className="flex flex-col tb:flex-row gap-4">
            <SignedIn>
              <Link href="/workspace">
                <Button
                  className="bg-black text-white w-full tb:w-auto px-10 h-14 text-base font-medium hover:bg-ash transition-colors"
                  radius="none"
                >
                  Start a Puzzle
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/login">
                <Button
                  className="bg-black text-white w-full tb:w-auto px-10 h-14 text-base font-medium hover:bg-ash transition-colors"
                  radius="none"
                >
                  Start a Puzzle
                </Button>
              </Link>
            </SignedOut>
          </div>
        </motion.div>
      </section>

      {/* ── How It Works ── */}
      <section className="py-32 px-6 border-t border-mist">
        <div className="max-w-4xl mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12">
            How It Works
          </span>

          <div className="grid lp:grid-cols-3 gap-16">
            {[
              {
                step: "01",
                title: "Pick a puzzle",
                desc: "Choose from carefully crafted thinking challenges. Each one is designed to push your mind in a specific way.",
              },
              {
                step: "02",
                title: "Think out loud",
                desc: "Share your thoughts in a conversation. An AI coach listens, asks the right questions, and guides you deeper — without giving you the answer.",
              },
              {
                step: "03",
                title: "Watch understanding build",
                desc: "A document grows in real time as you think. You see your own understanding take shape — structured, clear, yours.",
              },
            ].map((item, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, duration: 0.6 }}
              >
                <span className="font-mono text-xs text-smoke tracking-widest block mb-4">
                  {item.step}
                </span>
                <h3 className="font-display text-xl text-black mb-3">
                  {item.title}
                </h3>
                <p className="text-smoke text-sm leading-relaxed">
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Puzzle Preview ── */}
      <section className="py-32 px-6 bg-mist/30">
        <div className="max-w-4xl mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12">
            The Puzzles
          </span>

          <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4">
            {PUZZLES.slice(0, 6).map((puzzle, i) => (
              <motion.div
                key={puzzle.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-30px" }}
                transition={{ delay: i * 0.08, duration: 0.5 }}
                className="bg-white border border-mist p-6 min-h-[160px] flex flex-col justify-between"
              >
                <div>
                  <span className="font-mono text-[10px] text-smoke tracking-widest">
                    {puzzle.number}
                  </span>
                  <h4 className="font-display text-lg text-black mt-1 mb-2">
                    {puzzle.title}
                  </h4>
                  <p className="text-smoke text-xs leading-relaxed line-clamp-2">
                    {puzzle.text.split("\n")[0]}
                  </p>
                </div>
                <span className="text-[10px] font-mono text-smoke/40 uppercase tracking-wider mt-4">
                  {puzzle.category}
                </span>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA ── */}
      <section className="py-32 px-6 bg-black">
        <motion.div
          className="max-w-2xl mx-auto text-center"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.8 }}
        >
          <h2 className="font-display text-4xl lp:text-5xl text-white mb-6">
            Ready to think?
          </h2>
          <p className="text-white/50 text-lg mb-10">
            The puzzles are waiting. Your understanding is not.
          </p>
          <SignedIn>
            <Link href="/workspace">
              <Button
                className="bg-white text-black px-10 h-14 text-base font-medium hover:bg-white/90"
                radius="none"
              >
                Start a Puzzle
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/login">
              <Button
                className="bg-white text-black px-10 h-14 text-base font-medium hover:bg-white/90"
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
