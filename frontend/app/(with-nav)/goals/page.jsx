"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import CreativeSpinner from "@/components/CreativeSpinner";
import { readBackendErrorMessage } from "@/lib/read-backend-error";
import Footer from "@/components/Footer";

const STATUS_LABEL = {
  draft: "Intake not started",
  in_progress: "Intake · not finalized",
  complete: "Intake complete",
  abandoned: "Abandoned",
};

function intakeCourseHref(course) {
  const sid = course.intake_status;
  if (sid === "draft" || sid === "in_progress") {
    return `/course/new?resume=${encodeURIComponent(course.id)}`;
  }
  return `/goals/${course.id}/ready`;
}

/** Card title — never vague "Untitled" for unfinished drafts. */
function courseCardTitle(course) {
  const st = course.intake_status || "";
  const preview = (course.intake_preview || "").trim();
  const label = (course.course_label || "").trim();
  const crisp = (course.crisp_statement || "").trim();

  if (st === "complete") {
    return label || crisp || "Goal";
  }
  if (preview) return preview;
  if (st === "draft") return "Continue intake · not started yet";
  return "Continue intake · finish to unlock puzzles";
}

/** Status pill for finalized goals — matches course_status. */
const COURSE_BADGE = {
  awaiting_puzzles: { label: "Generating", classes: "bg-mist text-smoke" },
  generating: { label: "Generating", classes: "bg-mist text-smoke" },
  ready: { label: "Ready", classes: "bg-earth/10 text-earth" },
  active: { label: "In Progress", classes: "bg-air/10 text-air" },
  completed: { label: "Completed ✓", classes: "bg-earth/15 text-earth" },
  generation_failed: {
    label: "Needs retry",
    classes: "bg-primary/10 text-primary",
  },
  abandoned: { label: "Abandoned", classes: "bg-mist text-smoke" },
};

export default function GoalsPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [courses, setCourses] = useState([]);
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
        setCourses(data.courses || []);
        setError(null);
      } catch (e) {
        setError(e.message || "Failed to load goals.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Loading goals" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pt-40 pb-16">
        <div className="nav-shell">
          <div className="mb-10 flex flex-col gap-6 tb:flex-row tb:items-start tb:justify-between">
            <div className="max-w-2xl">
              <h1 className="font-display text-4xl italic leading-tight tracking-tight text-black lp:text-5xl">
                Your Goals
              </h1>
              <p className="mt-4 font-sans text-base leading-relaxed text-[#4a4a4f] tb:text-lg">
                Each goal is a workspace. Train in the Forge. Apply in Ignite.
              </p>
            </div>
            <Button
              as={Link}
              href="/course/new"
              className="shrink-0 self-start bg-primary text-white hover:bg-primary/90 font-semibold px-8 py-6 text-base"
              radius="none"
            >
              New Goal
            </Button>
          </div>

          {error ? (
            <div className="rounded-lg border border-primary/20 bg-primary/5 py-16 text-center">
              <p className="mb-2 font-medium text-primary">
                Couldn&apos;t load your goals
              </p>
              <p className="text-sm text-smoke">{error}</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="mx-auto max-w-lg rounded-lg border border-change/25 bg-white px-8 py-16 text-center shadow-sm">
              <h2 className="font-display text-3xl italic text-black">
                Start with one goal.
              </h2>
              <p className="mt-4 font-sans text-base leading-relaxed text-[#4a4a4f]">
                Pick one thing you want to get better at thinking through. The Forge will be built for it.
              </p>
              <Button
                as={Link}
                href="/course/new"
                className="mt-10 bg-primary text-white hover:bg-primary/90 font-semibold px-10 py-6 text-base"
                radius="none"
              >
                Forge Your Mind
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-6 tb:grid-cols-2 lp:grid-cols-3">
              {courses.map((c) => (
                <GoalWorkspaceCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function GoalWorkspaceCard({ course }) {
  const title = courseCardTitle(course);
  const hubHref = `/goals/${course.id}`;
  const isUnfinishedIntake =
    course.intake_status === "draft" ||
    course.intake_status === "in_progress";
  const created = course.created_at
    ? new Date(course.created_at).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "";

  const badge =
    course.intake_status === "complete"
      ? COURSE_BADGE[course.course_status]
      : null;
  const subStatus =
    course.intake_status === "complete"
      ? null
      : STATUS_LABEL[course.intake_status] || course.intake_status;

  const statusPillLabel = badge?.label || subStatus;
  const statusPillClasses = badge
    ? `${badge.classes} rounded-full px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider`
    : `rounded-full px-3 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider ${
        isUnfinishedIntake ? "bg-fire/10 text-fire" : "bg-mist text-smoke"
      }`;

  return (
    <Link
      href={hubHref}
      className={
        isUnfinishedIntake
          ? "flex flex-col rounded-r-lg border border-mist border-l-4 border-l-fire bg-white p-6 shadow-md transition-shadow hover:shadow-lg no-underline"
          : "flex flex-col rounded-r-lg border border-mist border-l-4 border-l-change bg-white p-6 shadow-md transition-shadow hover:shadow-lg no-underline"
      }
    >
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-smoke">
          {course.domain || "—"}
        </span>
        {statusPillLabel ? (
          <span className={statusPillClasses}>{statusPillLabel}</span>
        ) : null}
      </div>

      <h3 className="font-display text-xl font-semibold leading-snug text-black line-clamp-3 mb-1">
        {title}
      </h3>

      {isUnfinishedIntake && (
        <p className="mb-3 text-xs font-mono uppercase tracking-wide text-fire">
          No puzzles until you finalize this intake
        </p>
      )}

      <p className="mt-auto text-xs font-mono text-change uppercase tracking-wider">
        Open workspace →
      </p>
      {created ? (
        <p className="mt-2 text-xs font-mono text-smoke">{created}</p>
      ) : null}
    </Link>
  );
}
