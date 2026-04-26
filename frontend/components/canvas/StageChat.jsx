"use client";

// Right-side chat panel for the canvas. The panel is *always* visible (the
// user can collapse it via the page-level toggle). Three stage-specific
// behaviors:
//
//   Stage 1 — guide-only. The bot welcomes the user, explains the objective
//             (apply the 5 elements), and refuses to give puzzle answers or
//             extend the user's flow. Any user message gets a reply that
//             stays inside this scope.
//
//   Stage 2 — synthesis nudge. A single auto-generated AI proposal sits at
//             the top of the canvas (NOT in this chat). The chat itself
//             stays available for clarifying questions about the proposal,
//             but never re-runs the proposal.
//
//   Stage 3 — reflection chat. Free-form dialogue; bot asks reflective
//             questions tying this puzzle back to the user's larger goal.
//
// Backend endpoints for stage 2 / stage 3 don't exist yet (Phase 5+), so
// those stages currently render a placeholder. Stage 1 uses a deterministic
// client-side responder for now: enough to teach the user the rules without
// blocking on infra.

import { useEffect, useMemo, useRef, useState } from "react";

const STAGE_1_WELCOME = `Welcome. This is **Stage 1 — Think**.

Your job here is to actually think through the puzzle on the canvas. Drop blocks, draw connections, and apply all five **Elements of Effective Thinking** as you go:

🌳 **Earth** — Understand the basics deeply.
🔥 **Fire** — Try things, fail effectively, learn.
💨 **Air** — Ask better questions.
🌊 **Water** — Let ideas flow and connect.
🪨 **Change** — Notice how your thinking is changing.

I'm here to remind you what each element means and how to approach this stage. I won't help you solve the puzzle and I won't extend your ideas — that's *your* work. When you feel ready, hit **Next Stage** at the top.`;

const STAGE_2_PLACEHOLDER = `**Stage 2 — Extend** (coming in Phase 5).

In Stage 2 the AI will read your Stage 1 flow and post a one-time proposal at the top of the canvas: extra blocks and connections that build on what you wrote, marked with a purple AI border. You decide whether to keep them.

The chat stays open for clarifying questions, but it won't generate another proposal — Stage 2 is one-shot.`;

const STAGE_3_PLACEHOLDER = `**Stage 3 — Synthesize** (coming in Phase 5).

In Stage 3 we'll have a short reflective conversation: which elements you actually exercised, and how this puzzle connects back to the larger goal you came in with.`;

// Stage 1 is the only stage with real logic right now. The responder routes
// any user message into one of a small set of allowed answers: it can teach
// the elements, restate the stage objective, and politely refuse to help
// with the puzzle itself. It will not look at, comment on, or extend the
// user's flow under any circumstance.
function stage1Reply(message) {
  const m = message.trim().toLowerCase();
  if (!m) return null;

  // Detect "give me the answer" style prompts. Pattern is intentionally
  // wide; false positives just yield the same safe answer.
  const asksForAnswer =
    /(answer|solve|solution|hint|tell me|what is the|figure out|cheat|work it out|what should i)/.test(
      m,
    );
  if (asksForAnswer) {
    return `I can't give you the answer or steer you toward one — that's the whole point of Stage 1. My job is to make sure you understand **what you're supposed to be doing**, not to do it for you.\n\nIf you're stuck, try: pick one element (Earth, Fire, Air, Water) and ask yourself the question that element wants you to ask. The element list on the left has the descriptions.`;
  }

  if (/(earth|understand)/.test(m)) {
    return `🌳 **Earth — Understand Deeply.** Don't reach for clever moves until you've nailed the basics. Re-read the puzzle. State, in your own words, what's actually being asked. Spotlight the specific. Add detail.`;
  }
  if (/(fire|fail|try|attempt)/.test(m)) {
    return `🔥 **Fire — Fail Effectively.** Try something. Be willing to be wrong. A failed attempt narrows the search space. Aim to fail fast, fail again, and then fail intentionally to find the edges of an idea.`;
  }
  if (/(air|question|ask)/.test(m)) {
    return `💨 **Air — Create Questions.** The right question opens doors no answer can. Be your own Socrates. Ask basic questions. When you're stuck, change the question entirely.`;
  }
  if (/(water|flow|connect|connection)/.test(m)) {
    return `🌊 **Water — Flow with Ideas.** Don't commit to one path early. Run multiple paths in parallel. Doubt what feels obvious. Connect ideas with the arrows on the canvas — the point is to *see* the structure of your thinking.`;
  }
  if (/(change|transform|reflect)/.test(m)) {
    return `🪨 **Change** is what comes from applying the other four. You'll get to it explicitly in Stage 3. For now, focus on doing real Earth/Fire/Air/Water work in this stage.`;
  }
  if (/(stage|next|done|finish|move on)/.test(m)) {
    return `When you feel like you've genuinely applied all four elements (Earth/Fire/Air/Water) on the canvas, hit **Next Stage** at the top. You can't come back to Stage 1 once you advance — make sure your thinking here is real before you move on.`;
  }
  if (/(what|how|help|stuck|hi|hello|hey)/.test(m)) {
    return `In Stage 1, you do the thinking. Here's the loop:\n\n1. Pick a sub-element on the left.\n2. Click the canvas to drop a thought tagged with it.\n3. Drag the dot on a thought to another thought to draw an arrow — that's a connection.\n4. Repeat. Use all four primary elements at least once.\n\nAsk me about any specific element if you want to know what it wants from you.`;
  }

  // Default: stay in scope, gently redirect.
  return `I'm only here to explain the **5 Elements of Effective Thinking** and what you should be doing in Stage 1. I can't comment on your flow or push it forward. Ask me about Earth, Fire, Air, Water, or what this stage is for.`;
}

