"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import GoalListCard from "@/components/goals/GoalListCard";
import {
  bodyClass,
  headlineLgClass,
  primaryCtaClass,
} from "@/components/goals/goalWorkspaceStyles";
import { readBackendErrorMessage } from "@/lib/read-backend-error";
import { writeCachedGoalTitle } from "@/lib/goal-title-cache";
import Footer from "@/components/Footer";

const READY_COURSE_STATUSES = new Set(["ready", "active", "completed"]);

async function fetchCardStats(courseId, headers) {
  try {
    const [puzzleRes, fsRes] = await Promise.all([
      fetch(`/api/backend-api/course/${courseId}/puzzles`, { headers }),
      fetch(
        `/api/backend-api/fire-starters?course_id=${encodeURIComponent(courseId)}`,
        { headers },
      ),
    ]);
    let puzzleCount = 0;
    let fireStarterCount = 0;
    if (puzzleRes.ok) {
      const data = await puzzleRes.json();
      puzzleCount = (data.puzzles || []).length;
    }
    if (fsRes.ok) {
      const data = await fsRes.json();
      fireStarterCount = Array.isArray(data) ? data.length : 0;
    }
    return { puzzleCount, fireStarterCount };
  } catch {
    return null;
  }
}

export default function GoalsPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [courses, setCourses] = useState([]);
  const [cardStats, setCardStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login?redirect=/goals");
    }
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;
    (async () => {
      try {
        setLoading(true);
        const token = await getToken();
        const res = await fetch("/api/backend-api/user/courses?limit=100", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const msg = await readBackendErrorMessage(
            res,
            `Failed to load goals (${res.status})`,
          );
          throw new Error(msg);
        }
        const data = await res.json();
        const list = data.courses || [];
        setCourses(list);
        for (const c of list) {
          const label =
            (c.course_label || "").trim() ||
            (c.crisp_statement || "").trim();
          if (label && c.id) writeCachedGoalTitle(c.id, label);
        }
        setError(null);
      } catch (e) {
        setError(e.message || "Failed to load goals.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  useEffect(() => {
    if (!courses.length || !isSignedIn) return;
    const readyCourses = courses.filter(
      (c) =>
        c.intake_status === "complete" &&
        READY_COURSE_STATUSES.has(c.course_status),
    );
    if (!readyCourses.length) {
      setCardStats({});
      return;
    }

    let cancelled = false;
    (async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };
      const pairs = await Promise.all(
        readyCourses.map(async (c) => {
          const stats = await fetchCardStats(c.id, headers);
          return [c.id, stats];
        }),
      );
      if (!cancelled) {
        setCardStats(
          Object.fromEntries(pairs.filter(([, stats]) => stats != null)),
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [courses, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Loading goals" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pb-16 pt-[calc(var(--navbar-height,5rem)+2.5rem)]">
        <div className="nav-shell">
          <header className="mb-12 flex flex-col gap-8 tb:flex-row tb:items-start tb:justify-between">
            <div className="min-w-0 max-w-4xl flex-1">
              <h1
                className={`${headlineLgClass} text-[clamp(2.5rem,5vw,4rem)] leading-[1.05] text-black`}
              >
                Your Goals
              </h1>
              <p
                className={`${bodyClass} mt-5 max-w-2xl text-[clamp(1.0625rem,1.15vw,1.25rem)]`}
              >
                Each goal is a workspace. Train in the Forge. Apply in Ignite.
              </p>
            </div>
            <Link href="/course/new" className={`${primaryCtaClass} shrink-0 self-start`}>
              New Goal
            </Link>
          </header>

          {error ? (
            <div className="rounded-xl border border-primary/20 bg-primary/5 py-16 text-center">
              <p className="mb-2 font-medium text-primary">
                Couldn&apos;t load your goals
              </p>
              <p className="text-sm text-smoke">{error}</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="mx-auto max-w-xl px-6 py-20 text-center">
              <h2 className={`${headlineLgClass} text-[clamp(2rem,3.5vw,2.75rem)]`}>
                Start with one goal.
              </h2>
              <p className={`${bodyClass} mx-auto mt-6 max-w-md`}>
                Pick one thing you want to get better at thinking through. We&apos;ll build a
                workspace for it — puzzles to train on, a canvas to apply what you learn.
              </p>
              <Link href="/course/new" className={`${primaryCtaClass} mt-10`}>
                Forge Your Mind →
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 tb:grid-cols-2 lp:grid-cols-3 [&>*]:h-full">
              {courses.map((c) => (
                <GoalListCard key={c.id} course={c} stats={cardStats[c.id]} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}
