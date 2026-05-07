"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import CreativeSpinner from "@/components/CreativeSpinner";

const STATEMENT_MARKER = "<<STATEMENT>>";
/** Editable tail; full goal sentence = prefix + tail (unless tail already starts with "I want"). */
const STATEMENT_PREFIX = "I want to think more effectively in ";

function extractTailForField(aiText) {
  const t = (aiText || "").trim();
  if (!t) return "";
  const p = STATEMENT_PREFIX.trimEnd();
  if (t.toLowerCase().startsWith(p.toLowerCase())) {
    return t.slice(p.length).trim();
  }
  return t;
}

function buildCrispStatement(tail) {
  const t = (tail || "").trim();
  if (!t) return "";
  if (/^i want\b/i.test(t)) return t;
  return `${STATEMENT_PREFIX}${t}`;
}

/**
 * Scrub stray "User:" / "Assistant:" line prefixes that Claude
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

/**
 * Extract the statement from a <<STATEMENT>> response.
 * Returns { statement, isStatement } where statement is the one-sentence
 * text after the marker, or null if no marker found.
 */
function parseStatement(buffer) {
  if (!buffer) return { statement: null, isStatement: false, clarification: "" };
  const cleaned = scrubRolePrefixes(buffer);
  const idx = cleaned.indexOf(STATEMENT_MARKER);
  if (idx === -1) {
    return { statement: null, isStatement: false, clarification: cleaned.trim() };
  }
  const afterMarker = cleaned.slice(idx + STATEMENT_MARKER.length).trim();
  // Take only the first sentence/line
  const firstLine = afterMarker.split("\n").filter(Boolean)[0] || "";
  return { statement: firstLine.trim(), isStatement: true, clarification: "" };
}

