"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";

const ROTATING_PHRASES = [
  "Reading what you said.",
  "Listening for what you actually need.",
  "Sketching puzzles.",
  "Tightening the logic of each one.",
  "Almost there.",
];

// Per-element color tokens. The `label` is the human-readable name shown
// as a chip on each card so the color tinting has a clear, explicit meaning
// (instead of users wondering whether the color encodes difficulty).
const ELEMENT_CARD = {
  earth: {
    side: "border-l-earth",
    tint: "bg-earth/[0.04]",
    text: "text-earth",
    chip: "bg-earth/15 text-earth",
    label: "🌳 Earth · Understand Deeply",
  },
  fire: {
    side: "border-l-fire",
    tint: "bg-fire/[0.04]",
    text: "text-fire",
    chip: "bg-fire/15 text-fire",
    label: "🔥 Fire · Fail Effectively",
  },
  air: {
    side: "border-l-air",
    tint: "bg-air/[0.04]",
    text: "text-air",
    chip: "bg-air/15 text-air",
    label: "💨 Air · Create Questions",
  },
  water: {
    side: "border-l-water",
    tint: "bg-water/[0.04]",
    text: "text-water",
    chip: "bg-water/15 text-water",
    label: "🌊 Water · Flow with Ideas",
  },
  synthesis: {
    side: "border-l-change",
    tint: "bg-change/[0.04]",
    text: "text-change",
    chip: "bg-change/15 text-change",
    label: "🪨 Change · Synthesis",
  },
};
const ELEMENT_CARD_FALLBACK = {
  side: "border-l-smoke",
  tint: "bg-mist/30",
  text: "text-smoke",
  chip: "bg-mist text-smoke",
  label: "Mixed",
};

const TERMINAL_STATUSES = new Set([
  "ready",
  "active",
  "completed",
  "generation_failed",
  "abandoned",
]);

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
        <Spinner size="md" color="default" />
      </div>
    );
  }

  const status = course.course_status;
  const title = course.crisp_statement || "Your course";

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
          <Spinner size="md" color="default" />
        </div>
      );
    }
    return <ReadyView title={title} puzzles={puzzles} />;
  }

  // generating | awaiting_puzzles
  return <LoadingView title={title} phrase={ROTATING_PHRASES[phraseIndex]} />;
}

function LoadingView({ title, phrase }) {
  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[640px] mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase mb-4">
          Generating Your Course
        </p>
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.1] tracking-tight mb-10">
          {title}
        </h1>
        <div className="flex items-center gap-3 mb-8">
          <span className="relative flex h-3 w-3">
            <span className="absolute inline-flex h-full w-full rounded-full bg-black opacity-50 animate-ping" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-black" />
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

function ReadyView({ title, puzzles }) {
  return (
    <div className="min-h-screen bg-white pt-40 pb-16">
      <div className="max-w-[1536px] mx-auto px-6">
        <div className="mb-10 max-w-3xl">
          <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-4">
            Your Course
          </p>
          <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.1] tracking-tight">
            {title}
          </h1>
        </div>

        {/* Element legend — explains what the puzzle-card colors mean. */}
        <div className="mb-8 flex flex-wrap items-center gap-2 text-[11px] font-mono">
          <span className="text-smoke uppercase tracking-[0.2em] mr-2">
            Element key:
          </span>
          {Object.values(ELEMENT_CARD).map((c) => (
            <span
              key={c.label}
              className={`px-2 py-1 rounded ${c.chip}`}
            >
              {c.label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-1 tb:grid-cols-2 lp:grid-cols-3 gap-6">
          {puzzles.map((p) => (
            <PuzzleCard key={p.id} puzzle={p} />
          ))}
        </div>

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
  const card =
    ELEMENT_CARD[puzzle.primary_element] || ELEMENT_CARD_FALLBACK;
  const roman = toRoman(puzzle.position);
  return (
    <div
      className={`relative bg-white border border-mist border-l-4 ${card.side} ${card.tint} p-6 rounded-r-lg shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all flex flex-col`}
    >
      <div className="flex items-center justify-between mb-3 gap-3">
        <p
          className={`font-mono text-[11px] tracking-[0.2em] uppercase ${card.text}`}
        >
          Puzzle {roman}
        </p>
        <span
          className={`text-[10px] font-mono px-2 py-1 rounded ${card.chip}`}
          title="Primary element this puzzle trains"
        >
          {card.label}
        </span>
      </div>
      <h3 className="font-display text-2xl text-black leading-snug mb-3">
        {puzzle.title}
      </h3>
      <p className="font-serif italic text-ash text-base leading-relaxed mb-5 flex-1">
        {puzzle.puzzle_text}
      </p>
      <div className="flex items-center gap-3">
        <Link href={`/canvas/${puzzle.id}`}>
          <Button
            className="bg-change text-white hover:bg-change/90 font-medium"
            radius="none"
          >
            Begin →
          </Button>
        </Link>
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
