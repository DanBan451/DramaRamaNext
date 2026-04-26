"use client";

import React from "react";

/**
 * "How DramaRama Works" — four static step previews.
 *
 * Each step:
 *   number → mockup → title → caption
 *
 * Mockups are HTML/CSS/SVG (no raster images, no animation libs).
 * All colors come from existing tailwind tokens (earth, fire, air, water, change, smoke, mist).
 */

// ─── Reusable mockup primitives ──────────────────────────────────────────────

const MockShell = ({ children, ariaLabel, className = "", style = {} }) => (
  <div
    role="img"
    aria-label={ariaLabel}
    className={`bg-[#fafafa] border border-[#ececec] p-3 ${className}`}
    style={style}
  >
    {children}
  </div>
);

// ─── Mockup 1: Intake conversation ───────────────────────────────────────────

const IntakeMockup = () => (
  <MockShell
    ariaLabel="Example intake conversation showing a user stating their goal"
    className="w-full"
    style={{ height: "150px" }}
  >
    {/* AI bubble */}
    <div className="bg-mist px-3 py-2 max-w-[85%]">
      <span className="font-mono text-[8px] tracking-[0.22em] uppercase text-smoke/70 block mb-1">
        AI
      </span>
      <p className="font-display text-[12px] leading-[1.35] text-[#1a1a1a]">
        What do you want to become more effective at?
      </p>
    </div>

    {/* User reply, right-aligned, no bubble */}
    <div className="mt-3 ml-auto max-w-[80%] text-right">
      <span className="font-mono text-[8px] tracking-[0.22em] uppercase text-smoke/70 block mb-1">
        You
      </span>
      <p className="font-display italic text-[13px] leading-[1.35] text-[#1a1a1a]">
        I want to be a better debugger.
      </p>
    </div>
  </MockShell>
);

// ─── Mockup 2: Stack of 3 fanned puzzle cards ────────────────────────────────

const PuzzleCard = ({ num, title, dotClass, rotate, offsetX, offsetY, z }) => (
  <div
    className={`absolute left-1/2 top-1/2 bg-white border border-[#e5e5e5] px-3 py-2 shadow-sm`}
    style={{
      width: "200px",
      height: "60px",
      transform: `translate(-50%, -50%) translate(${offsetX}px, ${offsetY}px) rotate(${rotate}deg)`,
      zIndex: z,
    }}
  >
    <div className="flex items-start justify-between">
      <span className="font-mono text-[8px] tracking-[0.24em] uppercase text-smoke/80">
        {num}
      </span>
      <span className={`block w-[5px] h-[5px] rounded-full mt-[2px] ${dotClass}`} />
    </div>
    <p className="font-display text-[14px] leading-[1.2] text-[#1a1a1a] mt-1">
      {title}
    </p>
  </div>
);

const CourseMockup = () => (
  <MockShell
    ariaLabel="Example course showing three puzzle cards"
    className="w-full relative"
    style={{ height: "150px" }}
  >
    <PuzzleCard
      num="PUZZLE I"
      title="The Two Loops"
      dotClass="bg-earth"
      rotate={-4}
      offsetX={-22}
      offsetY={-18}
      z={1}
    />
    <PuzzleCard
      num="PUZZLE II"
      title="The Wrong Aisle"
      dotClass="bg-fire"
      rotate={1}
      offsetX={0}
      offsetY={0}
      z={2}
    />
    <PuzzleCard
      num="PUZZLE III"
      title="The Single Question"
      dotClass="bg-air"
      rotate={5}
      offsetX={22}
      offsetY={18}
      z={3}
    />
  </MockShell>
);

// ─── Mockup 3: Canvas with thoughts and a nudge ──────────────────────────────

const CanvasMockup = () => (
  <MockShell
    ariaLabel="Example canvas with two thoughts and a nudge"
    className="w-full relative"
    style={{ height: "230px" }}
  >
    {/* Mini puzzle header */}
    <div className="mb-1.5">
      <span className="font-mono text-[8px] tracking-[0.24em] uppercase text-smoke/80 block">
        PUZZLE II
      </span>
      <p className="font-display text-[14px] leading-tight text-[#1a1a1a]">
        The Two Loops
      </p>
    </div>
    <div className="h-px bg-[#e5e5e5] mb-3" />

    {/* Thought 1 */}
    <div className="flex items-baseline justify-between gap-2 relative">
      <p className="font-display italic text-[12px] leading-[1.35] text-[#1a1a1a] flex-1">
        Maybe the input is the problem.
      </p>
      <span className="font-mono italic text-[9px] text-smoke/80 flex-shrink-0">
        earth
      </span>
    </div>

    {/* Curved purple connector between thoughts */}
    <div className="relative h-[34px] my-1">
      <svg
        viewBox="0 0 200 34"
        preserveAspectRatio="none"
        className="absolute inset-0 w-full h-full"
        aria-hidden
      >
        <path
          d="M 30 0 C 30 14, 110 18, 110 34"
          fill="none"
          stroke="#9B5DE5"
          strokeOpacity="0.35"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
      </svg>
    </div>

    {/* Thought 2 */}
    <div className="flex items-baseline justify-between gap-2 pl-3">
      <p className="font-display italic text-[12px] leading-[1.35] text-[#1a1a1a] flex-1">
        What if one has an off-by-one error?
      </p>
      <span className="font-mono italic text-[9px] text-smoke/80 flex-shrink-0">
        fire
      </span>
    </div>

    {/* Coral nudge */}
    <div
      className="mt-3 pl-2.5 py-1"
      style={{ borderLeft: "2px solid rgba(232,93,4,0.4)" }}
    >
      <span
        className="font-mono text-[8px] tracking-[0.28em] uppercase block mb-0.5"
        style={{ color: "#E85D04" }}
      >
        NUDGE
      </span>
      <p
        className="font-display italic text-[11px] leading-[1.35]"
        style={{ color: "#E85D04" }}
      >
        What&apos;s the smallest input that breaks both?
      </p>
    </div>
  </MockShell>
);

