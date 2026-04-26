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
 */
function visibleText(buffer) {
  if (!buffer) return "";
  const idx = buffer.indexOf(INTAKE_MARKER);
  return idx === -1 ? buffer : buffer.slice(0, idx).trimEnd();
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

      // Confirm with backend whether intake committed
      if (completeFlag) {
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
    try {
      const token = await getToken();
      const res = await fetch(`/api/backend-api/course/${cid}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data?.course?.intake_status === "complete") {
        setIntakeComplete(true);
        setTimeout(() => {
          router.push(`/courses/${cid}/ready`);
        }, 2000);
      }
    } catch (e) {
      console.warn("Failed to confirm intake completion", e);
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

  const liveAssistant = visibleText(streamBuffer);

  return (
    <div className="min-h-screen bg-white pt-24 pb-12">
      <div className="max-w-[640px] mx-auto px-6 flex flex-col">
        {/* Eyebrow */}
        <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase mb-4">
          New Course
        </p>
        {/* Title */}
        <h1 className="font-display text-4xl tb:text-5xl text-black leading-[1.05] tracking-tight mb-10">
          Tell us what to <em className="italic">train</em>.
        </h1>

        {/* Transcript */}
        <div
          ref={transcriptRef}
          className="flex-1 max-h-[55vh] overflow-y-auto pr-1 mb-6 space-y-6"
        >
          {messages.map((m, i) => (
            <MessageBubble key={i} role={m.role} content={m.content} />
          ))}
          {streaming && liveAssistant && (
            <MessageBubble role="assistant" content={liveAssistant} streaming />
          )}
          {streaming && !liveAssistant && messages.length === 0 && (
            <div className="flex items-center gap-3 text-smoke text-sm">
              <Spinner size="sm" color="default" />
              <span className="font-mono text-[11px] tracking-[0.2em] uppercase">
                Thinking
              </span>
            </div>
          )}
          {intakeComplete && (
            <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase">
              Course committed. Redirecting…
            </p>
          )}
        </div>

        {/* Composer */}
        <form
          onSubmit={onSubmit}
          className="border-t border-mist pt-4 flex items-end gap-3"
        >
          <textarea
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
            className="flex-1 resize-none border border-mist focus:border-black bg-white text-black px-3 py-2 text-base leading-relaxed font-serif italic placeholder:not-italic placeholder:text-smoke focus:outline-none disabled:bg-mist/40 disabled:text-smoke"
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
    </div>
  );
}

function MessageBubble({ role, content, streaming }) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <p className="max-w-[85%] text-right font-serif italic text-black text-base leading-relaxed">
          {content}
        </p>
      </div>
    );
  }
  return (
    <div>
      <p className="font-mono text-[11px] tracking-[0.2em] text-smoke uppercase mb-1">
        AI {streaming ? "· typing" : ""}
      </p>
      <p className="text-black text-base leading-relaxed whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
