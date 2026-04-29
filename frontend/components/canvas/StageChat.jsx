"use client";

// Right-side chat panel for the canvas. The panel is *always* visible (the
// user can collapse it via the page-level toggle). Three stages:
//
//   Stage 1 — Think. Guide-only. The bot welcomes the user, explains the
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

const STAGE_1_WELCOME = `Welcome. This is **Stage 1 — Think**.

Your job here is to actually think through the puzzle on the canvas. Drop blocks, draw connections, and apply all five **Elements of Effective Thinking** as you go:

🌳 **Earth** — Understand the basics deeply.
🔥 **Fire** — Try things, fail effectively, learn.
💨 **Air** — Ask better questions.
🌊 **Water** — Let ideas flow and connect.
🪨 **Change** — Notice how your thinking is changing.

I'm here to remind you what each element means and how to approach this stage. I won't help you solve the puzzle and I won't extend your ideas — that's *your* work. When you feel ready, hit **Next Stage** at the top.`;

// Stage 2 chat welcome. One per primary element. Stage 2 is the moment
// the AI extends the user's flow: when the user advanced from Stage 1,
// the canvas page already called the backend nudge endpoint and dropped
// 4 concrete "AI Nudge" blocks on the canvas. So the chat shouldn't tell
// the user to drop blocks — that work is done. Instead the welcome
// message reveals the puzzle's primary element, points at the nudges
// they can now see, and tells them HOW to use the nudges (read each
// one, react to it on a new block of their own, connect, delete what
// doesn't help).
const STAGE_2_FLOWS = {
  earth: `**Stage 2 — Redirect.** Your puzzle leans on 🌳 **Earth** — *understand the basics deeply*.

I just dropped four **AI Nudge** blocks on your canvas (look for the dashed purple borders). Each one is a concrete, Earth-flavored prompt tailored to this puzzle. They're yours now — drag them, edit them, or delete the ones that don't help.

Here's how to work them:

1. Read each nudge. **Pick one** to start with — usually the simplest.
2. **React to it** on a new block of your own. Tag your reply with whichever 🌳 Earth sub-element fits (*Start with Simple*, *Spotlight the Specific*, or *Add the Adjective*).
3. **Connect** your reply to the nudge that prompted it.
4. Repeat for the other nudges. Delete any that feel off-target.
5. When the picture clarifies, drop one final block summarizing **the simplest version of the puzzle that still has its real structure**.

Ask me if you want me to clarify what an Earth sub-element is asking for — but I won't extend the nudges or solve the puzzle.`,

  fire: `**Stage 2 — Redirect.** Your puzzle leans on 🔥 **Fire** — *fail effectively*.

I just dropped four **AI Nudge** blocks on your canvas (dashed purple borders). Each one is a concrete, Fire-flavored prompt — a guess to make, a failure to inspect, an extreme case to push to. They're yours now — drag, edit, or delete freely.

Here's how to work them:

1. Read each nudge. **Pick one** and write your honest first attempt at it on a new block of your own. Tag it 🔥 Fire (*Fail Fast*, *Fail Again*, or *Fail Intentionally* — whichever fits).
2. **Connect** your attempt to the nudge that prompted it.
3. On another new block, write **exactly why your attempt might be wrong**. Tag it 🔥 Fire → *Fail Again*.
4. Repeat for the other nudges. Delete the ones that feel off-target.
5. When you've worked at least three nudges, drop a block describing **what edge of the puzzle you've now mapped** — the place between "definitely yes" and "definitely no".

Failing here is not losing. It's the cheap way to find the boundary of an idea. Ask me if a nudge is unclear — but I won't extend them or hand you the answer.`,

  air: `**Stage 2 — Redirect.** Your puzzle leans on 💨 **Air** — *create questions*.

I just dropped four **AI Nudge** blocks on your canvas (dashed purple borders). Each one is a sharp, Air-flavored question about this puzzle — meta-questions, basic questions, sideways questions. They're yours now — drag, edit, or delete freely.

Here's how to work them:

1. Read each nudge. **Pick one** that feels uncomfortable — that's usually the right one.
2. **Answer it** on a new block of your own. Tag your answer 🌳 Earth → *Start with Simple* (giving an answer is an Earth move; the question itself was Air).
3. **Connect** your answer to the nudge that prompted it.
4. On a new block, write a **better question** than the nudge itself. Tag it 💨 Air → *Ask Another Question*.
5. Repeat for the other nudges. Delete any that don't help.

The right question opens doors no answer can. Ask me if a nudge is unclear — but I won't extend them or solve the puzzle.`,

  water: `**Stage 2 — Redirect.** Your puzzle leans on 🌊 **Water** — *flow with ideas*.

I just dropped four **AI Nudge** blocks on your canvas (dashed purple borders). Each is a Water-flavored prompt — a path to run down, an obvious idea to doubt, a step beyond the first insight. They're yours now — drag, edit, or delete freely.

Here's how to work them:

1. Read each nudge. **Pick one** path and follow it on a new block of your own. Tag 🌊 Water (*Run Down All Paths*, *Embrace Doubt*, or *Never Stop*).
2. **Connect** your block to the nudge that prompted it.
3. When you hit a dead end, write a block **explaining why** it's a dead end. Tag 🌊 Water → *Embrace Doubt*.
4. Repeat with another nudge so multiple paths run in parallel.
5. **Connect** the surviving paths to each other. The shape of the connections IS the structure of the puzzle.

Don't commit too early. Ask me if a nudge is unclear — but I won't extend them or solve the puzzle.`,

  // Synthesis-tagged puzzles draw on all four elements at once. Nudges
  // for these are spread across the four elements; the welcome reflects
  // that and asks the user to react with whichever sub-element matches.
  synthesis: `**Stage 2 — Redirect.** Your puzzle is a 🪨 **Change** puzzle — it leans on all four elements together.

I just dropped four **AI Nudge** blocks on your canvas (dashed purple borders). Each one is tagged with a different element — one Earth, one Fire, one Air, one Water — so you can rep all of them on the same puzzle. They're yours now — drag, edit, or delete freely.

Here's how to work them:

1. Read each nudge. Notice which element it's tagged with.
2. **React** to each on a new block of your own. Tag your reply with a sub-element from the SAME family (e.g. respond to a Fire nudge with another Fire move).
3. **Connect** each of your replies to the nudge that prompted it.
4. Once you've worked all four, drop one final block titled "**What changed in my thinking?**" Tag it 🪨 Change.

Synthesis isn't a fifth element — it's what happens when the other four show up at the same table. Ask me if a nudge is unclear — but I won't extend them or solve the puzzle.`,
};

