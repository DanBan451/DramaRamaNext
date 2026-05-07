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
  in_progress: "Intake in progress",
  complete: "Intake complete",
  abandoned: "Abandoned",
};

// Visible badge text + tailwind color classes for course_status.
const COURSE_BADGE = {
  awaiting_puzzles: { label: "Preparing", classes: "bg-mist text-smoke" },
  generating: { label: "Preparing", classes: "bg-mist text-smoke" },
  ready: { label: "Ready", classes: "bg-earth/10 text-earth" },
  active: { label: "In progress", classes: "bg-air/10 text-air" },
  completed: { label: "Completed ✓", classes: "bg-earth/15 text-earth" },
  generation_failed: {
    label: "Needs retry",
    classes: "bg-primary/10 text-primary",
  },
  abandoned: { label: "Abandoned", classes: "bg-mist text-smoke" },
};

// All course cards share a single Change-purple accent. We tried rotating
// element colors but the rotation isn't tied to anything semantic and
// confused users into thinking the colors meant difficulty / domain. The
// purple keeps the page lively while staying meaningful (Change = the
// quintessence; courses ARE about change).

export default function CoursesPage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login?redirect=/courses");
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
            `Failed to load courses (${res.status})`,
          );
          throw new Error(msg);
        }
        const data = await res.json();
        setCourses(data.courses || []);
        setError(null);
      } catch (e) {
        setError(e.message || "Failed to load courses.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Loading courses" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* pt-40 (was pt-24) gives the header room to breathe under the fixed
          navbar — user feedback was that the title felt squished. */}
      <div className="flex-1 pt-40 pb-16">
        <div className="max-w-[1536px] mx-auto px-6">
          {/* Header */}
          <div className="flex flex-col tb:flex-row tb:items-end tb:justify-between gap-6 mb-16">
            <div>
              <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-3">
                Your Courses
              </p>
              <h1 className="font-display text-4xl lp:text-5xl text-black tracking-tight">
                Becoming a more effective thinker <em className="italic">in</em>
              </h1>
            </div>
            <Button
              as={Link}
              href="/course/new"
              className="bg-primary text-white hover:bg-primary/90 font-medium"
              radius="none"
            >
              + New Course
            </Button>
          </div>

          {error ? (
            <div className="text-center py-16 bg-primary/5 border border-primary/20">
              <p className="text-primary font-medium mb-2">
                Couldn&apos;t load your courses
              </p>
              <p className="text-smoke text-sm">{error}</p>
            </div>
          ) : courses.length === 0 ? (
            <div className="text-center py-20 border-2 border-dashed border-change/30 bg-change/5 rounded-lg">
              <h3 className="font-display text-2xl text-black mb-2">
                No courses yet.
              </h3>
              <p className="text-smoke mb-8">
                Start with one sentence. We&apos;ll build puzzles that train it.
              </p>
              <Button
                as={Link}
                href="/course/new"
                className="bg-primary text-white hover:bg-primary/90 font-medium"
                radius="none"
              >
                Start Your First Course
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 tb:grid-cols-2 lp:grid-cols-3 gap-6">
              {courses.map((c) => (
                <CourseCard key={c.id} course={c} />
              ))}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

function CourseCard({ course }) {
  const title = course.crisp_statement || "Untitled course";

  // If intake is still happening, return to /course/new. Otherwise the ready
  // page handles every other course_status (loading, ready, failed, etc.).
  const dest =
    course.intake_status === "in_progress"
      ? "/course/new"
      : `/courses/${course.id}/ready`;

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

  return (
    <Link
      href={dest}
      className="group block bg-white border border-mist border-l-4 border-l-change bg-change/[0.03] hover:border-change p-6 transition-all hover:shadow-md hover:-translate-y-0.5 rounded-r-lg"
    >
      <div className="flex items-center justify-between gap-3 mb-3">
        <span className="text-[10px] font-mono tracking-[0.2em] uppercase text-smoke">
          {course.domain || "—"}
        </span>
        {badge ? (
          <span
            className={`text-[10px] font-mono tracking-[0.15em] uppercase px-2 py-1 ${badge.classes}`}
          >
            {badge.label}
          </span>
        ) : subStatus ? (
          <span className="text-[10px] font-mono tracking-[0.15em] uppercase text-smoke">
            {subStatus}
          </span>
        ) : null}
      </div>
      <h3 className="font-display text-xl text-black leading-snug mb-3 line-clamp-3 group-hover:text-change transition-colors">
        {title}
      </h3>
      <p className="text-xs text-smoke font-mono">{created}</p>
    </Link>
  );
}