export default function NewCourseIntakePage() {
  const router = useRouter();
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [courseId, setCourseId] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [intakeStarted, setIntakeStarted] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [input, setInput] = useState("");
  const [intakeComplete, setIntakeComplete] = useState(false);
  /** Editable completion of "I want to think more effectively in …" */
  const [statement, setStatement] = useState("");
  const [proposalLocked, setProposalLocked] = useState(false);
  // Finalizing state (calling the finalize endpoint)
  const [finalizing, setFinalizing] = useState(false);

  const transcriptRef = useRef(null);
  const textareaRef = useRef(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  // Refocus the composer after each assistant turn until the guide proposes a statement.
  useEffect(() => {
    if (
      !streaming &&
      !intakeComplete &&
      courseId &&
      !proposalLocked &&
      textareaRef.current
    ) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [streaming, intakeComplete, courseId, proposalLocked]);

  // Redirect unauthenticated users
  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      router.replace("/login?redirect=/course/new");
    }
  }, [isLoaded, isSignedIn, router]);

  async function startIntake() {
    if (!isSignedIn || creatingCourse || courseId) return;
    setCreatingCourse(true);
    setBootError(null);
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
      setIntakeStarted(true);
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
    } finally {
      setCreatingCourse(false);
    }
  }

  // Auto-scroll on new content
  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [messages, streamBuffer]);

  // Extract statement from live stream buffer (for real-time typewriter)
  const liveStreamParsed = parseStatement(streamBuffer);
  const liveStatement = liveStreamParsed.statement;
  const liveClarification = liveStreamParsed.clarification;
  const isStreamingStatement = streaming && liveStreamParsed.isStatement;

  async function sendMessage(cid, text) {
    if (!cid) return;
    setStreaming(true);
    setStreamBuffer("");

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    let assistantBuffer = "";

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
              setStreamBuffer(assistantBuffer);
            }
          } catch (e) {
            console.warn("Bad SSE payload:", payload, e);
          }
        }
      }

      // Parse the final response
      const parsed = parseStatement(assistantBuffer);

      if (parsed.isStatement && parsed.statement) {
        setStatement(extractTailForField(parsed.statement));
        setProposalLocked(true);
        // Store the raw response in messages (hidden from display since
        // we show the statement in the editable field instead)
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: assistantBuffer.trim(), _isStatement: true },
        ]);
      } else {
        // AI sent a clarification (gibberish rejection) — show as regular message
        setMessages((prev) => [
          ...prev,
          { role: "assistant", content: parsed.clarification },
        ]);
      }
      setStreamBuffer("");
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

  async function handleCreateCourse() {
    const crisp = buildCrispStatement(statement);
    if (!courseId || !crisp || finalizing || intakeComplete) return;
    setFinalizing(true);
    try {
      const token = await getToken();
      const res = await fetch(
        `/api/backend-api/course/intake/${courseId}/finalize`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ crisp_statement: crisp }),
        },
      );
      if (!res.ok) {
        const body = await res.text().catch(() => "");
        throw new Error(`Finalize failed (${res.status}): ${body.slice(0, 200)}`);
      }
      setIntakeComplete(true);
      // Redirect to the ready page where puzzles are generated
      setTimeout(() => {
        router.push(`/courses/${courseId}/ready`);
      }, 1500);
    } catch (e) {
      console.error(e);
      setBootError(e.message || "Failed to create course.");
    } finally {
      setFinalizing(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    const text = input.trim();
    if (!text || streaming || intakeComplete || !courseId || proposalLocked) return;
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
        <CreativeSpinner label="Loading" />
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

  const displayTail = isStreamingStatement
    ? extractTailForField(liveStatement || "")
    : statement;

  const showStatementField = userTurns >= 1;
  const crispPreview = buildCrispStatement(displayTail);

  return (
    <div className="min-h-screen bg-white pt-40 pb-12">
      <div className="max-w-3xl mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-3">
          New Course
        </p>
        <h1 className="font-display text-3xl tb:text-4xl text-black leading-snug tracking-tight mb-4">
          <span className="font-serif italic text-change">
            I want to think more effectively in
          </span>{" "}
          <span className="text-black">…</span>
        </h1>
        <p className="font-serif text-ash text-base leading-relaxed mb-8 max-w-2xl">
          One short chat: the guide asks a few questions, then proposes a single
          sentence you can edit. We only create your course after you press{" "}
          <strong className="font-medium text-black">Create Course</strong> — nothing
          shows up in your course list before that.
        </p>

        {!intakeStarted ? (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <Button
              onClick={startIntake}
              isDisabled={creatingCourse}
              className="bg-primary text-white hover:bg-primary/90 h-12 px-8 font-medium"
              radius="none"
            >
              {creatingCourse ? "Starting…" : "Start course"}
            </Button>
            {creatingCourse && <CreativeSpinner label="Starting course" />}
          </div>
        ) : (
          <>
            {/* ─── Statement (one field: fixed prefix + editable tail) ─── */}
            {showStatementField && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2 gap-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-change uppercase">
                    {intakeComplete
                      ? "Course created"
                      : isStreamingStatement
                        ? statement
                          ? "Rewriting…"
                          : "Writing…"
                        : "Your course sentence"}
                  </span>
                  {proposalLocked && !intakeComplete && !streaming && (
                    <span className="text-[10px] text-smoke italic text-right">
                      Edit the line below, then create your course.
                    </span>
                  )}
                </div>
                <div
                  className={`rounded-lg px-4 py-3 min-h-[3.25rem] flex flex-wrap items-baseline gap-x-2 gap-y-2 ${
                    isStreamingStatement
                      ? "bg-change/5 border-2 border-change/30"
                      : "bg-white border-2 border-black/15"
                  }`}
                >
                  <span className="font-serif italic text-lg text-black shrink-0">
                    I want to think more effectively in
                  </span>
                  <StatementField
                    value={displayTail}
                    onChange={(val) => setStatement(val)}
                    streaming={isStreamingStatement}
                    disabled={intakeComplete || finalizing}
                  />
                </div>
                {!!crispPreview && !intakeComplete && !isStreamingStatement && (
                  <p className="mt-2 text-xs text-smoke font-serif italic">
                    Full sentence: {crispPreview}
                  </p>
                )}
                {!intakeComplete && (
                  <div className="mt-4 flex items-center gap-4 flex-wrap">
                    <Button
                      onClick={handleCreateCourse}
                      isDisabled={!crispPreview?.trim() || finalizing}
                      className="bg-primary text-white hover:bg-primary/90 h-12 px-6 font-medium"
                      radius="none"
                    >
                      {finalizing ? "Creating…" : "Create Course"}
                    </Button>
                    {finalizing && (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                        </span>
                        <span className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                          Building your course…
                        </span>
                      </span>
                    )}
                  </div>
                )}
                {intakeComplete && (
                  <div className="mt-4 flex items-center gap-2">
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
            )}

            <div
              ref={transcriptRef}
              className="max-h-[50vh] overflow-y-auto scrollbar-hide pr-1 mb-6 space-y-3"
            >
              {messages.map((m, i) => {
                if (m._isStatement) return null;
                return (
                  <MessageBubble key={i} role={m.role} content={m.content} />
                );
              })}
              {streaming && !isStreamingStatement && liveClarification && (
                <MessageBubble
                  role="assistant"
                  content={liveClarification}
                  streaming
                />
              )}
              {isStreamingStatement && (
                <div className="flex items-center gap-2 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                  </span>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                    {statement ? "Rewriting your sentence…" : "Writing your sentence…"}
                  </p>
                </div>
              )}
            </div>

            <form
              onSubmit={onSubmit}
              className="border-t border-mist pt-4 flex items-end gap-3"
            >
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onKeyDown}
                disabled={
                  streaming || intakeComplete || !courseId || proposalLocked
                }
                placeholder={
                  intakeComplete
                    ? "Course created."
                    : proposalLocked
                      ? "Your guide proposed a sentence — edit it above."
                      : streaming
                        ? "Waiting…"
                        : userTurns === 0
                          ? "Answer the guide. Enter to send."
                          : "Keep going — the guide isn’t done yet."
                }
                rows={2}
                className="flex-1 resize-none border border-mist focus:border-black bg-white text-black px-3 py-2 text-base leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none disabled:bg-mist/40 disabled:text-smoke rounded-md"
              />
              <Button
                type="submit"
                isDisabled={
                  streaming ||
                  intakeComplete ||
                  !courseId ||
                  proposalLocked ||
                  !input.trim()
                }
                className="bg-black text-white hover:bg-ash h-12 px-5"
                radius="none"
              >
                Send
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Statement field with typewriter animation ──────────────────────────
// Shows the AI-generated statement with a typewriter effect while streaming,
// and becomes an editable input when streaming stops.
function StatementField({ value, onChange, streaming, disabled }) {
  const shown = useTypewriter(value || "", streaming);
  const inputRef = useRef(null);

  if (streaming) {
    return (
      <span className="text-black text-lg leading-relaxed font-serif italic min-w-[12rem] flex-1">
        {shown}
        <span className="inline-block w-1.5 h-5 align-text-bottom ml-0.5 bg-change/70 animate-pulse" />
      </span>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="…your focus here"
      className="flex-1 min-w-[12rem] bg-transparent border-0 border-b-2 border-black/25 focus:border-black px-0 py-1 text-black text-lg leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none focus:ring-0 disabled:opacity-50 transition-colors"
    />
  );
}

// Typewriter hook — gradually reveals `target` while `streaming`.
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
