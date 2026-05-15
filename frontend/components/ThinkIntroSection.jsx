import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  marketingElementTileBoxClass,
  marketingMosaicImageTreatmentClass,
} from "@/lib/marketingElementTileBox";

/** Same matte field as Forge detail section (`#B8BCC2`). */
const SECTION_BG = "bg-[#B8BCC2]";

const THINK_ABSTRACT_SRCS = [
  "/abstracts-2/1dfad432-9642-47aa-8ac1-c54205b2547f.png",
  "/abstracts-2/2fc94388-36b3-4341-9d33-c2c77e7190cd.png",
  "/abstracts-2/5e8ccbcb-c107-43be-8b15-7371caaca5e5.png",
  "/abstracts-2/6d873211-75bb-4a30-ba46-26dbddbcc17c.png",
  "/abstracts-2/811422fa-b52a-48fc-bcf2-2dadb4938ea3.png",
  "/abstracts-2/a9006dca-a449-40f3-906c-f2dfa6cfe920.png",
  "/abstracts-2/b89f0982-67c9-45bd-bb04-9c225b8b3f7e.png",
  "/abstracts-2/c779e686-6201-44b5-92ab-8c112413de33.png",
  "/abstracts-2/d00ccebd-87de-4411-90b9-ce1b7803205e.png",
  "/abstracts-2/d3a23011-b868-4cf5-8900-e7e7a9afe878.png",
  "/abstracts-2/addedone.png",
];

/** Three vertical columns: 4 | 4 | 3 (same tile sizing as Forge element images). */
const THINK_ABSTRACT_COLUMNS = [
  THINK_ABSTRACT_SRCS.slice(0, 4),
  THINK_ABSTRACT_SRCS.slice(4, 8),
  THINK_ABSTRACT_SRCS.slice(8, 11),
];

/** Global index into `THINK_ABSTRACT_SRCS` for each column’s first cell. */
const THINK_COL_START = [0, 4, 8];

/** Decorative tiles only — keep shadows distinct but in the same value range. */
const THINK_TILE_SHADOWS = [
  "shadow-[0_4px_14px_rgba(0,0,0,0.12)]",
  "shadow-[0_8px_22px_-4px_rgba(26,26,26,0.18)]",
  "shadow-[6px_6px_0_0_rgba(0,0,0,0.05)]",
  "shadow-[0_12px_28px_-8px_rgba(0,0,0,0.16)]",
  "shadow-[0_2px_8px_rgba(0,0,0,0.08),0_10px_24px_-6px_rgba(0,0,0,0.12)]",
  "shadow-[4px_8px_16px_rgba(0,0,0,0.11)]",
  "shadow-[0_6px_18px_rgba(91,93,99,0.16)]",
  "shadow-[inset_0_0_0_1px_rgba(0,0,0,0.05),0_6px_16px_rgba(0,0,0,0.1)]",
  "shadow-[0_14px_32px_-10px_rgba(26,26,26,0.2)]",
  "shadow-[3px_3px_0_rgba(0,0,0,0.06),9px_9px_0_rgba(0,0,0,0.03)]",
  "shadow-[0_5px_16px_-3px_rgba(26,26,26,0.14)]",
];

const STEPS = [
  {
    n: "01",
    title: "You describe the real problem.",
    body: "Type the actual thing you\u2019re stuck on — the production bug, the parenting moment, the decision you can\u2019t make. Plain language.",
  },
  {
    n: "02",
    title: "The platform builds the terrain.",
    body: "The AI reads your problem and lays it out on a canvas as connected nodes: what you know, what you don\u2019t, what\u2019s uncertain. You start with structure, not a blank page.",
  },
  {
    n: "03",
    title: "A Fire Starter ignites.",
    body: "The platform pattern-matches your problem to a Forge puzzle you\u2019ve completed, pulls the Fire Starter you earned from it, and applies it to the terrain — adding tagged nodes that walk you down the flow of ideas that worked before. Then you think alongside it, with AI tools at your side.",
  },
];

