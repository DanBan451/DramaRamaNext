"use client";

import Link from "next/link";
import { bodyClass, eyebrowClass, headlineLgClass } from "@/components/goals/goalWorkspaceStyles";

/**
 * Drill-in page header: back link on its own line, goal as context, mode name dominates.
 */
export default function ModeDrillInHeader({
  backHref,
  backLabel = "Goal",
  categoryLabel,
  goalTitle,
  modeName,
  modeDescription,
  className = "",
}) {
  const eyebrow = (categoryLabel || "").trim() || "Your goal";

  return (
    <header className={`mb-12 max-w-5xl ${className}`}>
      <Link
        href={backHref}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-smoke no-underline transition-colors hover:text-[#2a2a2a]"
      >
        <span aria-hidden>←</span>
        <span>{backLabel}</span>
      </Link>

      <p className={eyebrowClass}>{eyebrow}</p>
      <p
        className={`${headlineLgClass} mt-3 line-clamp-2 text-[clamp(1.375rem,1.75vw,1.75rem)] leading-snug`}
      >
        {goalTitle}
      </p>

      <h1
        className={`${headlineLgClass} mt-10 text-[clamp(3rem,6vw,4.5rem)] leading-[1.04]`}
      >
        {modeName}
      </h1>
      <p className={`${bodyClass} mt-6 max-w-2xl text-[clamp(1.0625rem,1.15vw,1.25rem)]`}>
        {modeDescription}
      </p>
    </header>
  );
}
