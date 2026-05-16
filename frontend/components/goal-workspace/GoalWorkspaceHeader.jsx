"use client";

import Link from "next/link";
import { bodyClass, goalTitleClass } from "@/components/goals/goalWorkspaceStyles";

/**
 * Persistent header for every page inside a goal workspace.
 * Goal title size and position stay identical across landing, Forge, Ignite, and new-puzzle flows.
 */
export default function GoalWorkspaceHeader({
  backHref,
  backLabel,
  goalTitle,
  supportingLine,
  className = "",
}) {
  return (
    <header className={`box-border w-full max-w-none ${className}`}>
      <Link
        href={backHref}
        className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-smoke no-underline transition-colors hover:text-[#2a2a2a]"
      >
        <span aria-hidden>←</span>
        <span>{backLabel}</span>
      </Link>

      <h1 className={`${goalTitleClass} w-full max-w-none`}>{goalTitle}</h1>

      {supportingLine ? (
        <p
          className={`${bodyClass} mt-6 max-w-3xl text-base tb:text-lg lp:text-xl`}
        >
          {supportingLine}
        </p>
      ) : null}

      <div className="h-[clamp(5rem,10vh,6.25rem)]" aria-hidden />
    </header>
  );
}
