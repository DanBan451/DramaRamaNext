"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";

function IgniteHomeInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const courseId = searchParams.get("course_id") || "";
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [problems, setProblems] = useState([]);
  const [courseLabel, setCourseLabel] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
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
        if (courseRes?.ok) {
          const c = await courseRes.json();
          const row = c.course || c;
          setCourseLabel(
            (row.course_label || row.crisp_statement || "").trim() || "this goal",
          );
        }
        if (!cancelled) {
          setProblems(probData.problems || []);
          setError(null);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to load Ignite problems.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, courseId]);

  if (!isLoaded || !isSignedIn) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CreativeSpinner label="Loading" />
      </div>
    );
  }

  const newHref = courseId
    ? `/ignite/new?course_id=${encodeURIComponent(courseId)}`
    : "/ignite/new";

  return (
    <div className="min-h-screen bg-white pt-32 pb-16 px-6">
      <div className="max-w-2xl mx-auto">
        {courseId ? (
          <Link
            href={`/goals/${courseId}`}
            className="text-sm text-smoke hover:text-black mb-4 inline-block"
          >
            ← Back to goal
          </Link>
        ) : (
          <Link
            href="/goals"
            className="text-sm text-smoke hover:text-black mb-4 inline-block"
          >
            ← Back to goals
          </Link>
        )}

        <h1 className="font-display text-3xl text-black mb-2">Ignite</h1>
        <p className="text-smoke text-sm mb-8 leading-relaxed">
          {courseId && courseLabel
            ? `Active problems for ${courseLabel}. Pick one to continue, or start a new one.`
            : "Your active real-world problems. Pick one to continue, or start a new one."}
        </p>

        {loading ? (
          <CreativeSpinner label="Loading problems" />
        ) : error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : (
          <>
            <div className="space-y-3 mb-8">
              {problems.length === 0 ? (
                <p className="text-sm text-smoke py-6 text-center border border-mist rounded-lg">
                  No active Ignite problems yet.
                </p>
              ) : (
                problems.map((p) => (
                  <Link
                    key={p.id}
                    href={`/ignite/${p.id}`}
                    className="block rounded-lg border border-mist bg-white p-4 hover:border-violet-400 hover:shadow-sm transition-all no-underline"
                  >
                    <h2 className="font-semibold text-black">{p.title}</h2>
                    <p className="text-sm text-smoke mt-1 line-clamp-2">
                      {p.description}
                    </p>
                    <p className="text-[10px] font-mono uppercase text-violet-700 mt-2 tracking-wider">
                      Continue →
                    </p>
                  </Link>
                ))
              )}
            </div>

            <Link
              href={newHref}
              className="inline-flex w-full items-center justify-center py-3 rounded-md bg-change text-white font-semibold hover:bg-change/90 no-underline"
            >
              Start a new problem →
            </Link>
          </>
        )}
      </div>
    </div>
  );
}

export default function IgniteHomePage() {
  return (
    <Suspense fallback={<CreativeSpinner label="Loading" />}>
      <IgniteHomeInner />
    </Suspense>
  );
}
