"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import CreativeSpinner from "@/components/CreativeSpinner";
import { Button } from "@nextui-org/button";
import FireStartersLibrary from "@/components/goals/FireStartersLibrary";
import {
  forgeCompletedPillClass,
  FORGE_COMPLETED,
  primaryCtaClass,
  tertiaryCtaClass,
} from "@/components/goals/goalWorkspaceStyles";

const ROTATING_PHRASES = [
  "Reading what you said.",
  "Listening for what you actually need.",
  "Sketching puzzles.",
  "Tightening the logic of each one.",
  "Almost there.",
];

// Puzzle cards on the Ready screen are intentionally generic. Earlier we
// tinted each card by its `primary_element` (earth/fire/air/water/synthesis),
// but that leaked which element the puzzle was designed to train — the user
// is supposed to discover that themselves on the canvas. The element identity
// is only revealed inside Stage 2 (Redirect). So: no per-element color, no
// per-element chip, no element-specific copy.

const TERMINAL_STATUSES = new Set([
  "ready",
  "active",
  "completed",
  "generation_failed",
  "abandoned",
]);

/** Sentence-case first character without lowercasing the rest */
function sentenceCasePhrase(s) {
  const t = (s || "").trim();
  if (!t) return t;
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/**
 * Phrase shown after “Becoming a more effective thinker in”.
 * Prefer short `course_label` (matches intake UI). Older rows used only a
 * long crisp_statement often starting “You want to…”, which must not repeat
 * after “…in ”.
 */
function courseHeadlineInPhrase(course) {
  const label = (course?.course_label || "").trim();
  if (label) return label;

  let c = (course?.crisp_statement || "").trim();
  if (!c) return "Your course";

  c = c
    .replace(
      /^i\s+want\s+to\s+think\s+more\s+effectively\s+in\s+/i,
      "",
    )
    .trim();
  c = c.replace(/^you\s+want\s+to\s+/i, "").trim();
  c = c.replace(/^you\s+want\s+/i, "").trim();
  if (!c) return "Your course";

  c = sentenceCasePhrase(c);
  if (c.length > 160) {
    const cut = c.slice(0, 157).replace(/\s+\S*$/, "");
    return `${cut}…`;
  }
  return c;
}

export default function CourseReadyPage() {
  const router = useRouter();
  const params = useParams();
  const courseId = params?.course_id;
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [course, setCourse] = useState(null);
  const [puzzles, setPuzzles] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [retrying, setRetrying] = useState(false);
  const [phraseIndex, setPhraseIndex] = useState(0);

  const streamCancelRef = useRef(null);

  // Auth gate
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace(`/login?redirect=/courses/${courseId}/ready`);
    }
  }, [isLoaded, isSignedIn, router, courseId]);

  // Initial load + streaming setup
  useEffect(() => {
    if (!isLoaded || !isSignedIn || !courseId) return;
    let cancelled = false;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/backend-api/course/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          throw new Error(`Failed to load course (${res.status})`);
        }
        const data = await res.json();
        if (cancelled) return;
        setCourse(data.course);

        const status = data.course?.course_status;
        if (status === "ready" || status === "active" || status === "completed") {
          await loadPuzzles();
        } else if (!TERMINAL_STATUSES.has(status)) {
          // Open SSE stream for live status updates
          openStatusStream();
        }
      } catch (e) {
        if (!cancelled) setLoadError(e.message || "Failed to load course.");
      }
    })();

    return () => {
      cancelled = true;
      if (streamCancelRef.current) {
        streamCancelRef.current();
        streamCancelRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn, courseId]);

  // Rotate the loading phrase every ~4s while we're in a non-terminal state
  useEffect(() => {
    const status = course?.course_status;
    if (!status || TERMINAL_STATUSES.has(status)) return;
    const id = setInterval(() => {
      setPhraseIndex((i) => (i + 1) % ROTATING_PHRASES.length);
    }, 4000);
    return () => clearInterval(id);
  }, [course?.course_status]);

  async function loadPuzzles() {
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend-api/course/${courseId}/puzzles`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`Failed to load puzzles (${res.status})`);
      }
      const data = await res.json();
      setPuzzles(data.puzzles || []);
    } catch (e) {
      setLoadError(e.message || "Failed to load puzzles.");
    }
  }

  async function openStatusStream() {
    // Cancel any prior stream
    if (streamCancelRef.current) streamCancelRef.current();

    const controller = new AbortController();
    streamCancelRef.current = () => controller.abort();

    try {
      const token = await getToken();
      const res = await fetch(
        `/api/backend-api/course/${courseId}/status-stream`,
        {
          headers: { Authorization: `Bearer ${token}` },
          signal: controller.signal,
        },
      );
      if (!res.ok || !res.body) {
        throw new Error(`Status stream failed (${res.status})`);
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let leftover = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = leftover + decoder.decode(value, { stream: true });
        const events = chunk.split("\n\n");
        leftover = events.pop() || "";

        for (const evt of events) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.course_status) {
              setCourse((prev) => ({
                ...(prev || {}),
                course_status: obj.course_status,
                generation_error: obj.generation_error ?? null,
              }));
              if (obj.course_status === "ready") {
                controller.abort();
                await loadPuzzles();
                return;
              }
              if (obj.course_status === "generation_failed") {
                controller.abort();
                return;
              }
            }
          } catch (e) {
            console.warn("Bad SSE payload:", payload, e);
          }
        }
      }
    } catch (e) {
      if (e.name === "AbortError") return;
      console.error("Status stream error", e);
    }
  }

  async function handleRetry() {
    if (retrying) return;
    setRetrying(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/backend-api/course/${courseId}/retry-generation`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Retry failed (${res.status}): ${body.slice(0, 200)}`);
      }
      // Optimistically reset to generating; the SSE stream will confirm.
      setCourse((prev) =>
        prev
          ? { ...prev, course_status: "generating", generation_error: null }
          : prev,
      );
      setPuzzles(null);
      await openStatusStream();
    } catch (e) {
      setLoadError(e.message || "Retry failed.");
    } finally {
      setRetrying(false);
    }
  }

  if (!isLoaded || !course) {
    if (loadError) return <ErrorScreen message={loadError} />;
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Loading course" />
      </div>
    );
  }

  const status = course.course_status;
  const headlinePhrase = courseHeadlineInPhrase(course);

  if (status === "generation_failed") {
    return (
      <FailureView
        course={course}
        onRetry={handleRetry}
        retrying={retrying}
      />
    );
  }

  if (status === "ready" || status === "active" || status === "completed") {
    if (!puzzles) {
      return (
        <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
          <CreativeSpinner label="Loading puzzles" />
        </div>
      );
    }
    return (
      <ReadyView
        headlinePhrase={headlinePhrase}
        puzzles={puzzles}
        courseId={courseId}
        getToken={getToken}
      />
    );
  }

  // generating | awaiting_puzzles
  return <LoadingView headlinePhrase={headlinePhrase} phrase={ROTATING_PHRASES[phraseIndex]} />;
}

function LoadingView({ headlinePhrase, phrase }) {
  return (
    <div className="min-h-screen bg-white pt-40 pb-16">
      <div className="max-w-[1536px] mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-4">
          Generating Your Course
        </p>
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.1] tracking-tight mb-10 max-w-3xl">
          <span className="text-smoke">Becoming a more effective thinker <em className="italic">in</em></span>{" "}
          <span className="text-black font-serif italic">{headlinePhrase}</span>
        </h1>

        {/* Indeterminate progress bar — visibly moving so the user knows
            something is actually happening. Backend status stream still
            drives transitions; this is purely the "I'm working" signal. */}
        <div className="relative max-w-2xl h-1.5 bg-mist rounded-full overflow-hidden mb-6">
          <div
            className="absolute top-0 h-full w-1/3 bg-change rounded-full"
            style={{ animation: "course-build-slide 1.6s ease-in-out infinite" }}
          />
        </div>

        <div className="flex items-center gap-3 mb-8">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-50 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-change" />
          </span>
          <p className="font-serif italic text-ash text-lg leading-relaxed transition-opacity duration-700">
            {phrase}
          </p>
        </div>
        <p className="text-smoke text-sm">
          This usually takes 15&ndash;45 seconds. You can leave this tab open.
        </p>
      </div>
    </div>
  );
}

function ReadyView({ headlinePhrase, puzzles, courseId, getToken }) {
  const [fireStarters, setFireStarters] = useState(null);

  useEffect(() => {
    if (!courseId || !getToken) return;
    let c = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(
          `/api/backend-api/fire-starters?course_id=${encodeURIComponent(courseId)}`,
          { headers: { Authorization: `Bearer ${token}` } },
        );
        if (!res.ok) throw new Error("fire starters");
        const data = await res.json();
        if (!c) setFireStarters(Array.isArray(data) ? data : []);
      } catch {
        if (!c) setFireStarters([]);
      }
    })();
    return () => {
      c = true;
    };
  }, [courseId, getToken]);

  return (
    <div className="min-h-screen bg-white pt-40 pb-16">
      <div className="max-w-[1536px] mx-auto px-6">
        <div className="mb-10 max-w-3xl">
          <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-4">
            Your Course
          </p>
          <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.1] tracking-tight">
            <span className="text-smoke">Becoming a more effective thinker <em className="italic">in</em></span>{" "}
            <span className="text-black font-serif italic">{headlinePhrase}</span>
          </h1>
        </div>

        <div className="grid grid-cols-1 tb:grid-cols-2 lp:grid-cols-3 gap-6">
          {puzzles.map((p) => (
            <PuzzleCard key={p.id} puzzle={p} />
          ))}
        </div>

        <FireStartersLibrary
          fireStarters={fireStarters}
          loading={fireStarters === null}
        />

        <div className="mt-16">
          <Link
            href="/courses"
            className="font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-change transition-colors"
          >
            ← Back to your courses
          </Link>
        </div>
      </div>
    </div>
  );
}

function PuzzleCard({ puzzle }) {
  const roman = toRoman(puzzle.position);
  // Stage > 1 means the user has already advanced past Think on this
  // puzzle — show "Resume" instead of "Begin" and surface the stage so
  // they know where they're picking up.
  const stage = Number(puzzle.current_stage) || 1;
  const isCompleted = puzzle.status === "completed";
  const inProgress = puzzle.status === "in_progress" && !isCompleted;
  const stageLabel =
    stage === 2 ? "Stage 2 — AI Nudge" : stage === 3 ? "Stage 3 — Reflect" : null;
  return (
    <div
      className={`relative flex flex-col rounded-r-lg border border-mist border-l-4 bg-white p-6 shadow-sm transition-all ${
        isCompleted ? "opacity-80" : "border-l-smoke/60 hover:-translate-y-0.5 hover:shadow-md"
      }`}
      style={
        isCompleted
          ? { borderLeftColor: FORGE_COMPLETED.stripe }
          : undefined
      }
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="font-mono text-[11px] tracking-[0.2em] uppercase text-smoke">
          Puzzle {roman}
        </p>
        {isCompleted && (
          <span className={forgeCompletedPillClass}>Completed ✓</span>
        )}
        {inProgress && (
          <span
            className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-change/10 text-change border border-change/20"
            title={stageLabel || undefined}
          >
            In progress · Stage {stage}
          </span>
        )}
      </div>
      <h3 className="font-display text-2xl text-black leading-snug mb-3">
        {puzzle.title}
      </h3>
      <p className="font-serif italic text-ash text-base leading-relaxed mb-5 flex-1">
        {puzzle.puzzle_text}
      </p>
      <div className="mt-auto w-full pt-6">
        {isCompleted ? (
          <Link href={`/canvas/${puzzle.id}`} className={tertiaryCtaClass}>
            Review →
          </Link>
        ) : (
          <Link href={`/canvas/${puzzle.id}`} className={`${primaryCtaClass} w-full flex`}>
            {inProgress ? "Resume →" : "Begin →"}
          </Link>
        )}
      </div>
    </div>
  );
}

function FailureView({ course, onRetry, retrying }) {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[640px] mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-primary uppercase mb-4">
          Generation Failed
        </p>
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.1] tracking-tight mb-6">
          Something didn&apos;t go right.
        </h1>
        <p className="font-serif italic text-ash text-lg leading-relaxed mb-8">
          We hit an error generating your course. This happens occasionally
          with longer or more complex goals.
        </p>
        {course.generation_error ? (
          <pre className="bg-mist text-smoke font-mono text-xs p-4 mb-8 whitespace-pre-wrap break-words">
            {course.generation_error}
          </pre>
        ) : null}
        <div className="flex items-center gap-4">
          <Button
            onClick={onRetry}
            isDisabled={retrying}
            className="bg-black text-white hover:bg-ash"
            radius="none"
          >
            {retrying ? "Retrying…" : "Try again"}
          </Button>
          <Link
            href="/course/new"
            className="font-mono text-[11px] tracking-[0.2em] uppercase text-smoke hover:text-black"
          >
            Start a different course
          </Link>
        </div>
      </div>
    </div>
  );
}

function ErrorScreen({ message }) {
  return (
    <div className="min-h-screen bg-white pt-24 flex flex-col items-center justify-center px-6 gap-4">
      <p className="text-primary text-sm text-center max-w-sm">{message}</p>
      <Link href="/courses">
        <Button className="bg-black text-white hover:bg-ash" radius="none">
          Back to your courses
        </Button>
      </Link>
    </div>
  );
}

function toRoman(n) {
  const map = [
    [1000, "M"], [900, "CM"], [500, "D"], [400, "CD"],
    [100, "C"], [90, "XC"], [50, "L"], [40, "XL"],
    [10, "X"], [9, "IX"], [5, "V"], [4, "IV"], [1, "I"],
  ];
  let out = "";
  let v = n;
  for (const [num, sym] of map) {
    while (v >= num) {
      out += sym;
      v -= num;
    }
  }
  return out || String(n);
}