function ThinkAbstractMosaic({ compact }) {
  const variant = compact ? "compact" : "desktop";
  const gapX = "gap-x-[clamp(0.75rem,2vw,1.5rem)]";
  const gapY = "gap-y-[clamp(0.75rem,2vh,1.75rem)]";

  return (
    <div
      className={`flex w-fit max-w-full flex-row flex-nowrap items-start ${gapX}`}
      aria-hidden
    >
      {THINK_ABSTRACT_COLUMNS.map((column, colIndex) => (
        <div key={colIndex} className={`flex min-w-0 flex-col items-start ${gapY}`}>
          {column.map((src, rowIndex) => {
            const i = THINK_COL_START[colIndex] + rowIndex;
            return (
              <div
                key={src}
                className={`${marketingElementTileBoxClass(variant)} ${THINK_TILE_SHADOWS[i % THINK_TILE_SHADOWS.length]}`}
              >
                <Image
                  src={src}
                  alt=""
                  fill
                  sizes="(max-width: 1023px) 30vw, 200px"
                  quality={90}
                  className={marketingMosaicImageTreatmentClass}
                />
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function ThinkStepRow({ step }) {
  const title =
    "font-display text-[1.0625rem] font-bold leading-snug text-black tb:text-lg lp:text-xl";
  const body =
    "mt-1 font-sans text-sm leading-relaxed text-[#2a2d33] tb:text-[0.9375rem] tb:leading-relaxed lp:text-base";

  return (
    <article className="w-full rounded-lg border border-black/10 bg-clarity/95 py-3.5 pl-4 pr-3 shadow-sm tb:py-4 tb:pl-5">
      <div className="flex w-full gap-3.5 tb:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold tabular-nums leading-none text-clarity shadow-sm tb:h-11 tb:w-11 tb:text-[0.9375rem]">
          {step.n}
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h3 className={title}>{step.title}</h3>
          <p className={body}>{step.body}</p>
        </div>
      </div>
    </article>
  );
}

function ThinkCopy() {
  const eyebrow =
    "font-mono text-xs font-medium uppercase tracking-[0.2em] tb:text-[0.8125rem] lp:text-sm";
  const h2 =
    "font-display text-[clamp(1.65rem,3.2vw,2.35rem)] font-normal italic leading-[1.08] tracking-[-0.02em] text-black";
  const intro =
    "mt-3 max-w-[min(100%,38rem)] font-sans text-base leading-relaxed text-[#2a2d33] tb:mt-4 tb:text-[1.0625rem] lp:leading-[1.65] text-pretty";
  const stepGap = "gap-y-3.5 tb:gap-y-4";

  const copyBand = "w-[min(100%,42rem)] max-w-full shrink-0";

  return (
    <div className={`relative z-10 flex min-w-0 flex-col items-stretch text-left ${copyBand}`}>
      <header className="w-full shrink-0 text-left">
        <p className={`${eyebrow} mb-2 text-accent-blue`}>IGNITE</p>
        <h2 id="ignite-heading" className={h2}>
          A place to use the muscle.
        </h2>
        <p className={`${intro} text-left`}>
          You trained in the Forge. You earned Fire Starters along the way. Ignite is where you bring a real
          problem inside your goal and let those weapons do work.
        </p>
      </header>

      <div className={`mt-7 flex w-full min-w-0 shrink-0 flex-col items-stretch ${stepGap} tb:mt-8`}>
        <p className="sr-only">How Ignite works in three steps</p>
        {STEPS.map((step) => (
          <ThinkStepRow key={step.n} step={step} />
        ))}
      </div>

      <p className="mt-8 max-w-[28rem] text-left font-sans text-sm italic leading-relaxed text-smoke tb:mt-10 tb:text-[0.9375rem]">
        Same practice. Real problem. Your Fire Starters do the cutting.
      </p>

      <footer className="mt-[clamp(1.5rem,3vh,2.25rem)] flex w-full shrink-0 flex-col items-stretch pb-[clamp(0.25rem,1vh,0.5rem)] tb:mt-8">
        <Link
          href="/courses"
          className="group self-start flex w-[min(100%,28rem)] max-w-full items-center justify-center gap-3 bg-change px-10 py-4 text-clarity shadow-lg outline-none ring-1 ring-black/5 transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 focus-visible:ring-offset-[#B8BCC2] tb:py-[1.125rem] lp:max-w-sm lp:py-5"
        >
          <span className="text-center text-base font-semibold tracking-tight">Open Ignite →</span>
        </Link>
      </footer>
    </div>
  );
}

export default function ThinkIntroSection() {
  const verticalPad =
    "pt-[clamp(1.25rem,4vh,3.5rem)] pb-[clamp(1.25rem,3vh,3rem)] lp:pt-[clamp(1.5rem,4.5vh,3.75rem)] lp:pb-[clamp(1.25rem,3vh,3rem)]";

  /** At least one viewport tall on desktop; no fixed max-height so three × four tall element tiles are not clipped. */
  const sectionH =
    "lp:min-h-[calc(100svh-var(--navbar-height))] supports-[height:100dvh]:lp:min-h-[calc(100dvh-var(--navbar-height))]";

  return (
    <section
      id="ignite-intro"
      aria-labelledby="ignite-heading"
      className={`relative snap-start w-full overflow-x-hidden border-t border-transparent ${SECTION_BG} ${sectionH}`}
    >
      {/* Desktop: left abstracts + right copy, inside `nav-shell` (same band as navbar). */}
      <div className="nav-shell relative z-10 box-border hidden w-full min-w-0 lp:block">
        <div className="grid min-w-0 grid-cols-[minmax(0,50%)_minmax(0,50%)] gap-x-[clamp(1rem,2.5vw,2rem)] items-start">
          <div
            className={`flex min-h-0 min-w-0 flex-col items-start justify-start overflow-x-hidden ${verticalPad}`}
          >
            <ThinkAbstractMosaic compact={false} />
          </div>
          <div
            className={`flex min-h-0 min-w-0 flex-col items-stretch justify-start overflow-x-hidden ${verticalPad}`}
          >
            {/* Match Forge right column: band is `ml-auto` / items-end so right edge = nav-shell inner right */}
            <div className="flex w-full min-w-0 max-w-full flex-col items-end justify-start overflow-x-hidden">
              <ThinkCopy />
            </div>
          </div>
        </div>
      </div>

      {/* Tablet & mobile: small mosaic on top, copy left-aligned below */}
      <div
        className={`nav-shell relative z-10 box-border flex min-h-0 w-full min-w-0 flex-col gap-8 lp:hidden ${verticalPad}`}
      >
        <ThinkAbstractMosaic compact />
        <div className="flex w-full min-w-0 justify-end">
          <ThinkCopy />
        </div>
      </div>
    </section>
  );
}
