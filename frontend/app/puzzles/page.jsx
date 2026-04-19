"use client";

import React, { useEffect, useState } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import { SignedIn, SignedOut, useAuth } from "@clerk/nextjs";
import { motion, AnimatePresence } from "framer-motion";
import { PUZZLES } from "@/lib/puzzles";
import Footer from "@/components/Footer";

const ACTIVE_PUZZLE_IDS = ["whos-who", "top-10-list", "three-switches", "star-is-born"];

export default function PuzzlesPage() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [activeSessions, setActiveSessions] = useState([]);
  const [dupWarning, setDupWarning] = useState("");
  const { getToken, isSignedIn } = useAuth();

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

  // Check if user already has an active session for a puzzle
  function getActiveSessionForPuzzle(puzzle) {
    return activeSessions.find(
      (s) => s.problem_description?.includes(puzzle.title)
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pt-24 tb:pt-28 pb-16 px-6">
        <div className="max-w-[1536px] mx-auto">
        <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-4">
          The Puzzles
        </span>
        <h1 className="font-display text-2xl tb:text-3xl lp:text-4xl text-black mb-3">
          Pick a puzzle.
        </h1>
        <p className="text-smoke text-sm tb:text-base mb-12 tb:mb-16 max-w-lg">
          Classic thinking puzzles. Each one is trickier than it looks.
        </p>

        <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4 tb:gap-6">
          {PUZZLES.slice(0, 6).map((puzzle, i) => {
            const isActive = ACTIVE_PUZZLE_IDS.includes(puzzle.id);
            return (
              <motion.button
                key={puzzle.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
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
                    className={`font-display text-lg tb:text-xl text-black mt-2 mb-3 ${
                      isActive ? "group-hover:text-change transition-colors" : ""
                    }`}
                  >
                    {puzzle.title}
                  </h4>
                  <p className="text-smoke text-sm leading-relaxed line-clamp-2 italic">
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

              {dupWarning && (
                <div className="mb-4 border border-[#8B0000]/30 bg-[#8B0000]/5 px-5 py-3">
                  <p className="text-[#8B0000] text-sm">{dupWarning}</p>
                </div>
              )}

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
      </div>

      <Footer />
    </div>
  );
}
