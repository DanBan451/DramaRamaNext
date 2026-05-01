"use client";

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Spinner } from "@nextui-org/spinner";
import { Button } from "@nextui-org/button";

const STATEMENT_MARKER = "<<STATEMENT>>";

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
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [input, setInput] = useState("");
  const [intakeComplete, setIntakeComplete] = useState(false);
  // The AI-generated statement the user can edit
  const [statement, setStatement] = useState("");
  // Whether the user has manually edited the statement
  const [statementEdited, setStatementEdited] = useState(false);
  // Finalizing state (calling the finalize endpoint)
  const [finalizing, setFinalizing] = useState(false);

  const transcriptRef = useRef(null);
  const startedRef = useRef(false);
  const textareaRef = useRef(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  // Refocus the composer after every assistant turn finishes streaming.
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

  // Extract statement from live stream buffer (for real-time typewriter)
  const liveStreamParsed = parseStatement(streamBuffer);
  const liveStatement = liveStreamParsed.statement;
  const liveClarification = liveStreamParsed.clarification;
  const isStreamingStatement = streaming && liveStreamParsed.isStatement;

  async function sendMessage(cid, text) {
    if (!cid) return;
    setStreaming(true);
    setStreamBuffer("");
    setStatementEdited(false);

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
        // AI generated a statement — update the editable field
        setStatement(parsed.statement);
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
    if (!courseId || !statement.trim() || finalizing || intakeComplete) return;
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
          body: JSON.stringify({ crisp_statement: statement.trim() }),
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

  // Determine what statement text to show in the editable field
  const displayStatement = isStreamingStatement
    ? liveStatement || ""
    : statement;

  // Show the statement field after the user has sent at least one message
  const showStatementField = userTurns >= 1;

  return (
    <div className="min-h-screen bg-white pt-40 pb-12">
      <div className="max-w-[1536px] mx-auto px-6">
        <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-3">
          New Course
        </p>
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.05] tracking-tight mb-3">
          Tell us what to <em className="italic">train</em>.
        </h1>
        <p className="font-serif italic text-ash text-base mb-10 max-w-2xl">
          Tell us what you want to get better at. We&apos;ll distill it into a
          single statement and build a course of puzzles tuned to it.
        </p>

        <div className="grid grid-cols-1 lp:grid-cols-[1fr_320px] gap-10">
          {/* ─── Main column ──────────────────────────────────────────── */}
          <div className="min-w-0 max-w-3xl">
            {/* ─── Statement field (appears after first message) ─────── */}
            {showStatementField && (
              <div className="mb-8">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-change uppercase">
                    {intakeComplete
                      ? "Course created"
                      : isStreamingStatement
                        ? statement
                          ? "Rewriting..."
                          : "Writing..."
                        : "Your course statement"}
                  </span>
                  {!intakeComplete && displayStatement && !streaming && (
                    <span className="text-[10px] text-smoke italic">
                      Edit this or send another message to refine
                    </span>
                  )}
                </div>
                <div className="relative">
                  <StatementField
                    value={displayStatement}
                    onChange={(val) => {
                      setStatement(val);
                      setStatementEdited(true);
                    }}
                    streaming={isStreamingStatement}
                    disabled={intakeComplete || finalizing}
                  />
                </div>
                {/* Create Course button */}
                {!intakeComplete && (
                  <div className="mt-4 flex items-center gap-4">
                    <Button
                      onClick={handleCreateCourse}
                      isDisabled={
                        !displayStatement?.trim() ||
                        finalizing
                      }
                      className="bg-primary text-white hover:bg-primary/90 h-12 px-6 font-medium"
                      radius="none"
                    >
                      {finalizing ? "Creating..." : "Create Course"}
                    </Button>
                    {finalizing && (
                      <span className="flex items-center gap-2">
                        <span className="relative flex h-2 w-2">
                          <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                          <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                        </span>
                        <span className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                          Building your course...
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
                      Course committed. Building puzzles...
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* ─── Chat transcript ────────────────────────────────────── */}
            <div
              ref={transcriptRef}
              className="max-h-[50vh] overflow-y-auto scrollbar-hide pr-1 mb-6 space-y-3"
            >
              {messages.map((m, i) => {
                // Don't render <<STATEMENT>> responses as chat bubbles —
                // the statement is shown in the editable field above.
                if (m._isStatement) return null;
                return (
                  <MessageBubble key={i} role={m.role} content={m.content} />
                );
              })}
              {/* Streaming: show clarification messages live, but NOT
                  statement responses (those render in the field above) */}
              {streaming && !isStreamingStatement && liveClarification && (
                <MessageBubble
                  role="assistant"
                  content={liveClarification}
                  streaming
                />
              )}
              {/* Streaming a statement: show a subtle "writing" indicator in chat */}
              {isStreamingStatement && (
                <div className="flex items-center gap-2 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                  </span>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                    {statement ? "Rewriting your statement..." : "Writing your statement..."}
                  </p>
                </div>
              )}
            </div>

            {/* ─── Composer ───────────────────────────────────────────── */}
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
                    ? "Course created."
                    : streaming
                    ? "Waiting..."
                    : userTurns === 0
                      ? "Type your answer. Enter to send."
                      : "Send another message to refine, or edit the statement above."
                }
                rows={2}
                className="flex-1 resize-none border border-mist focus:border-black bg-white text-black px-3 py-2 text-base leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none disabled:bg-mist/40 disabled:text-smoke rounded-md"
              />
              <Button
                type="submit"
                isDisabled={streaming || intakeComplete || !courseId || !input.trim()}
                className="bg-black text-white hover:bg-ash h-12 px-5"
                radius="none"
              >
                Send
              </Button>
            </form>
          </div>

          {/* ─── Side panel ───────────────────────────────────────────── */}
          <aside className="hidden lp:block">
            <div className="sticky top-32 space-y-6">
              <div className="border-l-2 border-change pl-4">
                <p className="font-mono text-[10px] tracking-[0.2em] text-change uppercase mb-2">
                  How this works
                </p>
                <p className="font-serif italic text-ash text-base leading-relaxed">
                  Tell us what you want to be more effective at. The AI writes a
                  one-sentence statement. Edit it until it feels right, then
                  create your course.
                </p>
              </div>

              <div className="bg-change/5 border border-change/20 rounded-lg p-5">
                <p className="font-mono text-[10px] tracking-[0.2em] text-change uppercase mb-3">
                  What you&apos;ll get
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

// ─── Statement field with typewriter animation ──────────────────────────
// Shows the AI-generated statement with a typewriter effect while streaming,
// and becomes an editable input when streaming stops.
function StatementField({ value, onChange, streaming, disabled }) {
  const shown = useTypewriter(value || "", streaming);
  const inputRef = useRef(null);

  if (streaming) {
    return (
      <div className="bg-change/5 border-2 border-change/30 rounded-lg px-4 py-3 min-h-[3rem] flex items-center">
        <span className="text-black text-lg leading-relaxed font-serif italic">
          {shown}
          <span className="inline-block w-1.5 h-5 align-text-bottom ml-0.5 bg-change/70 animate-pulse" />
        </span>
      </div>
    );
  }

  return (
    <input
      ref={inputRef}
      type="text"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      placeholder="Your course statement will appear here..."
      className="w-full bg-white border-2 border-black/20 focus:border-black rounded-lg px-4 py-3 text-black text-lg leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none disabled:bg-mist/40 disabled:text-smoke transition-colors"
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
