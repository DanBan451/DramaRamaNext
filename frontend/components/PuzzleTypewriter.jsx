"use client";

/**
 * PuzzleTypewriter
 * ────────────────
 * Animated typewriter that reveals the Who's Who puzzle
 * line-by-line with a persistent blinking cursor.
 * Adapted from the standalone HTML/CSS/JS demo into React
 * using the site's font stack (Instrument Serif / JetBrains Mono).
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import { motion } from "framer-motion";

// ── Timing helpers ──────────────────────────────────────────────────────────
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Blinking cursor ─────────────────────────────────────────────────────────
function Cursor({ color = "#111", visible = true }) {
  if (!visible) return null;
  return (
    <span
      className="inline-block align-text-bottom ml-[2px]"
      style={{
        width: 2,
        height: "1.1em",
        background: color,
        animation: "cursorBlink 1s step-end infinite",
      }}
    />
  );
}

// ── Main component ──────────────────────────────────────────────────────────
export default function PuzzleTypewriter({ onReady }) {
  // Text state for each section
  const [setting, setSetting] = useState("");
  const [narrative, setNarrative] = useState("");
  const [showStudents, setShowStudents] = useState(false);
  const [s1Visible, setS1Visible] = useState(false);
  const [s2Visible, setS2Visible] = useState(false);
  const [quote1, setQuote1] = useState("");
  const [quote2, setQuote2] = useState("");
  const [twist, setTwist] = useState("");
  const [twistVisible, setTwistVisible] = useState(false);
  const [question, setQuestion] = useState("");
  const [questionDone, setQuestionDone] = useState(false);

  // Which element currently has the cursor
  const [cursorAt, setCursorAt] = useState("none");

  const hasRun = useRef(false);

  // Typewriter: types text char by char, calling setter each tick
  const typeText = useCallback(async (setter, text, speed = 38) => {
    for (let i = 1; i <= text.length; i++) {
      setter(text.slice(0, i));
      await wait(speed + (Math.random() * 14 - 7));
    }
  }, []);

  // Typewriter: appends `addition` onto an existing `prefix` without re-typing the prefix
  const typeAppend = useCallback(async (setter, prefix, addition, speed = 38) => {
    for (let i = 1; i <= addition.length; i++) {
      setter(prefix + addition.slice(0, i));
      await wait(speed + (Math.random() * 14 - 7));
    }
  }, []);

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      // (Setting label removed — replaced by the "A quick story" eyebrow above the typewriter.)
      await wait(400);

      // 2. Narrative — three lines, accumulating
      const line1 = "A software engineer walks in. He says: \u201CI want to be a better debugger.\u201D";
      const line2 = "We hand him eight puzzles about engineers, code, and broken systems.";
      const line3 = "Two weeks later, he\u2019s a better debugger.";

      setCursorAt("narrative");
      await typeText(setNarrative, line1, 14);
      await wait(350);
      await typeAppend(setNarrative, `${line1}\n`, line2, 12);
      await wait(350);
      await typeAppend(setNarrative, `${line1}\n${line2}\n`, line3, 12);
      await wait(600);

      // 3. Twist (red)
      setCursorAt("twist");
      setTwistVisible(true);
      await wait(120);
      await typeText(setTwist, "None of the puzzles were about HIS code.", 18);
      await wait(600);

      // 4. Question (teal accent)
      setCursorAt("question");
      const qText = "Why did it work?";
      await typeText(setQuestion, qText, 16);
      await wait(150);
      setQuestionDone(true);

      // Cursor stays permanently on the question
      setCursorAt("question");
      onReady && onReady();
    })();
  }, [typeText, typeAppend, onReady]);

  return (
    <>
      {/* Inject cursor blink keyframes */}
      <style jsx global>{`
        @keyframes cursorBlink {
          0%, 100% { opacity: 1; }
          50% { opacity: 0; }
        }
      `}</style>

      <div className="w-full">
        {/* Setting slot removed — the eyebrow label above the typewriter serves this role now. */}

        {/* Narrative — lighter tone so it recedes behind the left pitch, but sized so it’s still readable */}
        <div className="font-display text-[clamp(1.6rem,4.2vw,2.1rem)] font-medium text-ash leading-[1.45] tracking-tight mb-8 min-h-[3rem] whitespace-pre-wrap">
          {narrative}
          <Cursor visible={cursorAt === "narrative"} />
        </div>

        {/* Students (legacy slot — hidden in current sequence) */}
        {false && showStudents && (
          <div className="mb-1 flex flex-col">
            {/* Student 1 — black hair */}
            <div
              className="flex items-center gap-4 py-[18px] border-t border-b border-[#f0f0f0] transition-all duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                opacity: s1Visible ? 1 : 0,
                transform: s1Visible ? "translateX(0)" : "translateX(-18px)",
              }}
            >
              <div className="w-[11px] h-[11px] rounded-full bg-[#1c1c1c] flex-shrink-0" />
              <div>
                <div className="font-mono text-[10px] font-medium tracking-[0.2em] uppercase text-[#888] mb-1">
                  Black hair
                </div>
                <div className="font-display text-[clamp(1rem,2.5vw,1.18rem)] italic text-black leading-[1.4] min-h-[1.4em]">
                  {quote1}
                  <Cursor visible={cursorAt === "q1"} />
                </div>
              </div>
            </div>

            {/* Student 2 — red hair */}
            <div
              className="flex items-center gap-4 py-[18px] border-b border-[#f0f0f0] transition-all duration-[550ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{
                opacity: s2Visible ? 1 : 0,
                transform: s2Visible ? "translateX(0)" : "translateX(-18px)",
              }}
            >
              <div className="w-[11px] h-[11px] rounded-full bg-[#E5393C] flex-shrink-0" />
              <div>
                <div className="font-mono text-[10px] font-medium tracking-[0.2em] uppercase text-[#888] mb-1">
                  Red hair
                </div>
                <div className="font-display text-[clamp(1rem,2.5vw,1.18rem)] italic text-black leading-[1.4] min-h-[1.4em]">
                  {quote2}
                  <Cursor visible={cursorAt === "q2"} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Twist — red accent (emotional hook), medium weight to sit under the headline */}
        <div
          className="font-display text-[clamp(1.2rem,3vw,1.5rem)] font-medium leading-[1.5] mt-6 mb-6 min-h-[1.5em] transition-opacity duration-500"
          style={{ color: "#E5393C", opacity: twistVisible ? 1 : 0 }}
        >
          {twist}
          <Cursor color="#E5393C" visible={cursorAt === "twist"} />
        </div>

        {/* Question — softened from pure black so it reads as supporting, but clearly legible */}
        <div className="font-display text-[clamp(1.35rem,3.6vw,1.75rem)] font-medium text-ash leading-[1.4] tracking-tight min-h-[2.5rem]">
          {questionDone ? (
            <>
              Why did <span style={{ color: "#2D8FAD" }}>it</span> work?
            </>
          ) : (
            question
          )}
          <Cursor color="#2D8FAD" visible={cursorAt === "question"} />
        </div>
      </div>
    </>
  );
}
