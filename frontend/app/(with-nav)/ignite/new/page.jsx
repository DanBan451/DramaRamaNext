"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";

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
        if (!cancelled) setCourses(data.courses || []);
      } catch (e) {
        if (!cancelled) setError(e.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

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
      <div className="min-h-screen flex items-center justify-center">
        <CreativeSpinner label="Loading" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-32 pb-16 px-6">
      <div className="max-w-lg mx-auto">
        {presetCourseId && (
          <Link
            href={`/ignite?course_id=${encodeURIComponent(presetCourseId)}`}
            className="text-sm text-smoke hover:text-black mb-4 inline-block"
          >
            ← Back to active problems
          </Link>
        )}
        <h1 className="font-display text-3xl text-black mb-2">New Ignite problem</h1>
        <p className="text-smoke text-sm mb-8 leading-relaxed">
          Describe a real problem you are facing. We&apos;ll map terrain on the canvas
          and apply one of your Fire Starters from Forge.
        </p>
        {loading ? (
          <CreativeSpinner label="Loading goals" />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-mono uppercase text-smoke mb-1">
                Short title
              </label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full border border-mist rounded-md px-3 py-2 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-mono uppercase text-smoke mb-1">
                Description
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={6}
                className="w-full border border-mist rounded-md px-3 py-2 text-sm resize-none"
                required
              />
            </div>
            {presetCourseId ? (
              <div>
                <label className="block text-xs font-mono uppercase text-smoke mb-1">
                  Goal
                </label>
                <p className="text-sm text-black border border-mist rounded-md px-3 py-2 bg-mist/20">
                  {courses.find((c) => c.id === courseId)?.course_label ||
                    courses.find((c) => c.id === courseId)?.crisp_statement ||
                    "Selected goal"}
                </p>
              </div>
            ) : (
              <div>
                <label className="block text-xs font-mono uppercase text-smoke mb-1">
                  Goal
                </label>
                <select
                  value={courseId}
                  onChange={(e) => setCourseId(e.target.value)}
                  className="w-full border border-mist rounded-md px-3 py-2 text-sm bg-white"
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
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 rounded-md bg-change text-white font-semibold hover:bg-change/90 disabled:opacity-50"
            >
              {submitting ? "Igniting…" : "Ignite"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
