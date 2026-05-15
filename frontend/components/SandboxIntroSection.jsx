import React from "react";
import Link from "next/link";
import Image from "next/image";
import {
  marketingElementTileBoxClass,
  marketingMosaicImageTreatmentClass,
} from "@/lib/marketingElementTileBox";

const STEPS = [
  {
    n: "01",
    title: "We build the puzzles.",
    body: "12 puzzles made for your goal. Each one trains a way of thinking you'll need in your real work.",
  },
  {
    n: "02",
    title: "You think them through.",
    body: "You work the puzzles. The AI guides you with questions, not answers.",
  },
  {
    n: "03",
    title: "You name a lens.",
    body: "When something clicks, you name it. The lens you earn on a small puzzle is yours to carry — ready to look through when the real puzzle gets foggy.",
  },
];

/** Same drop treatment on every element tile (Think abstracts use varied shadows). */
const ELEMENT_TILE_SHADOW =
  "shadow-[0_6px_20px_rgba(0,0,0,0.12)] ring-1 ring-black/5 transition-shadow duration-200 group-hover:shadow-[0_8px_26px_rgba(0,0,0,0.16)]";

/** Subtitles only — element names removed per product direction. */
const ELEMENTS = [
  { id: "earth", src: "/images/elements/earth.png", subtitle: "Understand deeply." },
  { id: "fire", src: "/images/elements/fire.png", subtitle: "Make intentional mistakes." },
  { id: "air", src: "/images/elements/air.png", subtitle: "Raise the right questions." },
  { id: "water", src: "/images/elements/water.png", subtitle: "Follow the flow of ideas." },
  { id: "change", src: "/images/elements/quintessential.png", subtitle: "Become someone new." },
];