// ─── Mockup 4: Course-complete summary ───────────────────────────────────────

const ElementBar = ({ label, pct, fillClass }) => (
  <div className="flex items-center gap-2">
    <span className="font-mono text-[8px] uppercase tracking-[0.2em] text-smoke/80 w-[34px] flex-shrink-0">
      {label}
    </span>
    <div className="flex-1 h-[4px] bg-mist relative">
      <div
        className={`h-full ${fillClass}`}
        style={{ width: `${pct}%` }}
      />
    </div>
  </div>
);

const SummaryMockup = () => (
  <MockShell
    ariaLabel="Example course-complete summary with element strength bars"
    className="w-full"
    style={{ height: "190px" }}
  >
    <span className="font-mono text-[8px] tracking-[0.24em] uppercase text-smoke/80 block">
      COURSE COMPLETE
    </span>
    <p className="font-display text-[15px] leading-tight text-[#1a1a1a] mb-2.5">
      Better Debugger
    </p>

    <div className="space-y-1.5 mb-3">
      <ElementBar label="earth" pct={80} fillClass="bg-earth" />
      <ElementBar label="fire" pct={60} fillClass="bg-fire" />
      <ElementBar label="air" pct={70} fillClass="bg-air" />
      <ElementBar label="water" pct={40} fillClass="bg-water" />
    </div>

    <p className="font-display italic text-[11px] leading-[1.4] text-ash">
      You started by trusting inputs. You ended by testing boundaries.
    </p>
  </MockShell>
);

// ─── Step block (number → mockup → title → caption) ──────────────────────────

const Step = ({ index, total, number, title, caption, children }) => (
  <div className="relative flex flex-col">
    {/* Horizontal connector to the next step (laptop+) */}
    {index < total - 1 && (
      <div
        aria-hidden
        className="hidden lp:block absolute top-[145px] -right-5 w-10 border-t border-dashed border-change/20"
      />
    )}
    {/* Vertical connector to the next step (mobile / tablet) */}
    {index < total - 1 && (
      <div
        aria-hidden
        className="lp:hidden absolute left-1/2 -bottom-12 w-0 h-10 border-l border-dashed border-change/20 -translate-x-1/2"
      />
    )}

    {/* Step number */}
    <span
      className="font-mono text-[11px] tracking-[0.28em] uppercase mb-3 block"
      style={{ color: "#9B5DE5" }}
    >
      {number}
    </span>

    {/* Mockup container — unified height so connectors align */}
    <div className="flex items-center justify-center mb-5">
      <div className="w-full max-w-[300px]">{children}</div>
    </div>

    {/* Title */}
    <h3 className="font-display text-[20px] tb:text-[22px] leading-tight text-[#1a1a1a] mb-2">
      {title}
    </h3>

    {/* Caption */}
    <p className="font-display italic text-[14px] leading-[1.5] text-smoke max-w-[320px]">
      {caption}
    </p>
  </div>
);

// ─── Main component ──────────────────────────────────────────────────────────

const STEPS = [
  {
    number: "STEP 01",
    title: "Tell us what to train.",
    caption:
      "A short conversation sharpens what you actually want to get better at.",
    Mockup: IntakeMockup,
  },
  {
    number: "STEP 02",
    title: "We build your course.",
    caption:
      "A course of puzzles. Each one trains a different muscle of effective thinking.",
    Mockup: CourseMockup,
  },
  {
    number: "STEP 03",
    title: "You think through them.",
    caption:
      "One puzzle at a time. Your thinking, on canvas. A nudge appears when you ask for one.",
    Mockup: CanvasMockup,
  },
  {
    number: "STEP 04",
    title: "See how you changed.",
    caption:
      "After the course, see how your thinking changed — and where to take it next.",
    Mockup: SummaryMockup,
  },
];

export default function HowItWorksSteps() {
  return (
    <div className="grid grid-cols-1 tb:grid-cols-2 lp:grid-cols-4 gap-y-14 gap-x-8 lp:gap-x-10">
      {STEPS.map((s, i) => {
        const M = s.Mockup;
        return (
          <Step
            key={s.number}
            index={i}
            total={STEPS.length}
            number={s.number}
            title={s.title}
            caption={s.caption}
          >
            <M />
          </Step>
        );
      })}

      {/* Vertical connectors — visible only on mobile/tablet stacked layout */}
      {/* (Each step on mobile/tablet sits in its own row; the gap-y-14 spacing
          provides the visual breathing room. A dashed vertical line is added
          via small decorative element under each step except the last.) */}
    </div>
  );
}
