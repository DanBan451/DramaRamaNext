"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import { Spinner } from "@nextui-org/spinner";
import CinematicExperience from "@/components/CinematicExperience";
import { PUZZLES } from "@/lib/puzzles";

// ─── Puzzle Selection ─────────────────────────────────────────────────────────
// In the workspace picker we intentionally surface only the Who's Who puzzle.
// The other puzzles remain in `lib/puzzles.js` for later revival, and they
// still render (as "coming soon") on the landing page.

const ACTIVE_PUZZLE_ID = "whos-who";

// SetupPhase auto-starts the only active puzzle on mount — no second click.
// Since there's exactly one puzzle available, showing a picker would be
// redundant: the user already chose on the landing page.
function SetupPhase({ onStart }) {
  const [err, setErr] = useState("");
  const { getToken } = useAuth();
  const fetchedRef = useRef(false);

  const puzzle = PUZZLES.find((p) => p.id === ACTIVE_PUZZLE_ID);

  useEffect(() => {
    // Guard against React Strict Mode double-invocation — only one fetch per mount.
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    let cancelled = false;
    async function autoStart() {
      try {
        const token = await getToken({ skipCache: true });
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
          onStart({
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
  }, []);

  if (err) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-primary text-sm text-center max-w-sm">{err}</p>
        <button
          onClick={() => { setErr(""); }}
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
          Preparing your puzzle…
        </p>
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [phase, setPhase] = useState("loading");
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setPhase("setup");
      return;
    }

    let cancelled = false;
    async function loadActiveSession() {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) throw new Error();
        const data = await res.json();
        const active = (data.sessions || []).find(
          (s) => s.status === "in_progress"
        );
        if (active && !cancelled) {
          setSessionData({
            puzzle: null,
            problemDescription: active.problem_description || "",
            sessionId: active.id,
            firstMessage: null,
          });
          setPhase("working");
        } else if (!cancelled) {
          setPhase("setup");
        }
      } catch {
        if (!cancelled) setPhase("setup");
      }
    }
    loadActiveSession();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || phase === "loading") {
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
            Sign in to start.
          </h2>
          <p className="text-smoke text-sm mb-6">
            Pick a puzzle, think through it, watch your understanding grow.
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

  if (phase === "working" && sessionData) {
    return (
      <CinematicExperience
        {...sessionData}
        onComplete={() => {
          setSessionData(null);
          setPhase("setup");
        }}
      />
    );
  }

  return (
    <SetupPhase
      onStart={(data) => {
        setSessionData(data);
        setPhase("working");
      }}
    />
  );
}
