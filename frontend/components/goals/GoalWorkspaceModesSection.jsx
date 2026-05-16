"use client";

import Link from "next/link";
import {
  bodyClass,
  eyebrowClass,
  headlineLgClass,
  primaryCtaClass,
} from "@/components/goals/goalWorkspaceStyles";

const WARM = "#fdfbf7";
const COOL = "#e8eaed";
const MID_A = "#ece8e2";
const MID_B = "#d4d8de";

const SECTION_MIN_H = "min-h-[clamp(20rem,38vh,26rem)]";

function DiagonalBg({ className, background }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 ${className}`}
      style={{ background }}
      aria-hidden
    />
  );
}

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
      <DiagonalBg
        className="md:hidden"
        background={`linear-gradient(
          180deg,
          ${WARM} 0%,
          ${WARM} calc(50% - 2.5rem),
          ${MID_A} calc(50% - 0.75rem),
          ${MID_B} calc(50% + 0.75rem),
          ${COOL} calc(50% + 2.5rem),
          ${COOL} 100%
        )`}
      />
      <DiagonalBg className="hidden md:block lp:hidden" background={tabletGrad} />
      <DiagonalBg className="hidden lp:block" background={desktopGrad} />
    </>
  );
}

function ModeColumn({
  align,
  eyebrow,
  title,
  description,
  href,
  ctaLabel,
  disabled,
  disabledTitle,
}) {
  const isRight = align === "right";
  const blockAlign = isRight ? "items-end text-right" : "items-start text-left";

  return (
    <div
      className={`flex w-full flex-col justify-center ${isRight ? "items-end" : "items-start"}`}
    >
      <div className={`flex max-w-[28rem] flex-col ${blockAlign}`}>
        <p className={eyebrowClass}>{eyebrow}</p>
        <h2 className={`${headlineLgClass} mt-3 text-[clamp(2.25rem,3.5vw,3rem)]`}>{title}</h2>
        <p className={`${bodyClass} mt-4 max-w-[28rem]`}>{description}</p>
        <div className="mt-10 pt-2 md:mt-12 md:pt-3">
          {disabled ? (
            <span
              className={`${primaryCtaClass} cursor-not-allowed opacity-45`}
              title={disabledTitle}
            >
              {ctaLabel}
            </span>
          ) : (
            <Link href={href} className={primaryCtaClass}>
              {ctaLabel}
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}

export default function GoalWorkspaceModesSection({
  forgeHref,
  igniteHref,
  igniteDisabled,
  igniteDisabledTitle,
}) {
  const forgeProps = {
    align: "left",
    eyebrow: "The Gym",
    title: "The Forge",
    description:
      "Train the mental muscles on puzzles built for this goal. Where Fire Starters are earned.",
    href: forgeHref,
    ctaLabel: "Enter the Forge →",
  };

  const igniteProps = {
    align: "right",
    eyebrow: "The Battlefield",
    title: "Ignite",
    description:
      "Use those muscles on real puzzles inside this goal. Where Fire Starters do work.",
    href: igniteHref,
    ctaLabel: "Open Ignite →",
    disabled: igniteDisabled,
    disabledTitle: igniteDisabledTitle,
  };

  return (
    <section
      aria-label="The Forge and Ignite modes for this goal"
      className="relative w-full overflow-hidden"
    >
      <div className={`relative w-full overflow-hidden ${SECTION_MIN_H}`}>
        <ModeBackgrounds />

        <div
          className={`relative z-10 nav-shell flex flex-col items-stretch justify-center gap-14 py-12 md:grid md:grid-cols-2 md:items-center md:gap-8 ${SECTION_MIN_H}`}
        >
          <ModeColumn {...forgeProps} />
          <ModeColumn {...igniteProps} />
        </div>
      </div>

      <div
        className="pointer-events-none h-10 w-full bg-gradient-to-b from-[#fdfbf7] to-white"
        aria-hidden
      />
    </section>
  );
}
