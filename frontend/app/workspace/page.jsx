"use client";

import React, { useEffect, useRef, useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import CinematicExperience from "@/components/CinematicExperience";
import Footer from "@/components/Footer";
import { PUZZLES } from "@/lib/puzzles";

// ─── Puzzle Selection ─────────────────────────────────────────────────────────
const ACTIVE_PUZZLE_IDS = ["whos-who", "top-10-list", "three-switches", "star-is-born"];

// ─── Session Dashboard ───────────────────────────────────────────────────────
// Shows when the user navigates to /workspace with no params.
function SessionDashboard() {
  const { getToken } = useAuth();
  const [sessions, setSessions] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        if (!cancelled) setSessions(data.sessions || []);
      } catch {
        // silent
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [getToken]);

  const activeSessions = (sessions || [])
    .filter((s) => s.status === "in_progress")
    .sort((a, b) => new Date(b.started_at || 0) - new Date(a.started_at || 0));

  // Match sessions to PUZZLES for display info
  function puzzleForSession(s) {
    if (s.puzzle_id) {
      return PUZZLES.find((p) => p.id === s.puzzle_id);
    }
    return PUZZLES.find((p) => s.problem_description?.includes(p.title));
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center pt-20">
        <Spinner size="md" color="default" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pt-24 tb:pt-28 pb-16 px-6">
        <div className="max-w-[1536px] mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-4">
            Your work
          </span>
          <h1 className="font-display text-2xl tb:text-3xl lp:text-4xl text-black mb-3">
            Pick up where you left off.
          </h1>
          <p className="text-smoke text-sm tb:text-base mb-12 tb:mb-16 max-w-lg">
            Resume an active course or start a new one.
          </p>

          {activeSessions.length === 0 ? (
            <div className="text-center py-16">
              <h2 className="font-display text-xl tb:text-2xl text-black mb-2">No courses yet.</h2>
              <p className="text-ash text-base mb-6">Start your first one — pick something you want to master.</p>
              <Link href="/workspace">
                <Button
                  className="bg-black text-white hover:bg-ash"
                  radius="none"
                >
                  Start Your Course
                </Button>
              </Link>
            </div>
          ) : (
            <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4 tb:gap-6">
              {activeSessions.map((s) => {
                const p = puzzleForSession(s);
                const started = s.started_at
                  ? new Date(s.started_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })
                  : "";
                return (
                  <Link
                    key={s.id}
                    href={`/workspace?session=${s.id}`}
                    className="group bg-white border border-mist hover:border-change/30 hover:shadow-lg hover:-translate-y-1 transition-all duration-300 p-6 tb:p-8 min-h-[180px] tb:min-h-[200px] flex flex-col justify-between"
                  >
                    <div>
                      <span className="font-mono text-[10px] text-change/60 tracking-widest">
                        {p?.number || ""} · {p?.category || "puzzle"}
                      </span>
                      <h3 className="font-display text-lg tb:text-xl text-black mt-2 mb-3 group-hover:text-change transition-colors">
                        {p?.title || "Puzzle Session"}
                      </h3>
                      <p className="text-smoke text-sm leading-relaxed">
                        Started {started}
                      </p>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-[10px] font-mono text-smoke/40 uppercase tracking-wider">
                        {p?.category || "puzzle"}
                      </span>
                      <span className="font-mono text-[10px] tracking-[0.2em] uppercase text-change border border-change/30 px-4 py-2 hover:bg-change/5 transition-colors">
                        Resume
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
      <Footer />
    </div>
  );
}

// ─── Start Puzzle (creates session then enters CinematicExperience) ──────────
function StartPuzzle({ puzzleId, onReady }) {
  const [err, setErr] = useState("");
  const [retryCount, setRetryCount] = useState(0);
  const { getToken } = useAuth();

  const puzzle = PUZZLES.find(
    (p) => p.id === puzzleId && ACTIVE_PUZZLE_IDS.includes(p.id)
  );

  useEffect(() => {
    if (!puzzle) return;

    let cancelled = false;
    async function autoStart() {
      try {
        const token = await getToken();
        if (!token) throw new Error("Unable to authenticate. Please sign in.");

        const res = await fetch("/api/backend-api/session/start", {
          method: "POST",
          headers: {
            "content-type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            problem_description: `PUZZLE: ${puzzle.title}\n\n${puzzle.text}`,
            puzzle_id: puzzle.id,
          }),
        });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          throw new Error(j.detail || j.error || "Failed to start session.");
        }
        const data = await res.json();
        if (!cancelled) {
          onReady({
            puzzle,
            problemDescription: `PUZZLE: ${puzzle.title}\n\n${puzzle.text}`,
            sessionId: data.session_id,
            firstMessage: data.first_message,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Something went wrong.");
      }
    }
    autoStart();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [retryCount]);

  if (!puzzle) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-ash text-sm">Course not found.</p>
        <Link href="/workspace">
          <Button className="bg-black text-white hover:bg-ash" radius="none">
            Back to Your Work
          </Button>
        </Link>
      </div>
    );
  }

  if (err) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-primary text-sm text-center max-w-sm">{err}</p>
        <button
          onClick={() => { setErr(""); setRetryCount((c) => c + 1); }}
          className="font-mono text-xs tracking-widest uppercase text-smoke hover:text-black transition-colors"
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="md" color="default" />
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-smoke">
          Setting up your course…
        </p>
      </div>
    </div>
  );
}

// ─── Resume Session (loads existing session into CinematicExperience) ────────
function ResumeSession({ sessionId, onReady }) {
  const { getToken } = useAuth();
  const [err, setErr] = useState("");
  const fetchedRef = useRef(false);

  useEffect(() => {
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    async function load() {
      try {
        const token = await getToken();
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error("Failed to load sessions");
        const data = await res.json();
        const session = (data.sessions || []).find((s) => s.id === sessionId);
        if (!session) throw new Error("Session not found");
        if (!cancelled) {
          onReady({
            puzzle: null,
            problemDescription: session.problem_description || "",
            sessionId: session.id,
            firstMessage: null,
          });
        }
      } catch (e) {
        if (!cancelled) setErr(e?.message || "Could not load session.");
      }
    }
    load();
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (err) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-primary text-sm text-center max-w-sm">{err}</p>
        <Link href="/workspace">
          <Button className="bg-black text-white hover:bg-ash" radius="none">
            Back to Your Work
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <Spinner size="md" color="default" />
        <p className="font-mono text-[11px] tracking-[0.3em] uppercase text-smoke">
          Picking up where you left off…
        </p>
      </div>
    </div>
  );
}

// ─── Inner router (reads search params) ─────────────────────────────────────
function WorkspaceInner() {
  const { isLoaded, isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [sessionData, setSessionData] = useState(null);

  const puzzleParam = searchParams.get("puzzle");
  const sessionParam = searchParams.get("session");

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="md" color="default" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-4 tb:px-6">
        <div className="max-w-sm w-full text-center p-6 tb:p-8">
          <h2 className="font-display text-xl tb:text-2xl text-black mb-3">
            Sign in to start a course.
          </h2>
          <p className="text-smoke text-sm mb-6">
            Pick something you want to master. We&apos;ll build the course.
          </p>
          <Link href="/login">
            <Button
              className="bg-black text-white w-full hover:bg-ash"
              radius="none"
            >
              Sign In
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  // Active cinematic experience
  if (sessionData) {
    return (
      <CinematicExperience
        {...sessionData}
        onComplete={() => {
          setSessionData(null);
          router.push("/workspace");
        }}
        onLeave={() => {
          setSessionData(null);
          router.push("/workspace");
        }}
      />
    );
  }

  // ?session=XYZ → resume directly (skip ResumeSession intermediate step)
  if (sessionParam) {
    return (
      <CinematicExperience
        puzzle={null}
        problemDescription=""
        sessionId={sessionParam}
        firstMessage={null}
        onComplete={() => router.push("/workspace")}
        onLeave={() => router.push("/workspace")}
      />
    );
  }

  // ?puzzle=XYZ → start new session
  if (puzzleParam) {
    return (
      <StartPuzzle
        puzzleId={puzzleParam}
        onReady={(data) => setSessionData(data)}
      />
    );
  }

  // No params → session dashboard
  return <SessionDashboard />;
}

// ─── Main (wraps in Suspense for useSearchParams) ───────────────────────────
export default function WorkspacePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white flex items-center justify-center">
          <Spinner size="md" color="default" />
        </div>
      }
    >
      <WorkspaceInner />
    </Suspense>
  );
}
