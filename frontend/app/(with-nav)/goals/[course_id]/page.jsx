"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import FireStartersLibrary from "@/components/goals/FireStartersLibrary";
import GoalWorkspaceModesSection from "@/components/goals/GoalWorkspaceModesSection";
import GoalWorkspaceRecentActivity from "@/components/goals/GoalWorkspaceRecentActivity";
import GoalWorkspaceHeader from "@/components/goal-workspace/GoalWorkspaceHeader";
import GoalWorkspaceShell from "@/components/goal-workspace/GoalWorkspaceShell";
import {
  GOAL_WORKSPACE_BACK,
  GOAL_WORKSPACE_SUPPORTING,
} from "@/components/goal-workspace/goalWorkspaceCopy";
import { readBackendErrorMessage } from "@/lib/read-backend-error";
import { readCachedGoalTitle, writeCachedGoalTitle } from "@/lib/goal-title-cache";

function courseHeadline(course) {
  return (
    (course?.course_label || "").trim() ||
    (course?.crisp_statement || "").trim() ||
    "Your goal"
  );
}

function buildRecentActivity(puzzles, igniteProblems) {
  const rows = [];

  for (const p of puzzles || []) {
    if (p.status === "in_progress") {
      rows.push({
        id: `puzzle-${p.id}`,
        href: `/canvas/${p.id}`,
        title: p.title || `Puzzle ${p.position}`,
        mode: "Forge · in progress",
        timestamp: new Date().toISOString(),
        sortMs: Date.now(),
      });
    } else if (p.status === "completed" && p.completed_at) {
      rows.push({
        id: `puzzle-${p.id}`,
        href: `/canvas/${p.id}`,
        title: p.title || `Puzzle ${p.position}`,
        mode: "Forge · completed",
        timestamp: p.completed_at,
        sortMs: new Date(p.completed_at).getTime(),
      });
    }
  }

  for (const prob of igniteProblems || []) {
    const ts = prob.created_at;
    if (!ts) continue;
    const active = (prob.user_thought_count || 0) > 0;
    rows.push({
      id: `ignite-${prob.id}`,
      href: `/ignite/${prob.id}`,
      title: prob.title || "Ignite puzzle",
      mode: active ? "Ignite · in progress" : "Ignite",
      timestamp: ts,
      sortMs: new Date(ts).getTime(),
    });
  }

  return rows
    .sort((a, b) => b.sortMs - a.sortMs)
    .slice(0, 8)
    .map(({ sortMs: _sortMs, ...rest }) => rest);
}

export default function GoalHubPage() {
  const params = useParams();
  const courseId = params?.course_id;
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [course, setCourse] = useState(null);
  const [fireStarters, setFireStarters] = useState(null);
  const [puzzles, setPuzzles] = useState([]);
  const [igniteProblems, setIgniteProblems] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [detailsLoading, setDetailsLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login?redirect=/goals/${courseId}`);
    }
  }, [isLoaded, isSignedIn, router, courseId]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !courseId) return;
    let cancelled = false;
    (async () => {
      try {
        setInitialLoading(true);
        setDetailsLoading(true);
        setError(null);
        const token = await getToken();
        const headers = { Authorization: `Bearer ${token}` };

        const courseRes = await fetch(`/api/backend-api/course/${courseId}`, { headers });
        if (!courseRes.ok) {
          throw new Error(
            await readBackendErrorMessage(courseRes, "Could not load goal"),
          );
        }
        const courseData = await courseRes.json();
        const row = courseData.course || courseData;

        if (!cancelled) {
          setCourse(row);
          writeCachedGoalTitle(courseId, courseHeadline(row));
          setInitialLoading(false);
        }

        const [fsRes, puzzleRes, igniteRes] = await Promise.all([
          fetch(
            `/api/backend-api/fire-starters?course_id=${encodeURIComponent(courseId)}`,
            { headers },
          ),
          fetch(`/api/backend-api/course/${courseId}/puzzles`, { headers }).catch(() => null),
          fetch(
            `/api/backend-api/ignite?course_id=${encodeURIComponent(courseId)}`,
            { headers },
          ).catch(() => null),
        ]);

        let fsList = [];
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          fsList = Array.isArray(fsData) ? fsData : [];
        }

        let puzzleList = [];
        if (puzzleRes?.ok) {
          const puzzleData = await puzzleRes.json();
          puzzleList = puzzleData.puzzles || [];
        }

        let igniteList = [];
        if (igniteRes?.ok) {
          const igniteData = await igniteRes.json();
          igniteList = igniteData.problems || [];
        }

        if (!cancelled) {
          setFireStarters(fsList);
          setPuzzles(puzzleList);
          setIgniteProblems(igniteList);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load goal.");
      } finally {
        if (!cancelled) {
          setDetailsLoading(false);
          setInitialLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, courseId, getToken]);

  const recentActivity = useMemo(
    () => buildRecentActivity(puzzles, igniteProblems),
    [puzzles, igniteProblems],
  );

  const cachedTitle = readCachedGoalTitle(courseId);
  const displayTitle = (course && courseHeadline(course)) || cachedTitle || "Your goal";

  if ((error || !course) && !cachedTitle && !initialLoading) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6 nav-shell">
        <p className="text-primary">{error || "Goal not found."}</p>
        <Link href="/goals" className="mt-4 inline-block text-sm text-[#2a2a2a] no-underline hover:underline">
          ← Back to goals
        </Link>
      </div>
    );
  }

  const intakeUnfinished =
    course?.intake_status === "draft" || course?.intake_status === "in_progress";
  const goalId = course?.id || courseId;
  const forgeHref = intakeUnfinished
    ? `/course/new?resume=${encodeURIComponent(goalId)}`
    : `/goals/${goalId}/ready`;
  const igniteHref = `/ignite?course_id=${encodeURIComponent(goalId)}`;
  const hasFireStarter = (fireStarters?.length || 0) > 0;
  const igniteDisabled = detailsLoading || !hasFireStarter || intakeUnfinished;
  const igniteDisabledTitle = intakeUnfinished
    ? "Finish intake to unlock Ignite."
    : !hasFireStarter
      ? "Forge a Fire Starter in a puzzle first."
      : undefined;

  const showLoading = !isLoaded || initialLoading || detailsLoading;

  return (
    <GoalWorkspaceShell
      header={
        <GoalWorkspaceHeader
          backHref="/goals"
          backLabel={GOAL_WORKSPACE_BACK.allGoals}
          goalTitle={displayTitle}
          supportingLine={GOAL_WORKSPACE_SUPPORTING.landing}
        />
      }
    >
      {showLoading ? (
        <div className="nav-shell flex min-h-[50vh] items-center justify-center">
          <CreativeSpinner label="Loading goal" />
        </div>
      ) : (
        <>
          <GoalWorkspaceModesSection
            forgeHref={forgeHref}
            igniteHref={igniteHref}
            igniteDisabled={igniteDisabled}
            igniteDisabledTitle={igniteDisabledTitle}
          />

          <div className="nav-shell">
            <FireStartersLibrary
              fireStarters={fireStarters}
              forgeHref={forgeHref}
              loading={fireStarters === null}
            />

            <GoalWorkspaceRecentActivity items={recentActivity} />
          </div>
        </>
      )}
    </GoalWorkspaceShell>
  );
}
