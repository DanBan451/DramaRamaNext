"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import Canvas from "@/components/canvas/Canvas";
import ElementsSidebar from "@/components/canvas/ElementsSidebar";
import CreativeSpinner from "@/components/CreativeSpinner";
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

  const reload = useCallback(async () => {
    if (!id) return;
    const data = await getIgniteState(String(id), getToken);
    setProblem(data.problem);
    setThoughts((data.thoughts || []).map((t) => mapIgniteThoughtToCanvas(t, String(id))));
    setConnections((data.connections || []).map((c) => mapIgniteConnectionToCanvas(c, String(id))));
    setMessages(data.messages || []);
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

  async function sendChat() {
    const text = draft.trim();
    if (!text || !id) return;
    setChatSending(true);
    setDraft("");
    setMessages((prev) => [...prev, { role: "user", content: text }]);
    try {
      const token = await getToken();
      const history = messages.map((m) => ({
        role: m.role,
        content: m.content,
      }));
      const res = await fetch(`/api/backend-api/ignite/${id}/guide`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ messages: history, user_message: text }),
      });
      if (!res.ok || !res.body) throw new Error("chat failed");
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let full = "";
      let leftover = "";
      setMessages((prev) => [...prev, { role: "assistant", content: "" }]);
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        const chunk = leftover + decoder.decode(value, { stream: true });
        const parts = chunk.split("\n\n");
        leftover = parts.pop() || "";
        for (const evt of parts) {
          const line = evt.trim();
          if (!line.startsWith("data:")) continue;
          const payload = line.slice(5).trim();
          if (payload === "[DONE]") continue;
          try {
            const obj = JSON.parse(payload);
            if (obj.text) {
              full += obj.text;
              setMessages((prev) => {
                const copy = [...prev];
                copy[copy.length - 1] = { role: "assistant", content: full };
                return copy;
              });
            }
          } catch {
            /* ignore */
          }
        }
      }
    } catch (e) {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `⚠️ ${e.message || "Chat failed"}` },
      ]);
    } finally {
      setChatSending(false);
    }
  }

  if (!isLoaded || !isSignedIn || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <CreativeSpinner label="Loading Ignite" />
      </div>
    );
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

  return (
    <div
      className="mt-[var(--navbar-height)] flex min-h-0 h-[calc(100svh-var(--navbar-height))] max-h-[calc(100svh-var(--navbar-height))] supports-[height:100dvh]:h-[calc(100dvh-var(--navbar-height))] supports-[height:100dvh]:max-h-[calc(100dvh-var(--navbar-height))] bg-white overflow-hidden"
    >
      <aside className="w-64 shrink-0 border-r border-mist flex flex-col min-h-0">
        <div className="p-3 border-b border-mist">
          <button
            onClick={() => router.push("/goals")}
            className="text-sm text-ash hover:text-black"
          >
            ← Goals
          </button>
          <h1 className="font-display text-lg mt-2 text-black line-clamp-2">
            {problem?.title}
          </h1>
        </div>
        <ElementsSidebar
          selectedElement={selectedElement}
          selectedSubElement={selectedSubElement}
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
          thoughtsByElement={{}}
        />
      </aside>
      <div className="flex-1 min-w-0 min-h-0 flex flex-col">
        <div className="flex-1 relative min-h-0 overflow-hidden">
          <Canvas
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
      <aside className="w-80 shrink-0 border-l border-mist flex flex-col bg-white min-h-0 z-10">
        <div className="px-3 py-2 border-b border-mist text-[11px] font-mono uppercase text-smoke">
          Ignite guide
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-3 space-y-3 text-sm">
          {messages.map((m, i) => (
            <div
              key={i}
              className={
                m.role === "assistant"
                  ? "bg-change/10 border border-change/20 rounded-lg px-2 py-2 whitespace-pre-wrap"
                  : "text-right text-smoke"
              }
            >
              {m.content}
            </div>
          ))}
        </div>
        <div className="p-2 border-t border-mist flex gap-2">
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            rows={2}
            className="flex-1 border border-mist rounded-md px-2 py-1 text-sm"
            placeholder="Ask the guide…"
          />
          <button
            type="button"
            disabled={chatSending || !draft.trim()}
            onClick={sendChat}
            className="px-3 py-2 bg-primary text-white text-sm rounded-md self-end disabled:opacity-40"
          >
            Send
          </button>
        </div>
      </aside>
    </div>
  );
}
