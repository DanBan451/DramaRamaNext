"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import { readBackendErrorMessage } from "@/lib/read-backend-error";

function courseHeadline(course) {
  return (
    (course?.course_label || "").trim() ||
    (course?.crisp_statement || "").trim() ||
    "Your goal"
  );
}

export default function GoalHubPage() {
  const params = useParams();
  const courseId = params?.course_id;
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [course, setCourse] = useState(null);
  const [hasFireStarter, setHasFireStarter] = useState(false);
  const [loading, setLoading] = useState(true);
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
        setLoading(true);
        const token = await getToken();
        const [courseRes, fsRes] = await Promise.all([
          fetch(`/api/backend-api/course/${courseId}`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(
            `/api/backend-api/fire-starters?course_id=${encodeURIComponent(courseId)}`,
            { headers: { Authorization: `Bearer ${token}` } },
          ),
        ]);
        if (!courseRes.ok) {
          throw new Error(
            await readBackendErrorMessage(courseRes, "Could not load goal"),
          );
        }
        const courseData = await courseRes.json();
        let fs = false;
        if (fsRes.ok) {
          const fsData = await fsRes.json();
          fs = Array.isArray(fsData) && fsData.length > 0;
        }
        if (!cancelled) {
          setCourse(courseData.course || courseData);
          setHasFireStarter(fs);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Could not load goal.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, courseId, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Loading goal" />
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-white pt-32 px-6">
        <p className="text-primary">{error || "Goal not found."}</p>
        <Link href="/goals" className="mt-4 inline-block text-sm underline">
          ← Back to goals
        </Link>
      </div>
    );
  }

  const title = courseHeadline(course);
  const intakeUnfinished =
    course.intake_status === "draft" || course.intake_status === "in_progress";
  const forgeHref = intakeUnfinished
    ? `/course/new?resume=${encodeURIComponent(course.id)}`
    : `/goals/${course.id}/ready`;
  const igniteHref = `/ignite?course_id=${encodeURIComponent(course.id)}`;

  return (
    <div className="min-h-screen bg-white pt-40 pb-16">
      <div className="nav-shell max-w-2xl">
        <Link
          href="/goals"
          className="text-sm text-smoke hover:text-black mb-6 inline-block"
        >
          ← All goals
        </Link>
        <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-smoke mb-2">
          {course.domain || "Goal workspace"}
        </p>
        <h1 className="font-display text-4xl italic text-black leading-tight mb-10">
          {title}
        </h1>

        <div className="grid gap-4 sm:grid-cols-2">
          <Link
            href={forgeHref}
            className="group rounded-lg border-2 border-change/30 bg-white p-6 shadow-sm transition-[border-color,box-shadow] hover:border-change hover:shadow-md no-underline"
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-change mb-2">
              Train
            </p>
            <h2 className="font-display text-2xl text-black mb-2">The Forge</h2>
            <p className="text-sm text-smoke leading-relaxed">
              Practice puzzles built for this goal. Build thinking muscle before
              real situations.
            </p>
            <span className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-change group-hover:underline">
              Enter the Forge →
            </span>
          </Link>

          <Link
            href={igniteHref}
            className={`group rounded-lg border-2 p-6 shadow-sm no-underline transition-[border-color,box-shadow] ${
              hasFireStarter && !intakeUnfinished
                ? "border-violet-400/40 bg-white hover:border-violet-600 hover:shadow-md"
                : "border-mist bg-mist/20 pointer-events-none opacity-60"
            }`}
            aria-disabled={!hasFireStarter || intakeUnfinished}
            title={
              intakeUnfinished
                ? "Finish intake to unlock Ignite."
                : !hasFireStarter
                  ? "Forge a Fire Starter in a puzzle first."
                  : undefined
            }
          >
            <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-violet-700 mb-2">
              Apply
            </p>
            <h2 className="font-display text-2xl text-black mb-2">Ignite</h2>
            <p className="text-sm text-smoke leading-relaxed">
              Work through real problems with your Fire Starters on the canvas.
            </p>
            <span className="mt-4 inline-block font-mono text-xs uppercase tracking-wider text-violet-800 group-hover:underline">
              Open Ignite →
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
