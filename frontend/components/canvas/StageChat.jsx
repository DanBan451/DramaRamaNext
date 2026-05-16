"use client";

// Right-side chat panel for the canvas. The panel is *always* visible (the
// user can collapse it via the page-level toggle). Three stages:
//
//   Stage 1 — Forge. Guide-only. The bot welcomes the user, explains the
//             objective (apply the 5 elements), and refuses to give puzzle
//             answers or extend the user's flow.
//
//   Stage 2 — Redirect. The bot posts ONE flow tuned to the puzzle's
//             primary element — a sequence of nudges that, if followed,
//             develops the mental muscle this puzzle was generated to
//             train. After that, every user message gets the same
//             scripted deflection: "I can't give you more, keep going,
//             the goal isn't the answer — it's to actually practice the
//             5 elements." We never give the answer and we never extend
//             the flow we already proposed.
//
//   Stage 3 — Quintessence. (still placeholder — needs more design)
//
// Stage 1 and Stage 2 chat replies are streamed from the backend via the
// `/canvas/:cp_id/chat/stream` SSE endpoint, which calls Claude with a
// stage-specific system prompt. The puzzle's solution is never sent to the
// model. Stage 3 is still a static placeholder.
//
// The Stage 2 *welcome* message (the per-element "flow") is still rendered
// client-side from a constant — it's a deterministic, generic flow that
// trains the puzzle's primary element. The LLM only handles follow-up
// questions, where it must refuse to extend the flow.

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@clerk/nextjs";

// Composer textarea size bounds. Min ~one line; max ~10 lines so the
// composer never eats the message list.
const TEXTAREA_MIN_PX = 38;
const TEXTAREA_MAX_PX = 200;

const STAGE_1_WELCOME = `Welcome. This is **Stage 1 — Think on Your Own**.

Your job here is to actually think through the puzzle on the canvas. Drop blocks, draw connections, and apply all five **Elements of Effective Thinking** as you go:

🌳 **Earth** — Understand the basics deeply.
🔥 **Fire** — Try things, fail effectively, learn.
💨 **Air** — Ask better questions.
🌊 **Water** — Let ideas flow and connect.
🪨 **Change** — Notice how your thinking is changing.

I'm here to explain what each element means and how to use it in Forge — not which one to pick for this puzzle, and not the answer. When you're ready, use **Continue to Stage 2** at the top.`;

// Stage 2 has no static welcome message anymore. The fan-shape diagnostic
const STAGE_2_FALLBACK = `You're in **Stage 2 — Push Further**.

If you don't see nudge blocks yet, they're still being generated. Once they show up, extend your thinking from them — they're prompts, not answers.`;

const STAGE_3_REFLECT_WELCOME = `**Time to reflect.**

Use the reflection panel to answer three short questions, then forge a **Fire Starter** you can bring into Ignite.`;

const STAGE_3_BRIDGE_WELCOME = `**Let's keep bridging this to your goal.**

How does what we practiced here hook up to what you actually care about?

Where does this kind of thinking already show up in your life — and where might you try it next?`;

// Streams a chat reply from the backend SSE endpoint. Calls `onChunk(text)`
// for each delta as it arrives, then resolves with the full text. Throws on
// transport errors. Aborting the AbortController will stop the stream and
// resolve with whatever was received so far.
async function streamCanvasChat({
  coursePuzzleId,
  stage,
  history,
  userMessage,
  getToken,
  onChunk,
  signal,
  useStage3Endpoint,
}) {
  const useS3 = stage === 3 || useStage3Endpoint;
  const endpoint = useS3
    ? `/api/backend-api/canvas/${coursePuzzleId}/stage3/chat`
    : `/api/backend-api/canvas/${coursePuzzleId}/chat/stream`;

  const payload = useS3
    ? { history, user_message: userMessage }
    : { stage, history, user_message: userMessage };

  const token = await getToken();
  const res = await fetch(
    endpoint,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal,
    },
  );
  if (!res.ok || !res.body) {
    let detail = "";
    try {
      detail = await res.text();
    } catch {
      /* ignore */
    }
    throw new Error(
      `Chat request failed (${res.status})${detail ? `: ${detail.slice(0, 200)}` : ""}`,
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let leftover = "";
  let full = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    const text = leftover + decoder.decode(value, { stream: true });
    const events = text.split("\n\n");
    leftover = events.pop() || "";
    for (const evt of events) {
      const line = evt.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (payload === "[DONE]") return full;
      try {
        const obj = JSON.parse(payload);
        if (typeof obj.text === "string") {
          full += obj.text;
          onChunk(obj.text);
        } else if (obj.error) {
          throw new Error(obj.error);
        }
      } catch (e) {
        if (e instanceof SyntaxError) {
          /* ignore non-JSON keep-alive lines */
        } else {
          throw e;
        }
      }
    }
  }
  return full;
}