export default function StageChat({ stage, onClose }) {
  const welcome = useMemo(() => {
    if (stage === 1) return STAGE_1_WELCOME;
    if (stage === 2) return STAGE_2_PLACEHOLDER;
    if (stage === 3) return STAGE_3_PLACEHOLDER;
    return "";
  }, [stage]);

  const [messages, setMessages] = useState(() => [
    { role: "assistant", content: welcome },
  ]);
  const [draft, setDraft] = useState("");
  const scrollRef = useRef(null);

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

  function handleSend(e) {
    e.preventDefault();
    const trimmed = draft.trim();
    if (!trimmed) return;

    const next = [...messages, { role: "user", content: trimmed }];

    if (stage === 1) {
      const reply = stage1Reply(trimmed);
      if (reply) next.push({ role: "assistant", content: reply });
    } else {
      next.push({
        role: "assistant",
        content:
          "Stage 2 and Stage 3 chat aren't wired up yet — they'll arrive in a later phase.",
      });
    }

    setMessages(next);
    setDraft("");
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-mist">
      {/* Header */}
      <div className="px-4 py-3 border-b border-mist flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-change animate-pulse" />
          <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-change">
            Guide · Stage {stage}
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
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        {messages.map((m, i) => (
          <ChatBubble key={i} role={m.role} content={m.content} />
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
              : "Stage 2 / 3 chat coming soon…"
          }
          className="flex-1 resize-none border border-mist rounded-md px-3 py-2 text-sm focus:outline-none focus:border-change/60"
          disabled={stage !== 1}
        />
        <button
          type="submit"
          disabled={stage !== 1 || !draft.trim()}
          className="px-3 py-2 bg-change text-white text-sm rounded-md font-medium hover:bg-change/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Send
        </button>
      </form>
    </div>
  );
}

function ChatBubble({ role, content }) {
  if (role === "assistant") {
    return (
      <div className="flex gap-2.5">
        <span className="w-7 h-7 rounded-full bg-change/15 text-change flex items-center justify-center text-xs font-bold flex-shrink-0">
          AI
        </span>
        <div className="flex-1 text-sm text-black leading-relaxed whitespace-pre-wrap break-words">
          {renderMarkdownish(content)}
        </div>
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

// Tiny inline-bold renderer. Splits on **bold** and renders the bold segments
// as <strong>. Anything else stays plain text. Keeps us off a markdown lib
// for what is currently a handful of static replies.
function renderMarkdownish(text) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) => {
    if (/^\*\*[^*]+\*\*$/.test(p)) {
      return (
        <strong key={i} className="font-semibold">
          {p.slice(2, -2)}
        </strong>
      );
    }
    return <span key={i}>{p}</span>;
  });
}
