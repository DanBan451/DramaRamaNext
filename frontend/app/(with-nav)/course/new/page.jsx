"use client";

import React, { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import CreativeSpinner from "@/components/CreativeSpinner";

const INTAKE_COMPLETE_MARKER = "<<INTAKE_COMPLETE>>";

const OPENING_ASSISTANT_PROMPT =
  "What's a part of your life you want to become more effective at?";

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
 * Split an accumulating assistant buffer into:
 * - visible prose (shown in the chat bubble)
 * - JSON payload (captured silently once <<INTAKE_COMPLETE>> appears)
 */
function splitVisibleAndJson(buffer) {
  const cleaned = scrubRolePrefixes(buffer || "");
  const idx = cleaned.indexOf(INTAKE_COMPLETE_MARKER);
  if (idx === -1) {
    return { visible: cleaned, intakeJson: null, hasMarker: false };
  }
  // Use the FIRST marker occurrence defensively.
  const before = cleaned.slice(0, idx);
  const after = cleaned.slice(idx + INTAKE_COMPLETE_MARKER.length);
  let visible = (before || "").trimEnd();
  // Some older prompts ended with this phrase; keep it out of the bubble.
  visible = visible
    .replace(/Building your course now\.?\s*$/i, "")
    .trimEnd();
  const intakeJson = (after || "").trim();
  return { visible, intakeJson, hasMarker: true };
}

function extractJsonObject(text) {
  if (!text) return null;
  let t = String(text).trim();
  // Strip ```json fences if present
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const first = t.indexOf("{");
  const last = t.lastIndexOf("}");
  if (first === -1 || last === -1 || last <= first) return null;
  return t.slice(first, last + 1);
}

function deriveCourseLabelFallback(crispStatement) {
  const tokens = (crispStatement || "")
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .filter(Boolean);
  if (!tokens.length) return "";
  return tokens.slice(0, 12).join(" ").replace(/[.?!]+$/, "");
}

function validateIntakePayload(obj) {
  if (!obj || typeof obj !== "object") return { ok: false, reason: "missing_json" };
  const crisp = String(obj.crisp_statement || "").trim();
  const label = String(obj.course_label || "").trim();
  if (!crisp) return { ok: false, reason: "missing_crisp_statement" };
  // Other fields are used downstream but we keep validation light here; backend will still extract/validate.
  return { ok: true, crisp_statement: crisp, course_label: label };
}

function assistantVisibleForDisplay(raw) {
  return (splitVisibleAndJson(raw || "").visible || "").trim();
}

/**
 * Rebuild client transcript from persisted JSONB intake_messages.
 * Strips trailing JSON from assistant rows; detects completed intake marker
 * and restores extraction state without rendering the concluding bubble.
 */
function hydrateIntakeFromServerMessages(intake_messages) {
  const rawList = Array.isArray(intake_messages) ? [...intake_messages] : [];
  const normalized = rawList.map((m) => ({
    role: (m.role || "").toLowerCase() === "user" ? "user" : "assistant",
    content: String(m.content || "").trim(),
  }));

  let lastAssistIdx = -1;
  for (let i = normalized.length - 1; i >= 0; i--) {
    if (normalized[i].role === "assistant") {
      lastAssistIdx = i;
      break;
    }
  }

  let sliceEnd = normalized.length;
  let extractionComplete = false;
  let intakePayload = null;
  let courseLabel = "";

  if (lastAssistIdx >= 0) {
    const split = splitVisibleAndJson(normalized[lastAssistIdx].content || "");
    const ijRaw = split.intakeJson != null ? String(split.intakeJson).trim() : "";
    if (ijRaw) {
      const extracted = extractJsonObject(ijRaw);
      if (extracted) {
        try {
          const obj = JSON.parse(extracted);
          const v = validateIntakePayload(obj);
          if (v.ok) {
            extractionComplete = true;
            courseLabel =
              v.course_label || deriveCourseLabelFallback(v.crisp_statement);
            intakePayload = {
              ...obj,
              crisp_statement: v.crisp_statement,
              course_label: courseLabel,
            };
            sliceEnd = lastAssistIdx;
          }
        } catch {
          /* keep full transcript */
        }
      }
    }
  }

  const displaySlice = normalized.slice(0, sliceEnd);
  const messagesOut = [];
  for (let i = 0; i < displaySlice.length; i++) {
    const m = displaySlice[i];
    if (m.role === "assistant") {
      const vis = assistantVisibleForDisplay(m.content);
      if (!vis) continue;
      messagesOut.push({ role: "assistant", content: vis });
    } else if (m.content) {
      messagesOut.push({ role: "user", content: m.content });
    }
  }

  return {
    messages: messagesOut,
    extractionComplete,
    intakePayload,
    courseLabel,
  };
}

export default function NewCourseIntakePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
          <CreativeSpinner label="Loading" />
        </div>
      }
    >
      <NewCourseIntakePageInner />
    </Suspense>
  );
}

function NewCourseIntakePageInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const resumeIdCandidate = searchParams.get("resume");
  const resumeId =
    resumeIdCandidate && /^[0-9a-f-]{10,}$/i.test(resumeIdCandidate.trim())
      ? resumeIdCandidate.trim()
      : null;

  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [resumeHydrating, setResumeHydrating] = useState(Boolean(resumeId));

  const [courseId, setCourseId] = useState(null);
  const [bootError, setBootError] = useState(null);
  const [intakeStarted, setIntakeStarted] = useState(false);
  const [creatingCourse, setCreatingCourse] = useState(false);
  const [messages, setMessages] = useState([]); // [{role, content}]
  const [streaming, setStreaming] = useState(false);
  const [streamBuffer, setStreamBuffer] = useState("");
  const [input, setInput] = useState("");
  /** When true, course has been committed (finalize called) and puzzles are generating */
  const [intakeComplete, setIntakeComplete] = useState(false);
  /** When true, the AI has emitted <<INTAKE_COMPLETE>> + valid JSON */
  const [extractionComplete, setExtractionComplete] = useState(false);
  const [extractionError, setExtractionError] = useState(null);
  const [intakePayload, setIntakePayload] = useState(null); // parsed JSON
  const [intakeJsonRaw, setIntakeJsonRaw] = useState(null); // raw JSON text after marker
  const [markerSeen, setMarkerSeen] = useState(false);
  /** Editable course label (short phrase after prefix) */
  const [courseLabel, setCourseLabel] = useState("");
  const [justUnlockedLabel, setJustUnlockedLabel] = useState(false);
  // Finalizing state (calling the finalize endpoint)
  const [finalizing, setFinalizing] = useState(false);

  const transcriptRef = useRef(null);
  const textareaRef = useRef(null);
  const courseLabelRef = useRef(null);

  const userTurns = messages.filter((m) => m.role === "user").length;

  // Refocus the composer after each assistant turn until the guide proposes a statement.
  useEffect(() => {
    if (
      !streaming &&
      !intakeComplete &&
      courseId &&
      !extractionComplete &&
      textareaRef.current
    ) {
      textareaRef.current.focus({ preventScroll: true });
    }
  }, [streaming, intakeComplete, courseId, extractionComplete]);

  useEffect(() => {
    if (!extractionComplete) return;
    if (!courseLabelRef.current) return;
    courseLabelRef.current.focus({ preventScroll: true });
    courseLabelRef.current.select?.();
    setJustUnlockedLabel(true);
    const t = setTimeout(() => setJustUnlockedLabel(false), 900);
    return () => clearTimeout(t);
  }, [extractionComplete]);

  useEffect(() => {
    if (isLoaded && !isSignedIn) {
      const path = resumeId
        ? `/course/new?resume=${encodeURIComponent(resumeId)}`
        : "/course/new";
      router.replace(`/login?redirect=${encodeURIComponent(path)}`);
    }
  }, [isLoaded, isSignedIn, router, resumeId]);

  // Load persisted intake_messages when reopening from My Courses.
  useEffect(() => {
    if (!isLoaded || !isSignedIn) return;

    if (!resumeId) {
      setResumeHydrating(false);
      return;
    }

    let cancelled = false;

    async function loadResume() {
      setResumeHydrating(true);
      setBootError(null);
      try {
        const token = await getToken();
        const res = await fetch(`/api/backend-api/course/${resumeId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) {
          const body = await res.text().catch(() => "");
          throw new Error(body || `${res.status}`);
        }
        const data = await res.json();
        const course = data.course;
        if (course.intake_status === "complete") {
          router.replace(`/courses/${course.id}/ready`);
          return;
        }

        const hydrated = hydrateIntakeFromServerMessages(data.intake_messages);
        let msgs = hydrated.messages;
        if (
          msgs.length === 0 &&
          (course.intake_status === "draft" ||
            course.intake_status === "in_progress")
        ) {
          msgs = [{ role: "assistant", content: OPENING_ASSISTANT_PROMPT }];
        }

        setCourseId(course.id);
        setIntakeStarted(true);
        setMessages(msgs);
        setExtractionError(null);
        if (hydrated.extractionComplete && hydrated.intakePayload) {
          setExtractionComplete(true);
          setIntakePayload(hydrated.intakePayload);
          setCourseLabel(hydrated.courseLabel || "");
        } else {
          setExtractionComplete(false);
          setIntakePayload(null);
          setCourseLabel("");
        }
      } catch (e) {
        console.error(e);
        if (!cancelled) {
          setBootError(
            "We couldn’t reopen that intake chat. Try starting a fresh course.",
          );
        }
      } finally {
        if (!cancelled) setResumeHydrating(false);
      }
    }

    loadResume();
    return () => {
      cancelled = true;
    };
  }, [resumeId, isLoaded, isSignedIn, getToken, router]);

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
      setMessages([{ role: "assistant", content: OPENING_ASSISTANT_PROMPT }]);
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

  // Live visible assistant text (strip marker/JSON if present mid-stream)
  const liveVisibleAssistant = (streamBuffer || "").trim();

  async function sendMessage(cid, text) {
    if (!cid) return;
    setStreaming(true);
    setStreamBuffer("");
    setExtractionError(null);
    setMarkerSeen(false);

    setMessages((prev) => [...prev, { role: "user", content: text }]);

    let assistantBuffer = "";
    let visibleBuffer = "";
    let jsonBuffer = null;

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
              const split = splitVisibleAndJson(assistantBuffer);
              visibleBuffer = split.visible || "";
              jsonBuffer = split.intakeJson;
              setStreamBuffer(visibleBuffer);
              setIntakeJsonRaw(jsonBuffer);
              if (split.hasMarker) setMarkerSeen(true);
            }
          } catch (e) {
            console.warn("Bad SSE payload:", payload, e);
          }
        }
      }

      // After the stream ends: only persist assistant prose as a bubble if we did NOT
      // successfully complete intake (that prose duplicates the confirm step).
      const finalVisible = (visibleBuffer || "").trim();
      let extractionParseOk = false;

      if (jsonBuffer != null) {
        const extracted = extractJsonObject(jsonBuffer);
        if (!extracted) {
          setExtractionError(
            "Something went wrong extracting your goal. Try replying again in a different way.",
          );
          setExtractionComplete(false);
          setIntakePayload(null);
        } else {
          try {
            const obj = JSON.parse(extracted);
            const v = validateIntakePayload(obj);
            if (!v.ok) {
              setExtractionError(
                "Something went wrong extracting your goal. Try replying again in a different way.",
              );
              setExtractionComplete(false);
              setIntakePayload(null);
            } else {
              const label = v.course_label || deriveCourseLabelFallback(v.crisp_statement);
              const payload = {
                ...obj,
                crisp_statement: v.crisp_statement,
                course_label: label,
              };
              setIntakePayload(payload);
              setCourseLabel(label);
              setExtractionComplete(true);
              extractionParseOk = true;
            }
          } catch (e) {
            console.error("Failed parsing intake JSON:", e);
            setExtractionError(
              "Something went wrong extracting your goal. Try replying again in a different way.",
            );
            setExtractionComplete(false);
            setIntakePayload(null);
          }
        }
      }

      if (finalVisible && !extractionParseOk) {
        setMessages((prev) => [...prev, { role: "assistant", content: finalVisible }]);
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

  async function handleCreateCourse() {
    const crisp = String(intakePayload?.crisp_statement || "").trim();
    const label = String(courseLabel || "").trim();
    if (!courseId || !crisp || !label || finalizing || intakeComplete) return;
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
          body: JSON.stringify({ crisp_statement: crisp, course_label: label }),
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
    if (!text || streaming || intakeComplete || !courseId || extractionComplete)
      return;
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

  if (resumeId && resumeHydrating && !bootError) {
    return (
      <div className="min-h-screen bg-white pt-24 flex items-center justify-center">
        <CreativeSpinner label="Resuming intake" />
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

  return (
    <div className="min-h-screen w-full bg-white pt-40 pb-12">
        <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-3">
          New Course
        </p>
        <h1 className="font-display text-3xl tb:text-4xl text-black leading-snug tracking-tight mb-4">
          <span className="font-serif italic text-change">
            I want to think more effectively in
          </span>{" "}
          <span className="text-black">…</span>
        </h1>
        <p className="font-serif text-ash text-base leading-relaxed mb-8">
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
            {!!extractionError && (
              <p className="mb-4 text-sm text-primary">{extractionError}</p>
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
              {streaming && liveVisibleAssistant && (
                <MessageBubble
                  role="assistant"
                  content={liveVisibleAssistant}
                  streaming
                />
              )}
              {streaming && markerSeen && (
                <div className="flex items-center gap-2 py-2">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full rounded-full bg-change opacity-60 animate-ping" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-change" />
                  </span>
                  <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase">
                    Extracting your course…
                  </p>
                </div>
              )}
            </div>

            {extractionComplete || intakeComplete ? (
              <div className="border-t border-mist pt-6 space-y-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-mono text-[10px] tracking-[0.2em] text-change uppercase">
                    {intakeComplete ? "Course created" : "Confirm your course sentence"}
                  </span>
                </div>
                <div
                  className={`rounded-lg px-4 py-3 min-h-[3.25rem] flex flex-wrap items-baseline gap-x-2 gap-y-2 bg-white border-2 ${
                    justUnlockedLabel
                      ? "border-change/50 shadow-[0_0_0_4px_rgba(123,97,255,0.12)]"
                      : "border-black/15"
                  } transition-shadow`}
                >
                  <span className="font-serif italic text-lg text-black shrink-0">
                    I want to think more effectively in
                  </span>
                  <input
                    ref={courseLabelRef}
                    type="text"
                    value={courseLabel}
                    onChange={(e) => setCourseLabel(e.target.value)}
                    disabled={intakeComplete || finalizing}
                    placeholder="…your focus here"
                    className="flex-1 min-w-[12rem] bg-transparent border-0 border-b-2 border-black/25 focus:border-black px-0 py-1 text-black text-lg leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none focus:ring-0 disabled:opacity-50 transition-colors"
                  />
                </div>

                {!intakeComplete && (
                  <div className="flex items-center gap-4 flex-wrap">
                    <Button
                      onClick={handleCreateCourse}
                      isDisabled={!String(courseLabel || "").trim() || finalizing}
                      className="bg-primary text-white hover:bg-primary/90 h-12 px-6 font-medium disabled:opacity-40"
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
            ) : (
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
                    !input.trim()
                  }
                  className="bg-black text-white hover:bg-ash h-12 px-5"
                  radius="none"
                >
                  Send
                </Button>
              </form>
            )}
          </>
        )}
    </div>
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

/** Readable chat width: cap long lines, shrink short messages with w-fit. */
const BUBBLE_MAX = "max-w-[min(42rem,85%)] w-fit";

function MessageBubble({ role, content, streaming }) {
  const visible = useTypewriter(content || "", !!streaming);
  if (role === "user") {
    return (
      <div className="flex w-full flex-col items-end">
        <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase mb-1">
          You
        </p>
        <div
          className={`${BUBBLE_MAX} bg-mist rounded-lg px-4 py-3 text-black text-base leading-relaxed whitespace-pre-wrap break-words font-serif italic`}
        >
          {content}
        </div>
      </div>
    );
  }
  const showThinking = streaming && !visible;
  return (
    <div className="flex w-full flex-col items-start">
      <p className="font-mono text-[11px] tracking-[0.2em] text-change uppercase mb-1">
        AI {streaming ? "· typing" : ""}
      </p>
      <div
        className={`${BUBBLE_MAX} bg-change/10 border border-change/20 rounded-lg px-4 py-3 text-black text-base leading-relaxed whitespace-pre-wrap break-words`}
      >
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