export default function StageChat({
  stage,
  coursePuzzleId,
  onClose,
  stage2WelcomeMessage,
  stage3Phase,
  onAdvanceToBridge,
  onCompletePuzzle,
  isCompleted = false,
  synthesis = null,
}) {
  const { getToken } = useAuth();
  const welcome = useMemo(() => {
    if (isCompleted) {
      const syn = (synthesis || "").trim();
      const head =
        "**Welcome back.** This puzzle is finished — your canvas is read-only, but we can still talk it through.";
      if (syn)
        return `${head}\n\n**Our closing note:**\n\n${syn}\n\nIf anything new occurs to you, or you want to connect this to what you're working on now, say it below.`;
      return `${head}\n\nIf you want to revisit how this connects to your goals, ask below.`;
    }
    if (stage === 1) return STAGE_1_WELCOME;
    if (stage === 2) {
      // Stage 2 welcome comes from the server's fan-shape engine; it's
      // tuned to the user's specific canvas state and the move that was
      // chosen. Only fall back to the neutral pointer if the server
      // somehow returned nothing (idempotent reseed, network blip).
      return stage2WelcomeMessage || STAGE_2_FALLBACK;
    }
    if (stage === 3) {
      return stage3Phase === "bridge"
        ? STAGE_3_BRIDGE_WELCOME
        : STAGE_3_REFLECT_WELCOME;
    }
    return "";
  }, [isCompleted, synthesis, stage, stage2WelcomeMessage, stage3Phase]);

  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: welcome },
  ]);
  const [draft, setDraft] = useState("");
  const [streaming, setStreaming] = useState(false);
  const scrollRef = useRef(null);
  const textareaRef = useRef(null);
  const abortRef = useRef(null);

  // Reset the conversation when the stage changes — each stage starts fresh
  // with its own welcome message.
  useEffect(() => {
    setMessages([{ role: "assistant", content: welcome }]);
    setDraft("");
  }, [stage, welcome]);

  // Auto-scroll to bottom on new messages.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages]);

  // Auto-grow the textarea up to TEXTAREA_MAX_PX. Reset to auto first so
  // the height shrinks when the user deletes lines, then re-measure
  // scrollHeight and clamp. useLayoutEffect avoids a flash before paint.
  useLayoutEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(
      Math.max(el.scrollHeight, TEXTAREA_MIN_PX),
      TEXTAREA_MAX_PX,
    );
    el.style.height = `${next}px`;
  }, [draft]);

  async function handleSend(e) {
    e.preventDefault();
    if (streaming) return;
    const trimmed = draft.trim();
    if (!trimmed) return;

    if (!coursePuzzleId) {
      setMessages((prev) => [
        ...prev,
        { role: "user", content: trimmed },
        {
          role: "assistant",
          content: "Chat unavailable — missing puzzle context.",
        },
      ]);
      setDraft("");
      return;
    }

    // Snapshot history that the model should see (everything BEFORE the
    // new user message). Map to the wire format expected by the backend.
    const historyForApi = messages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    setMessages((prev) => [
      ...prev,
      { role: "user", content: trimmed },
      { role: "assistant", content: "", streaming: true },
    ]);
    setDraft("");
    setStreaming(true);

    const controller = new AbortController();
    abortRef.current = controller;

    const appendChunk = (chunk) => {
      setMessages((prev) => {
        // Append into the last message if it's still the streaming
        // assistant placeholder we just inserted.
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant" || !last.streaming) return prev;
        const updated = {
          ...last,
          content: (last.content || "") + chunk,
        };
        return [...prev.slice(0, -1), updated];
      });
    };

    try {
      await streamCanvasChat({
        coursePuzzleId,
        stage,
        history: historyForApi,
        userMessage: trimmed,
        getToken,
        onChunk: appendChunk,
        signal: controller.signal,
        useStage3Endpoint: isCompleted,
      });
      // Mark the final assistant message as no-longer-streaming.
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (!last || last.role !== "assistant") return prev;
        return [
          ...prev.slice(0, -1),
          { ...last, streaming: false },
        ];
      });
    } catch (err) {
      if (err?.name === "AbortError") {
        // User cancelled; just clear the streaming flag.
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (!last || last.role !== "assistant") return prev;
          return [
            ...prev.slice(0, -1),
            { ...last, streaming: false },
          ];
        });
      } else {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.role === "assistant" && last.streaming) {
            return [
              ...prev.slice(0, -1),
              {
                role: "assistant",
                content: `⚠️ I couldn't reach the guide just now. ${err?.message || "Try again in a moment."}`,
                streaming: false,
              },
            ];
          }
          return prev;
        });
      }
    } finally {
      abortRef.current = null;
      setStreaming(false);
    }
  }

  // Cancel any in-flight stream on unmount or stage change.
  useEffect(() => {
    return () => {
      if (abortRef.current) abortRef.current.abort();
    };
  }, [stage]);

  return (
    <div className="h-full flex flex-col bg-white border-l border-mist">
      {/* Header. Deliberately neutral (smoke, not purple). The puzzle
          eyebrow in the canvas header is the one place that gets the
          purple treatment; duplicating it here created two competing
          "primary" labels. The stage indicator at the top of the page
          already tells you which stage you're on, so we don't repeat it
          here either. */}
      <div className="px-4 py-3 border-b border-mist flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-smoke" />
          <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
            Guide
          </h3>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-[11px] text-smoke hover:text-black transition-colors"
            title="Hide chat panel"
          >
            ✕
          </button>
        )}
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto scrollbar-hide px-4 py-4 space-y-4"
      >
        {messages.map((m, i) => (
          <ChatBubble
            key={i}
            role={m.role}
            content={m.content}
            streaming={m.streaming}
          />
        ))}
      </div>

      {/* Composer */}
      <form
        onSubmit={handleSend}
        className="border-t border-mist p-3 flex gap-2 items-end"
      >
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          rows={1}
          placeholder={
            isCompleted
              ? "Ask about this puzzle, the closing note, or your goals…"
              : stage === 1
                ? 'e.g. "What does Earth mean here?" or "How do I tag a thought?"'
                : stage === 2
                  ? 'e.g. "Which nudge should I answer first?" or "Can you explain this nudge?"'
                  : stage3Phase === "bridge"
                    ? "How does this connect to your goal?"
                    : "What did you notice? What surprised you?"
          }
          className="flex-1 resize-none scrollbar-hide border border-mist rounded-md px-3 py-2 text-sm focus:outline-none focus:border-change/60 leading-relaxed"
          disabled={streaming}
          ref={textareaRef}
          style={{ maxHeight: TEXTAREA_MAX_PX, minHeight: TEXTAREA_MIN_PX }}
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim()}
          className="px-3 py-2 bg-change text-white text-sm rounded-md font-medium hover:bg-change/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
        >
          {streaming ? "…" : "Send"}
        </button>
      </form>

      {/* Stage 3 action buttons — hidden when puzzle is completed */}
      {!isCompleted && stage === 3 && stage3Phase !== "bridge" && onAdvanceToBridge && (
        <div className="px-3 pb-3">
          <button
            onClick={onAdvanceToBridge}
            className="w-full px-3 py-2 text-sm font-medium rounded-md bg-amber-50 text-amber-800 border border-amber-200 hover:bg-amber-100 transition-colors"
          >
            Now bridge to my goal →
          </button>
        </div>
      )}
      {!isCompleted && stage === 3 && stage3Phase === "bridge" && onCompletePuzzle && (
        <div className="px-3 pb-3">
          <button
            onClick={onCompletePuzzle}
            className="w-full px-3 py-2 text-sm font-medium rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 hover:bg-emerald-100 transition-colors"
          >
            I'm done with this puzzle ✓
          </button>
        </div>
      )}
    </div>
  );
}

