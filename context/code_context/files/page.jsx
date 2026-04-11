"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import Spinner from "@/components/Spinner";
import LiveDocument from "@/components/LiveDocument";
import { PUZZLES } from "@/lib/puzzles";

// ─── Puzzle Selection ─────────────────────────────────────────────────────────

function PuzzleCard({ puzzle, onSelect, index }) {
  return (
    <button
      onClick={() => onSelect(puzzle)}
      className="group text-left bg-white border border-mist hover:border-black transition-all duration-300 p-6 flex flex-col justify-between min-h-[200px] relative overflow-hidden"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Puzzle number */}
      <div className="flex items-start justify-between mb-4">
        <span className="font-mono text-xs text-smoke tracking-widest">
          {puzzle.number}
        </span>
        <span className="text-[10px] font-mono text-smoke/50 uppercase tracking-wider">
          {puzzle.category}
        </span>
      </div>

      {/* Title */}
      <h3 className="font-display text-xl text-black mb-3 group-hover:translate-x-1 transition-transform duration-200">
        {puzzle.title}
      </h3>

      {/* First line preview */}
      <p className="text-smoke text-sm leading-relaxed line-clamp-2">
        {puzzle.text.split("\n")[0]}
      </p>

      {/* Arrow on hover */}
      <div className="mt-4 flex justify-end">
        <span className="text-smoke group-hover:text-black group-hover:translate-x-1 transition-all duration-200 text-lg">
          →
        </span>
      </div>
    </button>
  );
}