function StepBlockRow({ step }) {
  const title =
    "font-display text-[1.0625rem] font-bold leading-snug text-black tb:text-lg lp:text-xl";
  const body =
    "mt-1 font-sans text-sm leading-relaxed text-[#2a2d33] tb:text-[0.9375rem] tb:leading-relaxed lp:text-base";

  return (
    <article className="rounded-lg border border-black/10 bg-clarity/95 py-3.5 pl-4 pr-3 shadow-sm tb:py-4 tb:pl-5">
      <div className="flex gap-3.5 tb:gap-4">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-primary font-mono text-sm font-bold tabular-nums leading-none text-clarity shadow-sm tb:h-11 tb:w-11 tb:text-[0.9375rem]"
        >
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

/** Large square image + subtitle beneath; tile right-aligned in column. */
function ElementTile({ el, compact }) {
  const box = `${marketingElementTileBoxClass(compact ? "compact" : "desktop")} ${ELEMENT_TILE_SHADOW}`;

  return (
    <Link
      href="/framework"
      className="group flex max-w-full flex-col items-end gap-y-2 text-right outline-none focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 focus-visible:ring-offset-[#B8BCC2]"
    >
      <div className={box}>
        <Image
          src={el.src}
          alt={el.subtitle}
          fill
          quality={90}
          sizes="(max-width: 1023px) 30vw, 200px"
          className={`${marketingMosaicImageTreatmentClass} transition-[transform,opacity,filter] duration-300 ease-out group-hover:scale-[1.03]`}
        />
      </div>
      <p className="max-w-[min(100%,12rem)] font-sans text-sm leading-snug text-smoke tb:max-w-[14rem] tb:text-[0.9375rem] lp:text-base">
        {el.subtitle}
      </p>
    </Link>
  );
}

/** 2×2 + 1 — grid width capped and `ml-auto` so its **right edge** matches the nav-shell inner right (same band as navbar). */
function ElementsMosaic({ compact }) {
  const [a, b, c, d, e] = ELEMENTS;
  const gapX = "gap-x-[clamp(0.75rem,2.5vw,1.75rem)]";
  const gapY = "gap-y-[clamp(0.75rem,2vh,1.75rem)]";
  const gridW = compact ? "w-[min(100%,22rem)]" : "w-[min(100%,28rem)]";

  return (
    <div className={`flex min-h-0 w-full min-w-0 max-w-full flex-col items-stretch text-right ${compact ? "" : "h-full"}`}>
      <p className="mb-3 self-end font-mono text-xs font-medium uppercase tracking-[0.2em] text-accent-blue tb:mb-4 tb:text-[0.8125rem] lp:text-sm">
        The five muscles you train
      </p>
      <nav
        className={`ml-auto grid ${gridW} max-w-full shrink-0 auto-rows-auto grid-cols-2 ${gapX} ${gapY} justify-items-end ${compact ? "" : "min-h-0 flex-1 content-start"}`}
        aria-label="The five elements"
      >
        <ElementTile el={a} compact={compact} />
        <ElementTile el={b} compact={compact} />
        <ElementTile el={c} compact={compact} />
        <ElementTile el={d} compact={compact} />
        <div className="col-span-2 flex w-full justify-end pt-1">
          <ElementTile el={e} compact={compact} />
        </div>
      </nav>
    </div>
  );
}

function LeftColumnContent() {
  const eyebrow =
    "font-mono text-xs font-medium uppercase tracking-[0.2em] tb:text-[0.8125rem] lp:text-sm";
  const h2 =
    "font-display text-[clamp(1.65rem,3.2vw,2.35rem)] font-normal leading-[1.08] tracking-[-0.02em] text-black";
  const intro =
    "mt-3 max-w-[min(100%,38rem)] font-sans text-base leading-relaxed text-[#2a2d33] tb:mt-4 tb:text-[1.0625rem] lp:leading-[1.65]";
  /** Footnote-style — not a second “card”; reads apart from the numbered step blocks. */
  const attr =
    "mt-6 border-t border-black/10 pt-5 font-sans text-sm leading-relaxed text-[#4a5058] text-pretty tb:mt-7 tb:pt-6 tb:text-[0.9375rem] lp:leading-[1.6]";
  const stepGap = "gap-y-3.5 tb:gap-y-4";

  /** Same width as the Burger attribution block — flex stretch was ignoring max-width on the steps stack. */
  const proseBand = "w-[min(100%,42rem)] max-w-full";

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col items-start">
      <header className={`min-w-0 shrink-0 text-left ${proseBand}`}>
        <p className={`${eyebrow} mb-2 text-accent-blue`}>The Sandbox</p>
        <h2 id="sandbox-heading" className={h2}>
          A place to make up your mind.
        </h2>
        <p className={intro}>
          Most of us were taught that some people are simply better thinkers. That&apos;s not how it works.
          Effective thinking is a practice — a set of moves you can learn, train, and grow into. Edward B.
          Burger calls it <em className="not-italic font-medium text-void">Making Up Your Own Mind</em>. We built
          the Sandbox so you can practice it on the goal you&apos;re pursuing.
        </p>
        <p className={`${attr} w-full`}>
          Based on the work of Edward B. Burger —{" "}
          <em className="font-medium text-[#2a2d33]">The 5 Elements of Effective Thinking</em> and{" "}
          <em className="font-medium text-[#2a2d33]">Making Up Your Own Mind</em>. With deep gratitude.
        </p>
      </header>

      <div className={`mt-7 flex min-w-0 shrink-0 flex-col text-left ${proseBand} ${stepGap} tb:mt-8`}>
        <p className="sr-only">How the Sandbox works in three steps</p>
        {STEPS.map((step) => (
          <StepBlockRow key={step.n} step={step} />
        ))}
      </div>

      <footer
        className={`mt-[clamp(1.5rem,3vh,2.25rem)] min-w-0 shrink-0 pb-[clamp(0.25rem,1vh,0.5rem)] text-left tb:mt-8 ${proseBand}`}
      >
        <Link
          href="/course/new"
          className="group inline-flex w-full max-w-md items-center justify-center gap-3 bg-change px-10 py-4 text-clarity shadow-lg outline-none ring-1 ring-black/5 transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 focus-visible:ring-offset-[#B8BCC2] tb:py-[1.125rem] lp:max-w-sm lp:py-5"
        >
          <span className="text-center text-sm font-bold uppercase tracking-[0.14em]">
            Enter The Sandbox
          </span>
          <span
            aria-hidden
            className="text-sm font-bold uppercase tracking-[0.14em] transition-transform duration-200 group-hover:translate-x-1"
          >
            →
          </span>
        </Link>
      </footer>
    </div>
  );
}

export default function SandboxIntroSection() {
  /** Match Navbar (NextUI maxWidth="2xl"): `nav-shell` = max-w-[1536px] + horizontal px-6. */
  const verticalPad = "pt-[clamp(1.25rem,4vh,4rem)] pb-[clamp(1.25rem,3vh,3rem)]";

  const sectionH =
    "lp:h-[calc(100svh-var(--navbar-height))] lp:max-h-[calc(100svh-var(--navbar-height))] supports-[height:100dvh]:lp:h-[calc(100dvh-var(--navbar-height))] supports-[height:100dvh]:lp:max-h-[calc(100dvh-var(--navbar-height))]";

  return (
    <section
      id="the-sandbox"
      aria-labelledby="sandbox-heading"
      className={`snap-start w-full overflow-x-hidden border-t border-transparent bg-[#B8BCC2] ${sectionH} lp:overflow-hidden`}
    >
      {/* Desktop: same content width as navbar (`nav-shell`); 55 / 45 inside that band */}
      <div className="nav-shell box-border hidden h-full min-h-0 w-full min-w-0 lp:block">
        <div className="grid h-full min-h-0 min-w-0 grid-cols-[minmax(0,55%)_minmax(0,45%)] gap-x-[clamp(1.25rem,3vw,2.5rem)]">
          <div className={`flex h-full min-h-0 min-w-0 flex-col ${verticalPad}`}>
            <LeftColumnContent />
          </div>
          <div
            className={`flex h-full min-h-0 w-full min-w-0 max-w-full flex-col items-stretch overflow-x-hidden ${verticalPad}`}
          >
            <div className="flex w-full min-w-0 max-w-full flex-1 flex-col items-end justify-start overflow-x-hidden">
              <ElementsMosaic compact={false} />
            </div>
          </div>
        </div>
      </div>

      {/* Tablet & mobile */}
      <div className="nav-shell box-border flex min-h-0 w-full min-w-0 flex-col gap-8 py-10 tb:gap-10 tb:py-14 lp:hidden">
        <div className="min-w-0">
          <LeftColumnContent />
        </div>
        <div className="pt-0">
          <div className="flex w-full min-w-0 max-w-full justify-end">
            <ElementsMosaic compact />
          </div>
        </div>
      </div>
    </section>
  );
}
