"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import GoalWorkspaceHeader from "@/components/goal-workspace/GoalWorkspaceHeader";
import {
  GOAL_WORKSPACE_BACK,
  GOAL_WORKSPACE_SUPPORTING,
} from "@/components/goal-workspace/goalWorkspaceCopy";
import {
  bodyClass,
  eyebrowClass,
  primaryCtaClass,
  sectionHeadlineClass,
  statLineClass,
} from "@/components/goals/goalWorkspaceStyles";
import { readCachedGoalTitle, writeCachedGoalTitle } from "@/lib/goal-title-cache";

export default function IgniteNewPage() {
  return (
    <Suspense fallback={<CreativeSpinner label="Loading" />}>
      <IgniteNewInner />
    </Suspense>
  );
}

function IgniteNewInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetCourseId = searchParams.get("course_id") || "";
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [courseId, setCourseId] = useState(presetCourseId);
  const [error, setError] = useState(null);
  const [goalLabel, setGoalLabel] = useState(() =>
    presetCourseId ? readCachedGoalTitle(presetCourseId) : "",
  );

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/backend-api/user/courses?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (!cancelled) {
          const list = data.courses || [];
          setCourses(list);
          if (presetCourseId) {
            const row = list.find((c) => c.id === presetCourseId);
            if (row) {
              const label =
                (row.course_label || row.crisp_statement || "").trim() || "Your goal";
              setGoalLabel(label);
              writeCachedGoalTitle(presetCourseId, label);
            } else {
              const courseRes = await fetch(
                `/api/backend-api/course/${presetCourseId}`,
                { headers: { Authorization: `Bearer ${token}` } },
              );
              if (courseRes.ok) {
                const c = await courseRes.json();
                const course = c.course || c;
                const label =
                  (course.course_label || course.crisp_statement || "").trim() ||
                  "Your goal";
                setGoalLabel(label);
                writeCachedGoalTitle(presetCourseId, label);
              } else {
                setGoalLabel("Your goal");
              }
            }
          }
        }
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, presetCourseId]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !courseId) return;
    setSubmitting(true);
    setError(null);
    try {
      const token = await getToken();
      const res = await fetch("/api/backend-api/ignite", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title: title.trim(),
          description: description.trim(),
          course_id: courseId,
        }),
      });
      if (!res.ok) {
        const b = await res.json().catch(() => ({}));
        throw new Error(b.detail || `Failed (${res.status})`);
      }
      const data = await res.json();
      router.push(`/ignite/${data.ignite_problem_id}`);
    } catch (err) {
      setError(err.message || "Failed");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <CreativeSpinner label="Loading" />
      </div>
    );
  }

  const igniteBackHref = presetCourseId
    ? `/ignite?course_id=${encodeURIComponent(presetCourseId)}`
    : "/ignite";
  const selectedGoalName =
    goalLabel ||
    courses.find((c) => c.id === courseId)?.course_label ||
    courses.find((c) => c.id === courseId)?.crisp_statement ||
    "Selected goal";
  const presetGoalTitle =
    goalLabel ||
    (presetCourseId ? readCachedGoalTitle(presetCourseId) : "") ||
    "Your goal";

  return (
    <div className="min-h-screen bg-white pb-16 pt-[calc(var(--navbar-height,5rem)+2.5rem)]">
      <div className="nav-shell">
        {presetCourseId ? (
          <GoalWorkspaceHeader
            backHref={igniteBackHref}
            backLabel={GOAL_WORKSPACE_BACK.ignite}
            goalTitle={presetGoalTitle}
            supportingLine={GOAL_WORKSPACE_SUPPORTING.newPuzzle}
          />
        ) : (
          <header className="mb-12">
            <Link
              href="/ignite"
              className="mb-8 inline-flex items-center gap-1.5 text-sm font-medium text-smoke no-underline transition-colors hover:text-[#2a2a2a]"
            >
              <span aria-hidden>←</span>
              <span>Ignite</span>
            </Link>
            <div className="h-[clamp(5rem,10vh,6.25rem)]" aria-hidden />
          </header>
        )}

        <p className={eyebrowClass}>New puzzle</p>
        <h2 className={`${sectionHeadlineClass} mt-3`}>Bring in a real puzzle.</h2>
        <p className={`${bodyClass} mt-4 max-w-2xl`}>
          Describe what you&apos;re facing. We&apos;ll map the terrain and apply a Fire Starter
          you&apos;ve earned in the Forge.
        </p>

        {loading ? (
          <div className="mt-12 flex min-h-[30vh] items-center justify-center">
            <CreativeSpinner label={presetCourseId ? "Loading" : "Loading goals"} />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-10 max-w-[40rem] space-y-6">
            <div>
              <label className={`${statLineClass} mb-2 block`}>Short title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full rounded-md border border-mist px-4 py-3 font-sans text-base font-medium text-[#2a2a2a] focus:border-change focus:outline-none focus:ring-1 focus:ring-change"
                required
              />
            </div>
            <div>
              <label className={`${statLineClass} mb-2 block`}>Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full resize-none rounded-md border border-mist px-4 py-3 font-sans text-base font-medium leading-relaxed text-[#2a2a2a] focus:border-change focus:outline-none focus:ring-1 focus:ring-change"
                required
              />
            </div>
            {presetCourseId ? (
              <div>
                <label className={`${statLineClass} mb-2 block`}>Goal</label>
                <p className="inline-block max-w-full rounded-full bg-mist px-4 py-2 font-sans text-sm font-medium text-[#2a2a2a]">
                  {selectedGoalName}
                </p>
              </div>
            ) : (
              <div>
                <label className={`${statLineClass} mb-2 block`}>Goal</label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full rounded-md border border-mist bg-white px-4 py-3 font-sans text-base font-medium text-[#2a2a2a]"
                  required
                >
                  <option value="">Select a goal…</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.course_label || c.crisp_statement || c.id}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {error ? <p className="text-sm text-red-600">{error}</p> : null}
            <button
              type="submit"
              disabled={submitting}
              className={`${primaryCtaClass} disabled:opacity-50`}
            >
              {submitting ? "Igniting…" : "Ignite Puzzle →"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
