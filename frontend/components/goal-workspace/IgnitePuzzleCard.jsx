"use client";

import Link from "next/link";
import {
  headlineLgClass,
  secondaryLinkClass,
  statLineClass,
  tertiaryCtaClass,
} from "@/components/goals/goalWorkspaceStyles";

const COMPLETED_STATUSES = new Set(["completed", "resolved"]);

function deriveCardVariant(problem) {
  const st = (problem.status || "active").toLowerCase();
  if (COMPLETED_STATUSES.has(st)) return "completed";
  if ((problem.user_thought_count || 0) > 0) return "active";
  if (problem.applied_fire_starter_id) return "ready";
  return "active";
}

function StatusPill({ label, variant }) {
  const classes = {
    active: "bg-mist text-smoke border border-mist",
    ready: "bg-mist text-smoke border border-mist",
    resolved: "bg-emerald-50 text-emerald-800 border border-emerald-200",
  }[variant];

  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${classes}`}
    >
      {label}
    </span>
  );
}

function statusLabel(variant) {
  if (variant === "completed") return "Resolved";
  if (variant === "ready") return "Ready to explore";
  return "Active";
}

const CARD_SHELL = {
  active:
    "border border-black/10 border-l-4 border-l-primary bg-white hover:-translate-y-0.5 hover:shadow-md",
  ready:
    "border border-black/10 border-l-4 border-l-smoke bg-white hover:-translate-y-0.5 hover:shadow-md",
  completed:
    "border border-mist border-l-4 border-l-emerald-500 bg-mist/30",
};

export default function IgnitePuzzleCard({ problem, index, href }) {
  const variant = deriveCardVariant(problem);
  const puzzleNum = index + 1;
  const pillVariant =
    variant === "ready" ? "ready" : variant === "completed" ? "resolved" : "active";

  const ctaLabel = variant === "completed" ? "Review →" : "Continue →";
  const ctaClass =
    variant === "completed"
      ? tertiaryCtaClass
      : `${secondaryLinkClass} text-xs uppercase tracking-[0.14em]`;

  return (
    <Link
      href={href}
      className={`flex h-full min-h-[14rem] flex-col rounded-xl p-6 shadow-sm no-underline text-inherit transition-[box-shadow,transform] duration-200 ${CARD_SHELL[variant]}`}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <p className={statLineClass}>Puzzle {puzzleNum}</p>
        <StatusPill label={statusLabel(variant)} variant={pillVariant} />
      </div>

      <h3 className={`${headlineLgClass} line-clamp-3 text-[1.375rem] leading-snug`}>
        {problem.title}
      </h3>
      <p className="mt-3 flex-1 font-sans text-base font-medium leading-[1.55] text-[#2a2a2a] line-clamp-3">
        {problem.description}
      </p>

      <span className={`${ctaClass} mt-auto pt-6`}>{ctaLabel}</span>
    </Link>
  );
}
