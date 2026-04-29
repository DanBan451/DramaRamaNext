"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";

const INTAKE_MARKER = "<<INTAKE_COMPLETE>>";

/**
 * Strip the <<INTAKE_COMPLETE>> marker (and everything after) from the
 * visible portion of an in-progress assistant response. The backend will
 * also strip and persist only the visible portion, but we need to hide it
 * mid-stream so the user never sees the marker or the JSON.
 *
 * Also scrub stray "User:" / "Assistant:" line prefixes that Claude
 * occasionally leaks. The prompt now passes the conversation as proper
 * message turns (instead of inlining a transcript), but this client-side
 * scrub keeps older streams clean and protects against model drift.
 */
function scrubRolePrefixes(text) {
  if (!text) return "";
  return text
    .split("\n")
    .map((line) => line.replace(/^\s*(User|Assistant|USER|ASSISTANT):\s?/, ""))
    .join("\n");
}

function visibleText(buffer) {
  if (!buffer) return "";
  const idx = buffer.indexOf(INTAKE_MARKER);
  const visible = idx === -1 ? buffer : buffer.slice(0, idx).trimEnd();
  return scrubRolePrefixes(visible);
}

export default function NewCourseIntakePage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [courseId, setCourseId] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [input, setInput] = useState("");
  const [intakeComplete, setIntakeComplete] = useState(false);

  const transcriptRef = useRef(null);
  const startedRef = useRef(false);
  const textareaRef = useRef(null);

  // Refocus the composer after every assistant turn finishes streaming.
  // Without this, the textarea loses focus while it's `disabled` during
  // streaming, and the user has to click back into it before Enter works
  // again — which felt like Enter-to-send was broken.
  useEffect(() => {
    if (!streaming && !intakeComplete && courseId && textareaRef.current) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [streaming, intakeComplete, courseId]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login?redirect=/course/new");
    }
  }, [isLoaded, isSignedIn, router]);

  // Create the course on mount. The opening question is rendered locally —
  // we don't ping the LLM until the user actually answers, so we never pollute
  // intake history with a synthetic "start" turn.
  useEffect(() => {
    if (!isLoaded || !isSignedIn || startedRef.current) return;
    startedRef.current = true;

    (async () => {
      try {
        const token = await getToken();
        const res = await fetch("/api/backend-api/course/intake/start", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.text();
          throw new Error(`Failed to start intake (${res.status}): ${body}`);
        }
        const data = await res.json();
        setCourseId(data.course_id);
        setMessages([
          {
            role: "assistant",
            content:
              "What's a part of your life you want to become more effective at?",
          },
        ]);
      } catch (e) {
        console.error(e);
        setBootError(e.message || "Failed to start your course.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, isSignedIn]);

  // Auto-scroll on new content
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, streamBuffer]);

  // Intake progress estimate. We don't have a backend signal for "how
  // much more do we need" mid-stream, so this is a heuristic. Previously
  // we used `min(90, turns*20)` which hard-capped at 90 % and felt stuck
  // for users whose intake ran 6+ turns. This is a logistic-ish curve
  // that always nudges forward (asymptotes near 97 %), so every new
  // turn produces visible motion. Hitting the <<INTAKE_COMPLETE>> marker
  // snaps to 100 %.
  const userTurns = messages.filter((m) => m.role === "user").length;
  const progress = intakeComplete
    ? 100
    : Math.round(97 * (1 - Math.pow(0.6, userTurns)));
  const progressLabel =
    progress >= 85
      ? "Almost there — wrapping up"
      : progress >= 60
        ? "Getting clear on what you need"
        : progress >= 20
          ? "Gathering context"
          : "Just getting started";

  async function sendMessage(cid, text, { hideUserMessage = false } = {}) {
    if (!cid) return;
    setStreaming(true);
    setStreamBuffer("");

    if (!hideUserMessage) {
      setMessages((prev) => [...prev, { role: "user", content: text }]);
    }

    let assistantBuffer = "";
    let completeFlag = false;

    try {
      const token = await getToken();
      const res = await fetch(`/api/backend-api/course/intake/${cid}/message`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user_message: text }),
      });

      if (!res.ok || !res.body) {
        const body = await res.text().catch(() => "");
        throw new Error(`Intake failed (${res.status}): ${body.slice(0, 200)}`);
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
            if (obj.error) {
              throw new Error(obj.error);
            }
            if (typeof obj.text === "string") {
              assistantBuffer += obj.text;
              if (assistantBuffer.includes(INTAKE_MARKER)) {
                completeFlag = true;
              }
              setStreamBuffer(assistantBuffer);
            }
          } catch (e) {
            // Ignore malformed event lines but log
            console.warn("Bad SSE payload:", payload, e);
          }
        }
      }

      // Commit final assistant turn to messages list (truncated at marker)
      const visible = visibleText(assistantBuffer);
      setMessages((prev) => [...prev, { role: "assistant", content: visible }]);
      setStreamBuffer("");

      // The <<INTAKE_COMPLETE>> marker means the model decided to wrap
      // up. Snap the UI to "complete" immediately so the progress bar
      // hits 100 % and the input disables — don't wait for the backend
      // poll, which races with async post-stream processing.
      if (completeFlag) {
        setIntakeComplete(true);
        await pollAndRedirect(cid);
      }
    } catch (e) {
      console.error(e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            "Something went wrong reaching the intake. Try sending your last message again.",
        },
      ]);
    } finally {
      setStreaming(false);
    }
  }

  async function pollAndRedirect(cid) {
    // The backend commits the intake AFTER the SSE stream generator
    // finishes, so the first poll often races and sees
    // intake_status='in_progress'. Retry a few times with a delay.
    const MAX_ATTEMPTS = 8;
    const DELAY_MS = 1500;
    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      try {
        const token = await getToken();
        const res = await fetch(`/api/backend-api/course/${cid}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const data = await res.json();
          if (data?.course?.intake_status === "complete") {
            setTimeout(() => {
              router.push(`/courses/${cid}/ready`);
            }, 2000);
            return;
          }
        }
      } catch (e) {
        console.warn("Poll attempt failed", attempt, e);
      }
      // Wait before retrying
      await new Promise((r) => setTimeout(r, DELAY_MS));
    }
    // All retries exhausted — the user already saw the marker so
    // redirect anyway; the ready page will poll for generation status.
    router.push(`/courses/${cid}/ready`);
  }

  function onSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming || intakeComplete || !courseId) return;
    setInput("");
    sendMessage(courseId, text);
  }

  function onKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onSubmit(e);
    }
  }

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <Spinner size="md" color="default" />
      </div>
    );
  }

  if (bootError) {
    return (
      <div className="min-h-screen bg-white pt-24 flex flex-col items-center justify-center px-6 gap-4">
        <p className="text-primary text-sm text-center max-w-sm">{bootError}</p>
        <Button
          onClick={() => window.location.reload()}
          className="bg-black text-white hover:bg-ash"
          radius="none"
        >
          Try again
        </Button>
      </div>
    );
  }

  const liveAssistant = visibleText(streamBuffer);

  return (
    <div className="min-h-screen bg-white pt-40 pb-12">
      {/* Page width matches the navbar (max-w-[1536px] + px-6) so the
          intake doesn't feel like a stranded narrow column floating in
          the middle of the page. */}
      <div className="max-w-[1536px] mx-auto px-6">
        {/* Eyebrow + title row spans full width — same alignment as the
            navbar brand on the left. */}
        <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-3">
          New Course
        </p>
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.05] tracking-tight mb-3">
          Tell us what to <em className="italic">train</em>.
        </h1>
        <p className="font-serif italic text-ash text-base mb-10 max-w-2xl">
          A short conversation. We figure out what you actually want to get
          better at, then build a course of puzzles tuned to it.
        </p>

        <div className="grid grid-cols-1 lp:grid-cols-[1fr_320px] gap-10">
          {/* ─── Chat column ─────────────────────────────────────────── */}
          <div className="min-w-0 max-w-3xl">
            {/* Progress bar */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-2">
                <span className="font-mono text-[10px] tracking-[0.2em] text-smoke uppercase">
                  {intakeComplete ? "Intake complete" : progressLabel}
                </span>
                <span className="font-mono text-[10px] tracking-[0.2em] text-smoke">
                  {progress}%
                </span>
              </div>
              <div className="relative h-1.5 bg-mist rounded-full overflow-hidden">
                <div
                  className="absolute inset-y-0 left-0 bg-change rounded-full transition-[width] duration-700 ease-out"
                  style={{
                    width: `${progress}%`,
                    animation: !intakeComplete && progress > 0
                      ? "intake-pulse 2s ease-in-out infinite"
                      : undefined,
                  }}
                />
              </div>
            </div>

            {/* Transcript */}
            <div
              ref={transcriptRef}
              className="max-h-[60vh] overflow-y-auto scrollbar-hide pr-1 mb-6 space-y-3"
            >
              {messages.map((m, i) => (
                <MessageBubble key={i} role={m.role} content={m.content} />
              ))}
              {streaming && (
                <MessageBubble
                  role="assistant"
                  content={liveAssistant}
                  streaming
                />
              )}
              {intakeComplete && (
                <div className="flex items-center gap-2 pt-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                  </span>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                    Course committed. Building puzzles…
                  </p>
                </div>
              )}
            </div>

            {/* Composer */}
            <form
              onSubmit={onSubmit}
              className="border-t border-mist pt-4 flex items-end gap-3"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={streaming || intakeComplete || !courseId}
                placeholder={
                  intakeComplete
                    ? "Intake complete."
                    : streaming
                    ? "Waiting for the interviewer…"
                    : "Type your answer. Enter to send."
                }
                rows={2}
                className="flex-1 resize-none border border-mist focus:border-black bg-white text-black px-3 py-2 text-base leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none disabled:bg-mist/40 disabled:text-smoke rounded-md"
              />
              <Button
                type="submit"
                isDisabled={streaming || intakeComplete || !courseId || !input.trim()}
                className="bg-primary text-white hover:bg-primary/90 h-12 px-5"
                radius="none"
              >
                Send
              </Button>
            </form>

            {/* "I'm ready" escape hatch. Surfaces after enough turns so
                users who feel the chat is dragging can force the model
                to wrap up. The system prompt now treats this phrasing as
                an explicit signal to finalize on the next turn. */}
            {!intakeComplete && !streaming && courseId && userTurns >= 4 && (
              <div className="mt-3 flex items-center justify-between gap-3">
                <p className="text-xs text-smoke italic">
                  Feel like we have enough?
                </p>
                <button
                  type="button"
                  onClick={() => {
                    if (streaming || intakeComplete) return;
                    sendMessage(courseId, "I'm ready — build my course now.");
                  }}
                  className="text-xs font-mono tracking-[0.15em] uppercase text-change hover:text-primary border border-change/40 hover:border-primary/60 rounded-md px-3 py-2 transition-colors"
                >
                  I'm ready — build it →
                </button>
              </div>
            )}
          </div>

          {/* ─── Side panel — kills the empty-page feeling ──────────── */}
          <aside className="hidden lp:block">
            <div className="sticky top-32 space-y-6">
              <div className="border-l-2 border-change pl-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-change uppercase mb-2">
                  How this works
                </p>
                <p className="font-serif italic text-ash text-base leading-relaxed">
                  We talk for a few turns. You tell us what you want to be
                  more effective at. We listen for the real shape underneath.
                </p>
              </div>

              <div className="bg-change/5 border border-change/20 rounded-lg p-5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-change uppercase mb-3">
                  What you'll get
                </p>
                <ul className="space-y-2 text-sm text-ash">
                  <li className="flex gap-2">
                    <span className="text-change font-bold">·</span>
                    <span>A course tuned to <em className="italic">your</em> goal.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-change font-bold">·</span>
                    <span>Puzzles that train the specific thinking moves you need.</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="text-change font-bold">·</span>
                    <span>An AI guide that nudges, never solves.</span>
                  </li>
                </ul>
              </div>

              <div>
                <p className="font-mono text-[10px] tracking-[0.2em] text-smoke uppercase mb-3">
                  Trained on
                </p>
                <div className="grid grid-cols-5 gap-2">
                  {[
                    { e: "🌳", n: "Earth" },
                    { e: "🔥", n: "Fire" },
                    { e: "💨", n: "Air" },
                    { e: "🌊", n: "Water" },
                    { e: "🪨", n: "Change" },
                  ].map((x) => (
                    <div
                      key={x.n}
                      className="flex flex-col items-center gap-1 p-2 border border-mist rounded-md"
                      title={x.n}
                    >
                      <span className="text-lg">{x.e}</span>
                      <span className="font-mono text-[9px] tracking-wider uppercase text-smoke">
                        {x.n}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

// Typewriter hook — gradually reveals `target` while `streaming`. Mirror
// of the one in components/canvas/StageChat.jsx; lifted here to keep this
// page self-contained (the chat panel and the intake page are different
// products and a small duplication is cheaper than a shared dep).
function useTypewriter(target, streaming) {
  const [shown, setShown] = useState(target || "");
  const targetRef = useRef(target || "");
  const intervalRef = useRef(null);

  useEffect(() => {
    targetRef.current = target || "";
    if (!streaming) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setShown(targetRef.current);
      return;
    }
    if (intervalRef.current) return;
    intervalRef.current = setInterval(() => {
      setShown((prev) => {
        const t = targetRef.current;
        if (prev.length >= t.length) return prev;
        const behind = t.length - prev.length;
        const step = Math.max(2, Math.ceil(behind / 24));
        return t.slice(0, prev.length + step);
      });
    }, 16);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [target, streaming]);

  return shown;
}

function MessageBubble({ role, content, streaming }) {
  // Both sides are LEFT-ALIGNED with backgrounds — same shape as the
  // puzzle-canvas chat. Right-aligning the user looked stranded once we
  // widened the chat column.
  const visible = useTypewriter(content || "", !!streaming);
  if (role === "user") {
    return (
      <div>
        <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase mb-1">
          You
        </p>
        <div className="bg-mist rounded-lg px-4 py-3 text-black text-base leading-relaxed whitespace-pre-wrap break-words font-serif italic">
          {content}
        </div>
      </div>
    );
  }
  const showThinking = streaming && !visible;
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-1">
        AI {streaming ? "· typing" : ""}
      </p>
      <div className="bg-change/10 border border-change/20 rounded-lg px-4 py-3 text-black text-base leading-relaxed whitespace-pre-wrap break-words">
        {showThinking ? (
          <span className="inline-flex items-center gap-1 text-smoke italic">
            <span className="animate-pulse">Thinking</span>
            <span className="animate-pulse [animation-delay:120ms]">.</span>
            <span className="animate-pulse [animation-delay:240ms]">.</span>
            <span className="animate-pulse [animation-delay:360ms]">.</span>
          </span>
        ) : (
          <>
            {visible}
            {streaming && (
              <span className="inline-block w-1.5 h-4 align-text-bottom ml-0.5 bg-change/70 animate-pulse" />
            )}
          </>
        )}
      </div>
    </div>
  );
}