function SetupPhase({ onStart }) {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { getToken } = useAuth();

  async function handleStart(puzzle) {
    setSelectedPuzzle(puzzle);
    setLoading(true);
    setErr("");

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

      onStart({
        puzzle,
        problemDescription: `PUZZLE: ${puzzle.title}\n\n${puzzle.text}`,
        sessionId: data.session_id,
        firstMessage: data.first_message,
      });
    } catch (e) {
      setErr(e?.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white px-6 py-24">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-16 max-w-xl">
          <h1 className="font-display text-4xl lp:text-5xl text-black mb-4">
            Pick a puzzle.
          </h1>
          <p className="text-smoke text-lg leading-relaxed">
            The goal is not to solve it. The goal is to think through it — to
            see it from every angle you can. The answer will come on its own.
          </p>
        </div>

        {err && <div className="text-primary text-sm mb-6">{err}</div>}

        {loading && (
          <div className="flex items-center justify-center py-20">
            <div className="text-center">
              <Spinner size="lg" color="black" />
              <p className="text-smoke mt-4 text-sm">
                Preparing your puzzle...
              </p>
            </div>
          </div>
        )}

        {!loading && (
          <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4">
            {PUZZLES.map((puzzle, i) => (
              <PuzzleCard
                key={puzzle.id}
                puzzle={puzzle}
                index={i}
                onSelect={handleStart}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Working Phase ────────────────────────────────────────────────────────────

function WorkingPhase({
  puzzle,
  problemDescription,
  sessionId,
  firstMessage,
  onComplete,
}) {
  const { getToken } = useAuth();

  const [messages, setMessages] = useState(() => {
    if (firstMessage) {
      return [{ role: "assistant", text: firstMessage, element: "earth" }];
    }
    return [];
  });
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [documentText, setDocumentText] = useState("");
  const [documentLoading, setDocumentLoading] = useState(true);
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [showPuzzle, setShowPuzzle] = useState(true);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Find puzzle from ID if resuming
  const activePuzzle =
    puzzle || PUZZLES.find((p) => problemDescription?.includes(p.title));

  // Load existing session data
  useEffect(() => {
    let cancelled = false;
    async function loadSessionData() {
      try {
        const token = await getToken({ skipCache: true });
        const [msgsRes, duRes] = await Promise.all([
          fetch(`/api/backend-api/session/${sessionId}/element-messages`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
          fetch(`/api/backend-api/session/${sessionId}/deep-understanding`, {
            headers: { Authorization: `Bearer ${token}` },
          }),
        ]);

        if (!cancelled && msgsRes.ok) {
          const data = await msgsRes.json();
          const allMsgs = [];
          Object.values(data.messages || {}).forEach((msgList) => {
            msgList.forEach((msg) => {
              allMsgs.push({
                role: msg.role,
                text: msg.message_text,
                element: msg.element_applied || "earth",
                createdAt: msg.created_at,
              });
            });
          });
          allMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          if (allMsgs.length > 0) setMessages(allMsgs);
        }

        if (!cancelled && duRes.ok) {
          const data = await duRes.json();
          if (data.understanding_document) setDocumentText(data.understanding_document);
        }

        if (!cancelled) setDocumentLoading(false);
      } catch (e) {
        console.error("Failed to load session data:", e);
        if (!cancelled) setDocumentLoading(false);
      }
    }
    loadSessionData();
    return () => { cancelled = true; };
  }, [sessionId, getToken]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Resize handler
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };
  useEffect(() => {
    if (!isResizing) return;
    const handleMouseMove = (e) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      setLeftPanelWidth(
        Math.min(Math.max(((e.clientX - rect.left) / rect.width) * 100, 25), 75)
      );
    };
    const handleMouseUp = () => setIsResizing(false);
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [isResizing]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isStreaming) return;

    setMessages((prev) => [...prev, { role: "user", text, element: null }]);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");

    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(`/api/backend-api/session/${sessionId}/chat`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ user_message: text }),
      });

      if (!res.ok) throw new Error("Failed to send message");

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let elementApplied = "earth";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          try {
            const parsed = JSON.parse(line.slice(6));
            if (parsed.type === "chunk") {
              assistantText += parsed.content;
              setStreamingText(assistantText);
            } else if (parsed.type === "done") {
              elementApplied = parsed.element || "earth";
            }
          } catch {}
        }
      }

      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: assistantText, element: elementApplied },
      ]);
      setStreamingText("");

      // Refresh document
      try {
        const duRes = await fetch(
          `/api/backend-api/session/${sessionId}/deep-understanding`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        if (duRes.ok) {
          const data = await duRes.json();
          if (data.understanding_document) setDocumentText(data.understanding_document);
        }
      } catch {}
    } catch (e) {
      console.error("Chat error:", e);
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          text: "Something went wrong. Try again.",
          element: "earth",
        },
      ]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  async function handleComplete() {
    setCompleteLoading(true);
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch("/api/backend-api/session/complete", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error("Failed to complete");
      setCompletionData(await res.json());
    } catch (e) {
      console.error("Complete error:", e);
    } finally {
      setCompleteLoading(false);
    }
  }

  return (
    <div
      ref={containerRef}
      className="h-screen pt-16 bg-white flex flex-col lp:flex-row overflow-hidden max-w-[1536px] mx-auto"
    >
      {/* ── Left: Puzzle + Understanding ── */}
      <div
        className="flex flex-col border-b lp:border-b-0 border-mist max-h-[40vh] lp:max-h-none lp:flex-shrink-0 overflow-hidden"
        style={{ width: `${leftPanelWidth}%` }}
      >
        {/* Puzzle toggle header */}
        <div className="flex-shrink-0 px-6 py-4 border-b border-mist bg-white flex items-center justify-between">
          <div className="flex gap-4">
            <button
              onClick={() => setShowPuzzle(true)}
              className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                showPuzzle ? "text-black" : "text-smoke hover:text-ash"
              }`}
            >
              The Puzzle
            </button>
            <button
              onClick={() => setShowPuzzle(false)}
              className={`text-xs font-mono uppercase tracking-widest transition-colors ${
                !showPuzzle ? "text-black" : "text-smoke hover:text-ash"
              }`}
            >
              Your Understanding
            </button>
          </div>
        </div>

        {/* Content area */}
        <div className="flex-1 overflow-y-auto px-6 py-6">
          {showPuzzle ? (
            <div>
              {activePuzzle && (
                <>
                  <span className="font-mono text-xs text-smoke tracking-widest block mb-2">
                    {activePuzzle.number}
                  </span>
                  <h2 className="font-display text-2xl text-black mb-6">
                    {activePuzzle.title}
                  </h2>
                  <div className="text-ash text-sm leading-relaxed whitespace-pre-line">
                    {activePuzzle.text}
                  </div>
                </>
              )}
            </div>
          ) : (
            <div className="border-l-2 border-ash/20 pl-4">
              {documentLoading ? (
                <div className="space-y-3">
                  <div className="h-4 bg-mist rounded animate-pulse w-3/4" />
                  <div className="h-4 bg-mist rounded animate-pulse w-full" />
                  <div className="h-4 bg-mist rounded animate-pulse w-5/6" />
                </div>
              ) : (
                <LiveDocument text={documentText} />
              )}
            </div>
          )}
        </div>

        {/* Complete button */}
        <div className="flex-shrink-0 px-6 py-3 border-t border-mist">
          <Button
            className="bg-transparent border border-mist text-smoke hover:bg-mist hover:text-black w-full text-xs"
            radius="none"
            size="sm"
            isLoading={completeLoading}
            onPress={handleComplete}
          >
            Finish Session
          </Button>
        </div>
      </div>

      {/* Resize handle */}
      <div
        className="hidden lp:flex resize-handle"
        onMouseDown={handleMouseDown}
      />

      {/* ── Right: Conversation ── */}
      <div className="flex flex-col bg-mist/20 flex-1">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${
                msg.role === "user" ? "justify-end" : "justify-start"
              }`}
            >
              <div
                className={`max-w-[85%] px-4 py-3 ${
                  msg.role === "user"
                    ? "bg-black text-white rounded-2xl rounded-br-sm"
                    : "bg-white border border-mist text-ash rounded-2xl rounded-bl-sm shadow-sm"
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {msg.text}
                </p>
              </div>
            </div>
          ))}

          {/* Streaming */}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 bg-white border border-mist text-ash rounded-2xl rounded-bl-sm shadow-sm">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-1.5 h-4 bg-smoke/40 ml-0.5 animate-pulse" />
                </p>
              </div>
            </div>
          )}

          {/* Typing dots */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 bg-white border border-mist rounded-2xl rounded-bl-sm shadow-sm">
                <div className="flex gap-1">
                  <span className="w-1.5 h-1.5 bg-smoke/40 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-1.5 h-1.5 bg-smoke/40 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-1.5 h-1.5 bg-smoke/40 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-mist bg-white">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="What do you think?"
              className="flex-1 px-4 py-3 bg-white border border-mist text-black placeholder:text-smoke/50 text-sm rounded-full focus:border-ash outline-none transition-colors"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              className="bg-black text-white font-medium px-6 hover:bg-ash rounded-full"
              isDisabled={!inputText.trim() || isStreaming}
              size="md"
            >
              →
            </Button>
          </form>
        </div>
      </div>

      {/* Completion Modal */}
      {completionData && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white max-w-lg w-full p-10 shadow-2xl">
            <div className="text-center mb-8">
              <span className="font-mono text-xs text-smoke tracking-widest">
                SESSION COMPLETE
              </span>
              <h2 className="font-display text-3xl text-black mt-2 mb-3">
                Well done.
              </h2>
              {completionData.thinker_description && (
                <p className="text-smoke italic text-sm">
                  {completionData.thinker_description}
                </p>
              )}
            </div>

            {completionData.analysis?.key_insight && (
              <div className="mb-8 border-l-2 border-ash/20 pl-4">
                <p className="text-xs font-mono text-smoke uppercase tracking-wider mb-2">
                  Key Insight
                </p>
                <p className="text-sm text-ash leading-relaxed">
                  {completionData.analysis.key_insight}
                </p>
              </div>
            )}

            <Button
              className="bg-black text-white font-medium w-full hover:bg-ash"
              radius="none"
              onPress={onComplete}
            >
              Back to Puzzles
            </Button>
          </div>
        </div>
      )}
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
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || phase === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <Spinner size="lg" color="black" />
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center p-8">
          <h2 className="font-display text-2xl text-black mb-3">
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
      <WorkingPhase
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
