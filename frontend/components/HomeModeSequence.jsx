import React from "react";
import Link from "next/link";

const WARM = "#fdfbf7";
const COOL = "#b8bcc2";
const MID_A = "#ece8e2";
const MID_B = "#cdd1d8";

const SECTION_MIN_H = "min-h-[clamp(50vh,54vh,60vh)]";

/** Soft diagonal (desktop ~112°) and slightly steeper (tablet ~99°); mobile uses vertical blend. */
function ModeBackgrounds() {
  const desktopGrad = `linear-gradient(
    112deg,
    ${WARM} 0%,
    ${WARM} calc(50% - 2.75rem),
    ${MID_A} calc(50% - 1.25rem),
    ${MID_B} calc(50% + 1.25rem),
    ${COOL} calc(50% + 2.75rem),
    ${COOL} 100%
  )`;

  const tabletGrad = `linear-gradient(
    99deg,
    ${WARM} 0%,
    ${WARM} calc(50% - 2.5rem),
    ${MID_A} calc(50% - 1rem),
    ${MID_B} calc(50% + 1rem),
    ${COOL} calc(50% + 2.5rem),
    ${COOL} 100%
  )`;

  return (
    <>
      <div
        className="pointer-events-none absolute inset-0 md:hidden"
        style={{
          background: `linear-gradient(
            180deg,
            ${WARM} 0%,
            ${WARM} calc(50% - 2.5rem),
            ${MID_A} calc(50% - 0.75rem),
            ${MID_B} calc(50% + 0.75rem),
            ${COOL} calc(50% + 2.5rem),
            ${COOL} 100%
          )`,
        }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden md:block lp:hidden"
        style={{ background: tabletGrad }}
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 hidden lp:block"
        style={{ background: desktopGrad }}
        aria-hidden
      />
    </>
  );
}

function OutlinedButton({ href, children, align }) {
  const base =
    "inline-flex w-fit items-center gap-2 border-2 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-[0.18em] outline-none transition-[border-color,background-color,color] duration-200 hover:border-change focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 tb:text-xs";
  const light =
    "border-black/80 text-black hover:border-change hover:bg-black/[0.04] focus-visible:ring-offset-[#fdfbf7]";
  const dark =
    "border-clarity/90 text-clarity hover:border-change hover:bg-white/10 focus-visible:ring-offset-[#b8bcc2]";
  return (
    <Link
      href={href}
      className={`${base} ${align === "right" ? "self-end" : "self-start"} ${align === "right" ? dark : light}`}
    >
      {children}
    </Link>
  );
}

export default function HomeModeSequence() {
  return (
    <section
      aria-labelledby="home-mode-two-modes-heading"
      className="relative w-full overflow-hidden"
      style={{
        background: `linear-gradient(180deg, #f4f1ec 0%, ${WARM} min(6vh, 3rem), ${WARM} 100%)`,
      }}
    >
      <div
        id="inside-your-goal"
        className="nav-shell scroll-mt-28 px-6 pb-10 pt-[clamp(2.5rem,6vh,4rem)] text-center md:pb-12 md:pt-[clamp(2.75rem,6vh,4.5rem)]"
      >
        <p className="font-mono text-[clamp(0.75rem,0.9vw,0.875rem)] font-medium uppercase tracking-[0.2em] text-accent-blue">
          Inside your goal
        </p>
        <h2
          id="home-mode-two-modes-heading"
          className="mx-auto mt-4 max-w-[36rem] font-display text-[clamp(1.65rem,2.8vw,2.5rem)] font-normal italic leading-[1.08] tracking-[-0.02em] text-black"
        >
          Two modes. One practice.
        </h2>
      </div>

      <div
        className={`relative w-full overflow-hidden ${SECTION_MIN_H}`}
        aria-label="Forge and Ignite: two modes inside your goal"
      >
        <ModeBackgrounds />

        <div className={`relative z-10 mx-auto box-border flex w-full max-w-[1536px] flex-col px-6 md:hidden ${SECTION_MIN_H}`}>
          <div className="flex flex-1 flex-col justify-start pb-10 pt-[clamp(1.5rem,4vh,3rem)]">
            <p className="font-mono text-[clamp(0.75rem,0.9vw,1rem)] font-medium uppercase tracking-[0.2em] text-ash">
              The Gym
            </p>
            <h3 className="mt-3 font-display text-[clamp(2rem,3vw,3.5rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-black">
              Forge
            </h3>
            <p className="mt-3 max-w-[22rem] font-sans text-[clamp(1.1rem,1.5vw,1.5rem)] font-medium leading-snug text-ash">
              Train the mental muscles on puzzles built for your goal.
            </p>
            <div className="mt-6">
              <OutlinedButton href="/course/new" align="left">
                Enter the Forge <span aria-hidden>→</span>
              </OutlinedButton>
            </div>
          </div>
          <div className="flex flex-1 flex-col items-end justify-end pb-[clamp(2rem,5vh,4rem)] pt-6 text-right">
            <p className="font-mono text-[clamp(0.75rem,0.9vw,1rem)] font-medium uppercase tracking-[0.2em] text-clarity/90">
              The Battlefield
            </p>
            <h3 className="mt-3 font-display text-[clamp(2rem,3vw,3.5rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-void">
              Ignite
            </h3>
            <p className="mt-3 max-w-[22rem] font-sans text-[clamp(1.1rem,1.5vw,1.5rem)] font-medium leading-snug text-void/85">
              Use those muscles on the real problem you&apos;re facing.
            </p>
            <div className="mt-6">
              <OutlinedButton href="/goals" align="right">
                Open Ignite <span aria-hidden>→</span>
              </OutlinedButton>
            </div>
          </div>
        </div>

        <div className={`relative z-10 mx-auto box-border hidden w-full max-w-[1536px] px-6 md:block ${SECTION_MIN_H}`}>
          <div className={`relative w-full ${SECTION_MIN_H}`}>
            <div className="absolute left-0 top-0 z-10 flex max-w-[min(100%,28rem)] flex-col items-start pr-[clamp(1rem,3vw,2.5rem)] pt-[clamp(2rem,5vh,4rem)] md:max-w-[46%] lp:max-w-[44%]">
              <p className="font-mono text-[clamp(0.75rem,0.9vw,1rem)] font-medium uppercase tracking-[0.2em] text-ash">
                The Gym
              </p>
              <h3 className="mt-3 font-display text-[clamp(2rem,3vw,3.5rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-black">
                Forge
              </h3>
              <p className="mt-3 font-sans text-[clamp(1.1rem,1.5vw,1.5rem)] font-medium leading-snug text-ash">
                Train the mental muscles on puzzles built for your goal.
              </p>
              <div className="mt-6">
                <OutlinedButton href="/course/new" align="left">
                  Enter the Forge <span aria-hidden>→</span>
                </OutlinedButton>
              </div>
            </div>

            <div className="absolute bottom-0 right-0 z-10 flex max-w-[min(100%,28rem)] flex-col items-end pb-[clamp(3rem,6vh,5rem)] pl-[clamp(1rem,3vw,2.5rem)] pt-8 text-right md:max-w-[46%] lp:max-w-[44%]">
              <p className="font-mono text-[clamp(0.75rem,0.9vw,1rem)] font-medium uppercase tracking-[0.2em] text-clarity/90">
                The Battlefield
              </p>
              <h3 className="mt-3 font-display text-[clamp(2rem,3vw,3.5rem)] font-normal italic leading-[0.96] tracking-[-0.02em] text-void">
                Ignite
              </h3>
              <p className="mt-3 font-sans text-[clamp(1.1rem,1.5vw,1.5rem)] font-medium leading-snug text-void/85">
                Use those muscles on the real problem you&apos;re facing.
              </p>
              <div className="mt-6">
                <OutlinedButton href="/goals" align="right">
                  Open Ignite <span aria-hidden>→</span>
                </OutlinedButton>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="nav-shell bg-[#fdfbf7] px-6 py-[clamp(1.75rem,4vh,3rem)] text-center">
        <p className="mx-auto max-w-[32rem] font-sans text-sm italic leading-relaxed text-smoke tb:text-base">
          Both modes live inside the goal you pick. You move between them as the work demands.
        </p>
      </div>

      <div
        className="pointer-events-none h-[min(10vh,5rem)] w-full bg-gradient-to-b from-[#fdfbf7] to-[#b8bcc2]"
        aria-hidden
      />
    </section>
  );
}
