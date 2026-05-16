"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import GuideChatBubble from "@/components/chat/GuideChatBubble";
import { consumeSSETextStream } from "@/lib/sse-stream";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import IgniteCanvas from "@/components/ignite/IgniteCanvas";
import ElementsSidebar from "@/components/canvas/ElementsSidebar";
import CanvasSkeleton from "@/components/canvas/CanvasSkeleton";
import { GOAL_WORKSPACE_BACK } from "@/components/goal-workspace/goalWorkspaceCopy";
import {
  getIgniteState,
  mapIgniteThoughtToCanvas,
  mapIgniteConnectionToCanvas,
  igniteCreateThought,
  igniteUpdatePosition,
  igniteDeleteThought,
  igniteCreateConnection,
  igniteDeleteConnection,
} from "@/lib/ignite-api";

function makeTempId() {
  return `temp-${crypto.randomUUID?.() || Date.now()}`;
}

export default function IgniteProblemPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.ignite_problem_id;
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [thoughts, setThoughts] = useState([]);
  const [connections, setConnections] = useState([]);
  const [messages, setMessages] = useState([]);
  const [problem, setProblem] = useState(null);
  const [selectedElement, setSelectedElement] = useState(null);
  const [selectedSubElement, setSelectedSubElement] = useState(null);
  const [draft, setDraft] = useState("");
  const [chatSending, setChatSending] = useState(false);
  const [courseGoalLabel, setCourseGoalLabel] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatOpen, setChatOpen] = useState(true);
  const chatScrollRef = useRef(null);
  const chatAbortRef = useRef(null);

  const courseId = problem?.course_id ? String(problem.course_id) : "";
  const puzzlesBackHref = courseId
    ? `/ignite?course_id=${encodeURIComponent(courseId)}`
    : "/ignite";

  const thoughtsByElement = useMemo(() => {
    const m = {};
    for (const t of thoughts) {
      if (t.element) m[t.element] = (m[t.element] || 0) + 1;
    }
    return m;
  }, [thoughts]);

  const reload = useCallback(async () => {
    if (!id) return;
    const data = await getIgniteState(String(id), getToken);
    setProblem(data.problem);
    setThoughts((data.thoughts || []).map((t) => mapIgniteThoughtToCanvas(t, String(id))));
    setConnections((data.connections || []).map((c) => mapIgniteConnectionToCanvas(c, String(id))));
    setMessages(
      (data.messages || []).map((m) => ({
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content || "",
      })),
    );
  }, [id, getToken]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !id) return;
    let c = false;
    (async () => {
      try {
        setLoading(true);
        await reload();
      } catch (e) {
        if (!c) setError(e.message || "Failed to load");
      } finally {
        if (!c) setLoading(false);
      }
    })();
    return () => {
      c = true;
    };
  }, [isLoaded, isSignedIn, id, reload]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn || !courseId) return;
    let cancelled = false;
    (async () => {
      try {
        const token = await getToken();
        const res = await fetch(`/api/backend-api/course/${courseId}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) return;
        const data = await res.json();
        const row = data.course || data;
        const label = (row.course_label || row.crisp_statement || "").trim();
        if (!cancelled && label) setCourseGoalLabel(label);
      } catch {
        /* optional */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, courseId, getToken]);

  function clearSelection() {
    setSelectedElement(null);
    setSelectedSubElement(null);
  }

  const handleCreateThought = useCallback(
    async (body) => {
      const tempId = makeTempId();
      const temp = {
        id: tempId,
        course_puzzle_id: String(id),
        ...body,
        flow_order: 0,
        time_spent_seconds: null,
        is_nudge: false,
        kind: "thought",
        created_at: new Date().toISOString(),
      };
      setThoughts((prev) => [...prev, temp]);
      const row = await igniteCreateThought(String(id), body, getToken);
      const real = mapIgniteThoughtToCanvas(row, String(id));
      setThoughts((prev) => prev.map((t) => (t.id === tempId ? real : t)));
      return real;
    },
    [id, getToken],
  );

  const handleUpdateThoughtPosition = useCallback(
    async (thoughtId, pos_x, pos_y) => {
      if (String(thoughtId).startsWith("temp-")) return;
      setThoughts((prev) =>
        prev.map((t) => (t.id === thoughtId ? { ...t, pos_x, pos_y } : t)),
      );
      await igniteUpdatePosition(thoughtId, pos_x, pos_y, getToken);
    },
    [getToken],
  );

  const handleDeleteThought = useCallback(
    async (thoughtId) => {
      if (String(thoughtId).startsWith("temp-")) {
        setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
        return;
      }
      setThoughts((prev) => prev.filter((t) => t.id !== thoughtId));
      setConnections((prev) =>
        prev.filter(
          (c) => c.from_thought_id !== thoughtId && c.to_thought_id !== thoughtId,
        ),
      );
      await igniteDeleteThought(thoughtId, getToken);
    },
    [getToken],
  );

  const handleCreateConnection = useCallback(
    async (from, to) => {
      const tempId = makeTempId();
      const temp = {
        id: tempId,
        course_puzzle_id: String(id),
        from_thought_id: from,
        to_thought_id: to,
        created_at: new Date().toISOString(),
      };
      setConnections((prev) => [...prev, temp]);
      const row = await igniteCreateConnection(String(id), from, to, getToken);
      const real = mapIgniteConnectionToCanvas(row, String(id));
      setConnections((prev) => prev.map((c) => (c.id === tempId ? real : c)));
      return real;
    },
    [id, getToken],
  );

  const handleDeleteConnection = useCallback(
    async (connectionId) => {
      if (String(connectionId).startsWith("temp-")) {
        setConnections((prev) => prev.filter((c) => c.id !== connectionId));
        return;
      }
      setConnections((prev) => prev.filter((c) => c.id !== connectionId));
      await igniteDeleteConnection(connectionId, getToken);
    },
    [getToken],
  );

  useEffect(() => {
    const el = chatScrollRef.current;
    if (!el) return;
    el.scrollTop = el.scrollHeight;
  }, [messages]);

  useEffect(() => {
    return () => {
      chatAbortRef.current?.abort();
    };
  }, []);

  async function sendChat() {
    const text = draft.trim();
    if (!text || !id || chatSending) return;

    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setChatSending(true);
    setDraft("");
    setMessages((prev) => [
      ...prev,
      { role: "user", content: text },
      { role: "assistant", content: "", streaming: true },
    ]);

    const controller = new AbortController();
    chatAbortRef.current = controller;

    const appendChunk = (chunk) => {
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant" || !last.streaming) return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, content: (last.content || "") + chunk },
        ];
      });
    };

    try {
      const token = await getToken();
      const res = await fetch(`/api/backend-api/ignite/${id}/guide`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: historyForApi, user_message: text }),
        signal: controller.signal,
      });
      if (!res.ok || !res.body) {
        const detail = await res.text().catch(() => "");
        throw new Error(
          `Chat failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
        );
      }

      await consumeSSETextStream(res.body, {
        signal: controller.signal,
        onText: (delta) => appendChunk(delta),
      });

      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [...prev.slice(0, -1), { ...last, streaming: false }];
      });
    } catch (e) {
      if (e?.name === "AbortError") {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") return prev;
          return [...prev.slice(0, -1), { ...last, streaming: false }];
        });
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last?.role === "assistant" && last.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                role: "assistant",
                content: `⚠️ ${e.message || "Chat failed"}`,
                streaming: false,
              },
            ];
          }
          return [
            ...prev,
            {
              role: "assistant",
              content: `⚠️ ${e.message || "Chat failed"}`,
              streaming: false,
            },
          ];
        });
      }
    } finally {
      chatAbortRef.current = null;
      setChatSending(false);
    }
  }

  if (!isLoaded || !isSignedIn || loading) {
    return <CanvasSkeleton withNavbar />;
  }
  if (error) {
    return (
      <div className="p-8">
        <p className="text-red-600 text-sm">{error}</p>
        <button className="mt-4 underline text-sm" onClick={() => router.push("/goals")}>
          Back
        </button>
      </div>
    );
  }

  const problemTitle = (problem?.title || "").trim();
  const headerLine = problemTitle || courseGoalLabel || "Ignite problem";

  return (
    <div className="mt-[var(--navbar-height)] flex min-h-0 h-[calc(100svh-var(--navbar-height))] max-h-[calc(100svh-var(--navbar-height))] supports-[height:100dvh]:h-[calc(100dvh-var(--navbar-height))] supports-[height:100dvh]:max-h-[calc(100dvh-var(--navbar-height))] bg-white overflow-hidden">
      {sidebarOpen ? (
        <aside className="w-64 shrink-0 border-r border-mist flex flex-col min-h-0 bg-white">
          <div className="flex-1 min-h-0">
            <ElementsSidebar
              variant="accordion"
              selectedElement={selectedElement}
              selectedSubElement={selectedSubElement}
              onCollapse={() => setSidebarOpen(false)}
              onSelect={(el, sub) => {
                if (selectedSubElement === sub) {
                  setSelectedElement(null);
                  setSelectedSubElement(null);
                } else {
                  setSelectedElement(el);
                  setSelectedSubElement(sub);
                }
              }}
              onClear={clearSelection}
              thoughtsByElement={thoughtsByElement}
            />
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="w-10 shrink-0 border-r border-mist flex flex-col items-center py-3 hover:bg-mist/40 transition-colors"
          title="Expand elements panel"
          aria-label="Expand elements panel"
        >
          <svg className="w-4 h-4 text-smoke" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <header className="shrink-0 border-b border-mist bg-white h-10 flex items-center gap-3 px-3 min-w-0">
          <Link
            href={puzzlesBackHref}
            className="shrink-0 text-sm text-ash hover:text-black no-underline inline-flex items-center gap-1"
          >
            <span aria-hidden>←</span>
            <span>{GOAL_WORKSPACE_BACK.puzzles}</span>
          </Link>
          <span className="min-w-0 truncate text-sm text-smoke" title={headerLine}>
            {headerLine}
          </span>
        </header>

        <div className="flex-1 relative min-h-0 overflow-hidden">
          <IgniteCanvas
            coursePuzzleId={String(id)}
            thoughts={thoughts}
            connections={connections}
            selectedElement={selectedElement}
            selectedSubElement={selectedSubElement}
            onCreateThought={handleCreateThought}
            onUpdateThoughtPosition={handleUpdateThoughtPosition}
            onUpdateThoughtContent={null}
            onUpdateThoughtTagging={null}
            onDeleteThought={handleDeleteThought}
            onCreateConnection={handleCreateConnection}
            onDeleteConnection={handleDeleteConnection}
            onClearElement={clearSelection}
          />
        </div>
      </div>

      {chatOpen ? (
        <aside className="w-[380px] shrink-0 border-l border-mist flex flex-col bg-white min-h-0 z-10">
          <div className="flex items-center justify-between border-b border-mist px-4 py-3">
            <h3 className="font-mono text-[12px] font-medium uppercase tracking-[0.15em] text-accent-blue">
              Ignite guide
            </h3>
            <button
              type="button"
              onClick={() => setChatOpen(false)}
              className="p-1.5 rounded-md text-smoke hover:text-black hover:bg-white/80 transition-colors"
              title="Hide guide chat"
              aria-label="Hide guide chat"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div
            ref={chatScrollRef}
            className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-3 text-sm"
          >
            {messages.map((m, i) => (
              <GuideChatBubble
                key={i}
                role={m.role}
                content={m.content}
                streaming={!!m.streaming}
              />
            ))}
          </div>
          <div className="border-t border-mist p-3">
            <div className="flex items-end gap-2">
              <textarea
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    sendChat();
                  }
                }}
                rows={2}
                className="flex-1 min-h-[52px] max-h-[200px] resize-none rounded-lg border border-mist bg-white px-3 py-2.5 text-sm leading-relaxed text-[#2A2A2A] focus:border-[#999999] focus:outline-none"
                placeholder="Ask the guide…"
                disabled={chatSending}
              />
              <button
                type="button"
                disabled={chatSending || !draft.trim()}
                onClick={sendChat}
                className="px-3 py-2.5 bg-change text-white text-sm rounded-lg font-medium self-end hover:bg-change/90 disabled:opacity-40 transition-colors"
              >
                {chatSending ? "…" : "Send"}
              </button>
            </div>
            <p className="text-[10px] text-smoke mt-1.5 text-center">
              Enter to send · Shift+Enter for new line
            </p>
          </div>
        </aside>
      ) : (
        <button
          type="button"
          onClick={() => setChatOpen(true)}
          className="fixed right-4 top-1/2 z-30 flex -translate-y-1/2 items-center gap-2 rounded-l-xl border border-r-0 border-mist bg-white px-3 py-3 text-smoke shadow-lg transition-all hover:bg-[#FAFAFA]"
          title="Open Ignite guide"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
          <span className="text-xs font-medium" style={{ writingMode: "vertical-rl" }}>
            Guide
          </span>
        </button>
      )}
    </div>
  );
}
