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

  useEffect(() => {
    if (hasRun.current) return;
    hasRun.current = true;

    (async () => {
      // 1. Setting label
      await wait(600);
      setCursorAt("setting");
      await typeText(setSetting, "One afternoon. A college campus.", 55);
      await wait(900);

      // 2. Narrative
      setCursorAt("narrative");
      await typeText(setNarrative, "Two students crossed paths.", 42);
      await wait(650);
      await typeText(
        setNarrative,
        "Two students crossed paths.\nThey each had something to say about who they were.",
        36
      );
      await wait(1100);

      // 3. Student 1
      setCursorAt("none");
      setShowStudents(true);
      setS1Visible(true);
      await wait(500);
      setCursorAt("q1");
      await typeText(setQuote1, "\u201CI\u2019m a math major.\u201D", 44);
      await wait(900);

      // 4. Student 2
      setCursorAt("none");
      setS2Visible(true);
      await wait(500);
      setCursorAt("q2");
      await typeText(setQuote2, "\u201CI\u2019m a philosophy major.\u201D", 44);
      await wait(1400);

      // 5. Twist
      setCursorAt("twist");
      setTwistVisible(true);
      await wait(200);
      await typeText(setTwist, "At least one of them is lying.", 48);
      await wait(1600);

      // 6. Question
      setCursorAt("question");
      const qText = "So \u2014 what color hair does the math major actually have?";
      await typeText(setQuestion, qText, 40);
      await wait(300);
      setQuestionDone(true);

      // Cursor stays permanently on the question
      setCursorAt("question");
      onReady && onReady();
    })();
  }, [typeText, onReady]);

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
        {/* Setting */}
        <div
          className="font-mono text-[11px] font-medium tracking-[0.22em] uppercase mb-7 min-h-[16px] transition-opacity duration-400"
          style={{ color: "#5BCAE8", opacity: setting ? 1 : 0 }}
        >
          {setting}
          <Cursor color="#5BCAE8" visible={cursorAt === "setting"} />
        </div>

        {/* Narrative */}
        <div className="font-display text-[clamp(1.55rem,4.5vw,2.1rem)] font-bold text-black leading-[1.45] tracking-tight mb-9 min-h-[3rem] whitespace-pre-wrap">
          {narrative}
          <Cursor visible={cursorAt === "narrative"} />
        </div>

        {/* Students */}
        {showStudents && (
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
                <div className="font-mono text-[10px] font-medium tracking-[0.2em] uppercase text-[#bbb] mb-1">
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
                <div className="font-mono text-[10px] font-medium tracking-[0.2em] uppercase text-[#bbb] mb-1">
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

        {/* Twist */}
        <div
          className="font-display text-[clamp(1.1rem,3vw,1.4rem)] font-bold leading-[1.5] mt-8 mb-7 min-h-[1.5em] transition-opacity duration-500"
          style={{ color: "#E5393C", opacity: twistVisible ? 1 : 0 }}
        >
          {twist}
          <Cursor color="#E5393C" visible={cursorAt === "twist"} />
        </div>

        {/* Question */}
        <div className="font-display text-[clamp(1.25rem,3.8vw,1.75rem)] font-bold text-black leading-[1.45] tracking-tight min-h-[3rem]">
          {questionDone ? (
            <>
              So &mdash; what color hair does{" "}
              <span style={{ color: "#5BCAE8" }}>the math major</span> actually
              have?
            </>
          ) : (
            question
          )}
          <Cursor color="#5BCAE8" visible={cursorAt === "question"} />
        </div>
      </div>
    </>
  );
}