// Typewriter hook — gradually reveals `target` while `streaming` is true.
// When `streaming` flips false we snap to the full target so the user
// never sees a half-rendered final message. Reveal rate is intentionally
// fast enough to keep up with Claude (~2 chars per 16ms tick ≈ 125 cps)
// so we don't lag behind the model on long replies, but slow enough that
// short replies actually look like they're being typed.
function useTypewriter(target, streaming) {
  const [shown, setShown] = useState(target || "");
  const targetRef = useRef(target || "");
  const rafRef = useRef(null);

  useEffect(() => {
    targetRef.current = target || "";
    if (!streaming) {
      // Stream done — show everything immediately.
      if (rafRef.current) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
      setShown(targetRef.current);
      return;
    }
    if (rafRef.current) return; // already ticking
    rafRef.current = setInterval(() => {
      setShown((prev) => {
        const t = targetRef.current;
        if (prev.length >= t.length) return prev;
        // Reveal more chars per tick the further behind we are, so we
        // never let the visible text fall too far behind the model.
        const behind = t.length - prev.length;
        const step = Math.max(2, Math.ceil(behind / 24));
        return t.slice(0, prev.length + step);
      });
    }, 16);
    return () => {
      if (rafRef.current) {
        clearInterval(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [target, streaming]);

  return shown;
}

function ChatBubble({ role, content, streaming }) {
  const visible = useTypewriter(content, !!streaming);
  if (role === "assistant") {
    // Light-purple container, no avatar tag. Drops the "AI" badge per
    // user feedback ("obviously it's AI, why tag it?").
    const showThinking = streaming && !visible;
    return (
      <div className="bg-change/10 border border-change/20 rounded-lg px-3.5 py-3 text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
        {showThinking ? (
          <span className="inline-flex items-center gap-1 text-smoke italic">
            <span className="animate-pulse">Thinking</span>
            <span className="animate-pulse [animation-delay:120ms]">.</span>
            <span className="animate-pulse [animation-delay:240ms]">.</span>
            <span className="animate-pulse [animation-delay:360ms]">.</span>
          </span>
        ) : (
          <>
            {renderMarkdownish(visible)}
            {streaming && (
              <span className="inline-block w-1.5 h-4 align-text-bottom ml-0.5 bg-change/70 animate-pulse" />
            )}
          </>
        )}
      </div>
    );
  }
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] bg-mist rounded-md px-3 py-2 text-sm text-black whitespace-pre-wrap break-words">
        {content}
      </div>
    </div>
  );
}

// Tiny inline-markdown renderer. Splits on **bold** and *italic* and renders
// them. Anything else stays plain text. Keeps us off a full markdown lib —
// the model only emits these two inline emphasis patterns. We split on bold
// FIRST so that *italic* inside **bold** doesn't try to re-match. Single
// asterisk italics are non-greedy and don't span newlines so a stray
// asterisk in user content can't run away with the rest of the message.
function renderMarkdownish(text) {
  const boldParts = text.split(/(\*\*[^*]+\*\*)/g);
  return boldParts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    const italicParts = p.split(/(\*[^*\n]+\*)/g);
    return (
      <span key={i}>
        {italicParts.map((q, j) => {
          if (/^\*[^*\n]+\*$/.test(q)) {
            return (
              <em key={j} className="italic">
                {q.slice(1, -1)}
              </em>
            );
          }
          return <span key={j}>{q}</span>;
        })}
      </span>
    );
  });
}
