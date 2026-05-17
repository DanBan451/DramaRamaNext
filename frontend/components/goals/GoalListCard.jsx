"use client";

import Link from "next/link";
import { writeCachedGoalTitle } from "@/lib/goal-title-cache";
import {
  bodyClass,
  eyebrowClass,
  headlineLgClass,
  secondaryLinkClass,
  statLineClass,
} from "@/components/goals/goalWorkspaceStyles";

const GENERATING_STATUSES = new Set(["awaiting_puzzles", "generating"]);

function formatDate(iso) {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function readyTitle(course) {
  return (
    (course.course_label || "").trim() ||
    (course.crisp_statement || "").trim() ||
    "Goal"
  );
}

function intakeTitle(course) {
  const preview = (course.intake_preview || "").trim();
  const label = (course.course_label || "").trim();
  if (preview) return { text: preview, isPlaceholder: false };
  if (label) return { text: label, isPlaceholder: false };
  return {
    text: "Untitled goal — finish intake to name it",
    isPlaceholder: true,
  };
}

function cardState(course) {
  const intakeOpen =
    course.intake_status === "draft" || course.intake_status === "in_progress";
  if (intakeOpen) return "intake";
  if (GENERATING_STATUSES.has(course.course_status)) return "generating";
  return "ready";
}

function CardEyebrow({ state }) {
  if (state !== "intake") return null;
  return <p className={eyebrowClass}>Draft</p>;
}

function StatusPill({ children, className }) {
  return (
    <span
      className={`shrink-0 rounded-full px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[0.12em] ${className}`}
    >
      {children}
    </span>
  );
}

function CardShell({
  children,
  className,
  href,
  interactive = true,
  onPrepareNavigation,
}) {
  const base =
    "flex h-full min-h-[15rem] w-full flex-col rounded-xl p-6 shadow-sm transition-[box-shadow,transform] duration-200 no-underline text-inherit";
  const hover = interactive ? " hover:-translate-y-0.5 hover:shadow-lg" : "";

  if (href && interactive) {
    return (
      <Link
        href={href}
        prefetch
        className={`${base}${hover} ${className}`}
        onMouseEnter={onPrepareNavigation}
        onPointerDown={onPrepareNavigation}
        onFocus={onPrepareNavigation}
      >
        {children}
      </Link>
    );
  }

  return <article className={`${base} ${className}${hover}`}>{children}</article>;
}

function ReadyCard({ course, stats }) {
  const title = readyTitle(course);
  const date = formatDate(course.created_at);
  const puzzleN = stats?.puzzleCount;
  const fsN = stats?.fireStarterCount;
  const statsLine =
    puzzleN != null && fsN != null
      ? `${puzzleN} puzzle${puzzleN === 1 ? "" : "s"} · ${fsN} fire starter${fsN === 1 ? "" : "s"}`
      : null;

  const prepareNav = () => writeCachedGoalTitle(course.id, title);

  return (
    <CardShell
      href={`/goals/${course.id}`}
      onPrepareNavigation={prepareNav}
      className="border border-black/10 border-l-4 border-l-change bg-white"
    >
      <div className="mb-4 flex items-start justify-end gap-3">
        <StatusPill className="bg-primary/10 text-primary">Ready</StatusPill>
      </div>
      <h3 className={`${headlineLgClass} line-clamp-3 text-[1.375rem] leading-snug`}>
        {title}
      </h3>
      {statsLine ? <p className={`${statLineClass} mt-4`}>{statsLine}</p> : null}
      <span className={`${secondaryLinkClass} mt-auto pt-6 text-xs uppercase tracking-[0.14em]`}>
        Open workspace →
      </span>
      {date ? <p className="pt-4 font-mono text-xs text-smoke">{date}</p> : null}
    </CardShell>
  );
}

function IntakeCard({ course }) {
  const { text, isPlaceholder } = intakeTitle(course);
  const date = formatDate(course.created_at);
  const href = `/course/new?resume=${encodeURIComponent(course.id)}`;

  return (
    <CardShell
      href={href}
      className="border border-dashed border-mist border-l-4 border-l-smoke bg-white"
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <CardEyebrow state="intake" />
        <StatusPill className="bg-mist text-smoke">Intake open</StatusPill>
      </div>
      <h3
        className={`${headlineLgClass} line-clamp-3 text-[1.375rem] leading-snug ${
          isPlaceholder ? "text-smoke" : "text-black"
        }`}
      >
        {text}
      </h3>
      <p className={`${bodyClass} mt-4 text-[0.9375rem] italic text-[#4a4a4f]`}>
        Pick this back up to finalize and unlock your puzzles.
      </p>
      <span className={`${secondaryLinkClass} mt-auto pt-6 text-xs uppercase tracking-[0.14em]`}>
        Resume intake →
      </span>
      {date ? <p className="pt-4 font-mono text-xs text-smoke">{date}</p> : null}
    </CardShell>
  );
}

function GeneratingCard({ course }) {
  const title = readyTitle(course);
  const date = formatDate(course.created_at);

  return (
    <CardShell
      interactive={false}
      className="border border-sky-200 border-l-4 border-l-accent-blue bg-white"
    >
      <div className="mb-4 flex items-start justify-end gap-3">
        <StatusPill className="flex items-center gap-2 bg-sky-50 text-accent-blue">
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent-blue/50" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-accent-blue" />
          </span>
          Generating
        </StatusPill>
      </div>
      <h3 className={`${headlineLgClass} line-clamp-3 text-[1.375rem] leading-snug`}>
        {title}
      </h3>
      <p className={`${bodyClass} mt-4 text-[0.9375rem] text-[#4a4a4f]`}>
        Your puzzles are being built. This usually takes under a minute.
      </p>
      <div className="mt-5 flex-1" aria-hidden />
      {date ? <p className="mt-auto font-mono text-xs text-smoke">{date}</p> : null}
    </CardShell>
  );
}

export default function GoalListCard({ course, stats }) {
  const state = cardState(course);
  if (state === "intake") return <IntakeCard course={course} />;
  if (state === "generating") return <GeneratingCard course={course} />;
  return <ReadyCard course={course} stats={stats} />;
}
