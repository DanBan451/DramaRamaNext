"use client";

import Link from "next/link";
import {
  headlineLgClass,
  primaryLinkClass,
  statLineClass,
  tertiaryCtaClass,
} from "@/components/goals/goalWorkspaceStyles";

function StatusPill({ label, variant }) {
  const classes =
    variant === "resolved"
      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
      : "bg-mist text-smoke border border-mist";
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${classes}`}
    >
      {label}
    </span>
  );
}

function problemStatusLabel(problem, variant) {
  if (variant === "completed") return "Resolved";
  if ((problem.user_thought_count || 0) > 0) return "Active";
  if (problem.applied_fire_starter_id) return "Ready to explore";
  return "Active";
}

export default function IgniteProblemCard({ problem, index, variant = "active", href }) {
  const isCompleted = variant === "completed";
  const label = problemStatusLabel(problem, variant);
  const problemNum = index + 1;

  return (
    <article
      className={`flex flex-col rounded-xl border bg-white p-6 shadow-sm transition-[box-shadow,transform] duration-200 ${
        isCompleted
          ? "border-mist border-l-4 border-l-emerald-500"
          : "border-black/10 hover:-translate-y-0.5 hover:shadow-md"
      }`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className={statLineClass}>Problem {problemNum}</p>
        <StatusPill label={label} variant={isCompleted ? "resolved" : "default"} />
      </div>

      <h3 className={`${headlineLgClass} line-clamp-3 text-[1.375rem] leading-snug`}>
        {problem.title}
      </h3>
      <p className="mt-3 flex-1 font-sans text-base font-medium leading-[1.55] text-[#2a2a2a] line-clamp-3">
        {problem.description}
      </p>

      <div className="mt-6">
        {isCompleted ? (
          <Link href={href} className={tertiaryCtaClass}>
            Review →
          </Link>
        ) : (
          <Link href={href} className={`${primaryLinkClass} text-xs uppercase tracking-[0.14em]`}>
            Continue →
          </Link>
        )}
      </div>
    </article>
  );
}
