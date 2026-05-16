"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import GoalWorkspaceHeader from "@/components/goal-workspace/GoalWorkspaceHeader";
import GoalWorkspaceShell from "@/components/goal-workspace/GoalWorkspaceShell";
import {
  GOAL_WORKSPACE_BACK,
  GOAL_WORKSPACE_SUPPORTING,
} from "@/components/goal-workspace/goalWorkspaceCopy";
import IgnitePuzzleCard from "@/components/goal-workspace/IgnitePuzzleCard";
import {
  bodyClass,
  bodyMutedClass,
  eyebrowClass,
  headlineLgClass,
  primaryCtaClass,
  sectionHeadlineClass,
} from "@/components/goals/goalWorkspaceStyles";
import { readCachedGoalTitle, writeCachedGoalTitle } from "@/lib/goal-title-cache";

const COMPLETED_STATUSES = new Set(["completed", "resolved"]);

function splitPuzzles(puzzles) {
  const active = [];
  const completed = [];
  for (const p of puzzles) {
    const st = (p.status || "active").toLowerCase();
    if (COMPLETED_STATUSES.has(st)) completed.push(p);
    else active.push(p);
  }
  return { active, completed };
}

function IgniteHomeInner() {
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id") || "";
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [puzzles, setPuzzles] = useState([]);
  const [courseLabel, setCourseLabel] = useState(() =>
    courseId ? readCachedGoalTitle(courseId) : "",
  );
  const [contentLoading, setContentLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setContentLoading(true);
        setError(null);
        const token = await getToken();
        const qs = courseId ? `?course_id=${encodeURIComponent(courseId)}` : "";
        const [probRes, courseRes] = await Promise.all([
          fetch(`/api/backend-api/ignite${qs}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          courseId
            ? fetch(`/api/backend-api/course/${courseId}`, {
                headers: { Authorization: `Bearer ${token}` },
              })
            : Promise.resolve(null),
        ]);
        if (!probRes.ok) throw new Error(`Failed to load (${probRes.status})`);
        const probData = await probRes.json();

        let label = courseId ? readCachedGoalTitle(courseId) : "";
        if (courseId && courseRes?.ok) {
          const c = await courseRes.json();
          const row = c.course || c;
          label =
            (row.course_label || row.crisp_statement || "").trim() || "Your goal";
          writeCachedGoalTitle(courseId, label);
        }

        if (!cancelled) {
          setPuzzles(probData.problems || []);
          if (courseId) setCourseLabel(label || "Your goal");
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load Ignite puzzles.");
      } finally {
        if (!cancelled) setContentLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, courseId]);

  const { active, completed } = useMemo(() => splitPuzzles(puzzles), [puzzles]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <CreativeSpinner label="Loading" />
      </div>
    );
  }

  const inGoalContext = Boolean(courseId);
  const goalTitle =
    courseLabel || (courseId ? readCachedGoalTitle(courseId) : "") || "Your goal";
  const newHref = courseId
    ? `/ignite/new?course_id=${encodeURIComponent(courseId)}`
    : "/ignite/new";
  const backHref = courseId ? `/goals/${courseId}` : "/goals";

  const igniteMain = (
    <>
      {inGoalContext ? <p className={`${eyebrowClass} mb-8`}>Ignite</p> : null}

      {contentLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <CreativeSpinner label="Loading Ignite" />
          </div>
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : puzzles.length === 0 ? (
          <div className="max-w-2xl rounded-xl border border-mist bg-mist/30 px-8 py-16">
            <h2 className={`${headlineLgClass} text-[clamp(1.5rem,2.5vw,1.75rem)]`}>
              Bring in a real puzzle.
            </h2>
            <p className={`${bodyClass} mt-6`}>
              {inGoalContext
                ? "You've trained in the Forge for this goal. Ignite is where you use what you earned. Describe a real puzzle you're facing inside this goal — the platform will map it, pull a Fire Starter you've earned, and apply it."
                : "Describe a real puzzle you're working through. The platform will map it and help you apply what you've trained."}
            </p>
            <Link href={newHref} className={`${primaryCtaClass} mt-10`}>
              Start a new puzzle →
            </Link>
          </div>
        ) : (
          <>
            <div className="mb-10 flex flex-wrap items-center gap-x-6 gap-y-4">
              <Link href={newHref} className={primaryCtaClass}>
                Start a new puzzle →
              </Link>
              <p className={`${bodyMutedClass} text-base not-italic`}>
                Or continue one below.
              </p>
            </div>

            {active.length > 0 ? (
              <section className="mb-16" aria-labelledby="ignite-active-heading">
                {!inGoalContext ? (
                  <>
                    <p className={eyebrowClass}>Active</p>
                    <h2 id="ignite-active-heading" className={`${sectionHeadlineClass} mt-3`}>
                      What you&apos;re working on.
                    </h2>
                  </>
                ) : null}
                <div
                  className={`grid grid-cols-1 gap-6 tb:grid-cols-2 lp:grid-cols-3 [&>*]:h-full ${inGoalContext ? "" : "mt-8"}`}
                >
                  {active.map((p, i) => (
                    <IgnitePuzzleCard key={p.id} problem={p} index={i} href={`/ignite/${p.id}`} />
                  ))}
                </div>
              </section>
            ) : null}

            {completed.length > 0 ? (
              <section aria-labelledby="ignite-completed-heading">
                <p className={eyebrowClass}>Completed</p>
                <h2 id="ignite-completed-heading" className={`${sectionHeadlineClass} mt-3`}>
                  Puzzles you&apos;ve worked through.
                </h2>
                <div className="mt-8 grid grid-cols-1 gap-6 tb:grid-cols-2 lp:grid-cols-3 [&>*]:h-full">
                  {completed.map((p, i) => (
                    <IgnitePuzzleCard key={p.id} problem={p} index={i} href={`/ignite/${p.id}`} />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
    </>
  );

  if (inGoalContext) {
    return (
      <GoalWorkspaceShell
        header={
          <GoalWorkspaceHeader
            backHref={backHref}
            backLabel={GOAL_WORKSPACE_BACK.modes}
            goalTitle={goalTitle}
            supportingLine={GOAL_WORKSPACE_SUPPORTING.ignite}
          />
        }
      >
        <div className="nav-shell">{igniteMain}</div>
      </GoalWorkspaceShell>
    );
  }

  return (
    <div className="min-h-screen bg-white pb-16 pt-[calc(var(--navbar-height,5rem)+2.5rem)]">
      <div className="nav-shell">
        <header className="mb-12 max-w-5xl">
          <Link
            href="/goals"
            className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-smoke no-underline transition-colors hover:text-[#2a2a2a]"
          >
            <span aria-hidden>←</span>
            <span>Goals</span>
          </Link>
          <h1 className={`${headlineLgClass} text-[clamp(3rem,6vw,4.5rem)] leading-[1.04]`}>
            Ignite
          </h1>
          <p className={`${bodyClass} mt-6 max-w-2xl`}>
            Your active real-world puzzles. Pick one to continue, or start a new one.
          </p>
          <div className="h-[clamp(5rem,10vh,6.25rem)]" aria-hidden />
        </header>
        {igniteMain}
      </div>
    </div>
  );
}

export default function IgniteHomePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen flex items-center justify-center bg-white">
          <CreativeSpinner label="Loading" />
        </div>
      }
    >
      <IgniteHomeInner />
    </Suspense>
  );
}