const STAGE_2_FLOW_DEFAULT = STAGE_2_FLOWS.synthesis;

const STAGE_3_REFLECT_WELCOME = `**Time to reflect.**

You've done real work on this puzzle. Before we move on, let's think about what actually happened.

What surprised you? Where did you get stuck — and what got you unstuck? Drop your reflections as blocks on the canvas (they'll show up with a warm gold border) or talk through them here.

When you're ready to connect this back to your real-world goal, hit **"Now bridge to my goal"** below.`;

const STAGE_3_BRIDGE_WELCOME = `**Let's bridge to your goal.**

Now the interesting part: how does what you just practiced connect to the thing you actually care about?

Think about where this kind of thinking shows up in your real work. What's one situation where you could use what you just did?`;

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
}) {
  // Stage 3 uses its own endpoint (phase-aware prompt)
  const endpoint = stage === 3
    ? `/api/backend-api/canvas/${coursePuzzleId}/stage3/chat`
    : `/api/backend-api/canvas/${coursePuzzleId}/chat/stream`;

  const payload = stage === 3
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
  primaryElement,
  coursePuzzleId,
  onClose,
  stage2WelcomeMessage,
  stage3Phase,
  onAdvanceToBridge,
  onCompletePuzzle,
  isCompleted = false,
}) {
  const { getToken } = useAuth();
  const welcome = useMemo(() => {
    if (stage === 1) return STAGE_1_WELCOME;
    if (stage === 2) {
      if (stage2WelcomeMessage) {
        return stage2WelcomeMessage;
      }
      return (
        STAGE_2_FLOWS[primaryElement] || STAGE_2_FLOW_DEFAULT
      );
    }
    if (stage === 3) {
      return stage3Phase === "bridge"
        ? STAGE_3_BRIDGE_WELCOME
        : STAGE_3_REFLECT_WELCOME;
    }
    return "";
  }, [stage, primaryElement, stage2WelcomeMessage, stage3Phase]);

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
            stage === 1
              ? "Ask about an element or this stage…"
              : stage === 2
                ? "Ask away — I'll just nudge you back to the flow."
                : stage3Phase === "bridge"
                  ? "How does this connect to your goal?"
                  : "What did you notice? What surprised you?"
          }
          className="flex-1 resize-none scrollbar-hide border border-mist rounded-md px-3 py-2 text-sm focus:outline-none focus:border-change/60 leading-relaxed"
          disabled={streaming || isCompleted}
          ref={textareaRef}
          style={{ maxHeight: TEXTAREA_MAX_PX, minHeight: TEXTAREA_MIN_PX }}
        />
        <button
          type="submit"
          disabled={streaming || !draft.trim() || isCompleted}
          className="px-3 py-2 bg-primary text-white text-sm rounded-md font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors self-end"
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
