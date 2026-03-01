"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";

// ─── Element data ────────────────────────────────────────────────────────────

const ELEMENTS = [
  {
    id: "earth",
    emoji: "🌳",
    name: "Earth",
    title: "Understand Deeply",
    promptIndices: [0, 1, 2],
    subElements: [
      {
        version: "1.0",
        name: "Start with the Simple",
        description:
          "Start with a basic or trivial version of the challenge—one where you have a firm intellectual foothold. Probe that simple scenario more deeply to see the detail and structure that always lies beneath the surface.",
        prompt: "What are the absolute basics of this problem? Break it down to its simplest form.",
      },
      {
        version: "2.0",
        name: "Spotlight the Specific",
        description:
          "Warm up with a special case or specific example to gain new insight that can then be extended to the general situation. Reframe any structure discovered in that example to expose a general principle hidden in the original issue.",
        prompt: "Create a specific, simple example. What does the problem look like with concrete numbers?",
      },
      {
        version: "3.0",
        name: "Add the Adjective",
        description:
          "To understand anything in greater detail, challenge yourself to add as many descriptors as possible. Do not leave an adjective for another descriptor until some new facet is revealed.",
        prompt: "Add an adjective. How would you describe this problem to a colleague? What makes it unique?",
      },
    ],
  },
  {
    id: "fire",
    emoji: "🔥",
    name: "Fire",
    title: "Fail Effectively",
    promptIndices: [3, 4, 5],
    subElements: [
      {
        version: "1.0",
        name: "Fail Fast",
        description:
          "Free yourself from a focus on perfection and instead focus on process. Try doing it quickly and lousily—now you have something to respond to. Get that first failed effort out of the way as quickly as possible and start learning from it.",
        prompt: "Fail fast. Write a rough solution even if it's wrong. What's your first instinct?",
      },
      {
        version: "2.0",
        name: "Fail Again",
        description:
          "Imagine you must fail ten times to succeed. With this mindset, each failure becomes progress. Embrace the need to make ten initial mistakes—be open to being wrong and doubt those aspects of which you are certain.",
        prompt: "Fail again. What went wrong with your first approach? How can you improve it?",
      },
      {
        version: "3.0",
        name: "Fail Intentionally",
        description:
          "Consider extreme cases and remove all real constraints to create completely impractical thoughts and solutions. Determine the precise breakpoint where things went wrong—study it for what has promise.",
        prompt: "Fail intentionally. What's an extreme or impossible scenario? What breaks your solution?",
      },
    ],
  },
  {
    id: "air",
    emoji: "💨",
    name: "Air",
    title: "Create Questions",
    promptIndices: [6, 7, 8],
    subElements: [
      {
        version: "1.0",
        name: "Be Your Own Socrates",
        description:
          "Asking meta-questions throughout any thoughtful process will always shine a light onto the big picture. Ask 'What is the real issue here?'—it opens your mind to the possibility that you are considering the wrong question or problem.",
        prompt: "Be your own Socrates. What is the REAL question here? Are you solving the right problem?",
      },
      {
        version: "2.0",
        name: "Create Basic Questions",
        description:
          "Ask fundamental questions to make fundamental breakthroughs. Even wondering 'What does the simplest case look like?' is a powerful way of probing into the original, subtler scenario.",
        prompt: "Ask a basic question. What fundamental concept are you missing or taking for granted?",
      },
      {
        version: "3.0",
        name: "Ask Something Else",
        description:
          "Whether you are stuck or not, considering something else not only resets your thinking, but allows you to refocus on the issue in an entirely original way. Ask 'What's a different but related question?'",
        prompt: "Ask another question. What related question might give you insight into this one?",
      },
    ],
  },
  {
    id: "water",
    emoji: "🌊",
    name: "Water",
    title: "Go with the Flow of Ideas",
    promptIndices: [9, 10, 11],
    subElements: [
      {
        version: "1.0",
        name: "Run Down All Paths",
        description:
          "Whenever you are able, consider all possible cases, even the obviously impossible ones. Follow the flow of each scenario to its very end—most will lead to dead ends, but learn from those before traveling down the next.",
        prompt: "Run down all paths. What are ALL the possible approaches? Don't dismiss any yet.",
      },
      {
        version: "2.0",
        name: "Embrace Doubt",
        description:
          "Challenge your own narrow thinking and opinions to see where that flow takes you. Embrace doubt as a strength—wonder 'What if I'm wrong?' The opposite of doubt is not certainty, but rather closed-mindedness.",
        prompt: "Embrace doubt. What are you uncertain about? Where might you be wrong?",
      },
      {
        version: "3.0",
        name: "Never Stop",
        description:
          "Following the flow of an idea requires persistence and tenacity to see where that flow will carry you. Do not let go of an idea until it takes you somewhere new, unexpected, or to an insight into something otherwise unrelated.",
        prompt: "Never stop. Where does this idea lead? What's the next step after solving this?",
      },
    ],
  },
  {
    id: "change",
    emoji: "🪨",
    name: "Change",
    title: "Be Open to Change",
    promptIndices: [12],
    subElements: [
      {
        version: "∞",
        name: "Transform",
        description:
          "The puzzles themselves change through effective thinking: the way you first saw them will be different from how you see them after challenging yourself to understand more deeply. The ultimate goal is to change how you think.",
        prompt: "How has this problem changed your understanding? What do you see now that you didn't before?",
      },
    ],
  },
];

const ELEMENT_COLORS = {
  earth: { text: "text-earth", bg: "bg-earth/10", border: "border-earth/30", dot: "bg-earth" },
  fire: { text: "text-fire", bg: "bg-fire/10", border: "border-fire/30", dot: "bg-fire" },
  air: { text: "text-air", bg: "bg-air/10", border: "border-air/30", dot: "bg-air" },
  water: { text: "text-water", bg: "bg-water/10", border: "border-water/30", dot: "bg-water" },
  change: { text: "text-change", bg: "bg-change/10", border: "border-change/30", dot: "bg-change" },
};

function elementForPromptIdx(idx) {
  if (idx < 3) return "earth";
  if (idx < 6) return "fire";
  if (idx < 9) return "air";
  if (idx < 12) return "water";
  return "change";
}

// ─── Elements Sidebar ────────────────────────────────────────────────────────

function ElementsSidebar({ currentPromptIdx, expandedElements, onToggle }) {
  const currentElement = elementForPromptIdx(currentPromptIdx);
  const activeSubRef = useRef(null);

  useEffect(() => {
    if (activeSubRef.current) {
      activeSubRef.current.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [currentPromptIdx]);

  return (
    <div className="h-full overflow-y-auto py-6 px-4">
      <div className="text-xs uppercase tracking-widest text-smoke mb-4 px-2">Elements</div>
      <div className="space-y-1">
        {ELEMENTS.map((element) => {
          const isActive = element.id === currentElement;
          const isExpanded = expandedElements.has(element.id);
          const colors = ELEMENT_COLORS[element.id];

          return (
            <div key={element.id}>
              <button
                onClick={() => onToggle(element.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-colors ${
                  isActive ? `${colors.bg} ${colors.border} border` : "hover:bg-mist/60"
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <span className="text-lg">{element.emoji}</span>
                  <div>
                    <div className={`text-sm font-semibold ${isActive ? colors.text : "text-black"}`}>
                      {element.name}
                    </div>
                    <div className="text-xs text-smoke">{element.title}</div>
                  </div>
                </div>
                <span className={`text-xs transition-transform ${isExpanded ? "rotate-90" : ""} text-smoke`}>
                  ▶
                </span>
              </button>

              {isExpanded && (
                <div className="ml-3 mt-1 mb-2 space-y-1 border-l-2 border-mist pl-3">
                  {element.subElements.map((sub, subIdx) => {
                    const globalPromptIdx =
                      element.promptIndices.length > 0 ? element.promptIndices[subIdx] : null;
                    const isCurrentSub = globalPromptIdx === currentPromptIdx;

                    return (
                      <div
                        key={sub.version}
                        ref={isCurrentSub ? activeSubRef : null}
                        className={`px-2 py-2 rounded text-xs transition-colors ${
                          isCurrentSub ? `${colors.bg} ${colors.text} font-semibold` : "text-ash"
                        }`}
                      >
                        <div className="font-medium mb-0.5">
                          {element.id !== "change" ? sub.version : "∞"} — {sub.name}
                        </div>
                        <div className="text-smoke leading-relaxed">{sub.description}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Setup Phase ─────────────────────────────────────────────────────────────

function SetupPhase({ onStart }) {
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { getToken } = useAuth();

  async function handleGenerate(e) {
    e.preventDefault();
    const title = input.trim();
    if (!title) return;
    setLoading(true);
    setErr("");
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Unable to authenticate. Please sign in.");

      const puzzleRes = await fetch("/api/backend-api/puzzle/generate", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ algorithm_title: title }),
      });
      if (!puzzleRes.ok) {
        const j = await puzzleRes.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to generate puzzle.");
      }
      const { puzzle_text } = await puzzleRes.json();

      const sessionRes = await fetch("/api/backend-api/session/start", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ algorithm_title: title }),
      });
      if (!sessionRes.ok) {
        const j = await sessionRes.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to start session.");
      }
      const { session_id } = await sessionRes.json();

      // Cache puzzle so revisiting /workspace doesn't regenerate it
      localStorage.setItem(`dramarama_puzzle_${session_id}`, puzzle_text);

      onStart({
        algorithmTitle: title,
        puzzleText: puzzle_text,
        sessionId: session_id,
        initialSavedIndices: new Set(),
        initialAnswers: {},
        initialCurrentIdx: 0,
      });
    } catch (e) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎭</div>
          <h1 className="font-display text-4xl text-black mb-3">Workspace</h1>
          <p className="text-smoke">
            Enter an algorithm to think through. We'll transform it into an engaging puzzle and guide
            you through the 5 Elements of Effective Thinking.
          </p>
        </div>

        <form onSubmit={handleGenerate} className="flex flex-col gap-4">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. Two Sum, Binary Search, Merge Sort…"
            className="w-full px-4 py-3 border-2 border-mist focus:border-black outline-none text-black placeholder:text-smoke font-mono text-sm transition-colors"
            disabled={loading}
          />
          {err && <div className="text-fire text-sm">{err}</div>}
          <Button
            type="submit"
            className="bg-black text-white w-full"
            radius="none"
            isLoading={loading}
            isDisabled={!input.trim() || loading}
          >
            {loading ? "Generating your puzzle…" : "Generate Puzzle →"}
          </Button>
        </form>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-smoke">
          <span>12 prompts</span>
          <span>•</span>
          <span>5 Elements</span>
          <span>•</span>
          <span>On-demand nudge</span>
        </div>
      </div>
    </div>
  );
}

// ─── Working Phase ────────────────────────────────────────────────────────────

function WorkingPhase({
  algorithmTitle,
  puzzleText,
  sessionId,
  initialSavedIndices,
  initialAnswers,
  initialCurrentIdx,
  onComplete,
}) {
  const { getToken } = useAuth();

  const [prompts, setPrompts] = useState([]);

  const [currentIdx, setCurrentIdx] = useState(initialCurrentIdx ?? 0);
  const [answers, setAnswers] = useState(() => {
    const arr = Array.from({ length: 13 }, () => "");
    if (initialAnswers) {
      Object.entries(initialAnswers).forEach(([idx, text]) => {
        arr[parseInt(idx)] = text;
      });
    }
    return arr;
  });
  const [savedIndices, setSavedIndices] = useState(
    () => initialSavedIndices instanceof Set ? initialSavedIndices : new Set()
  );
  const [timers, setTimers] = useState(() => Array.from({ length: 13 }, () => null));

  const [saveLoading, setSaveLoading] = useState(false);
  const [saveErr, setSaveErr] = useState("");
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [nudgeText, setNudgeText] = useState("");
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeErr, setNudgeErr] = useState("");
  const [nudgeVisible, setNudgeVisible] = useState(false);

  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeErr, setCompleteErr] = useState("");

  const [expandedElements, setExpandedElements] = useState(() => new Set(["earth"]));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navbarHidden, setNavbarHidden] = useState(false);

  // Resizable input panel
  const [inputHeight, setInputHeight] = useState(280);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Fetch prompts
  useEffect(() => {
    let cancelled = false;
    fetch("/api/backend-api/prompts", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPrompts(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Timer + sidebar auto-expand
  useEffect(() => {
    setTimers((prev) => {
      const next = [...prev];
      if (next[currentIdx] == null) next[currentIdx] = Date.now();
      return next;
    });
    const el = elementForPromptIdx(currentIdx);
    setExpandedElements((prev) => new Set([...prev, el]));
  }, [currentIdx]);

  // Navbar visibility — inject/remove a <style> tag so React re-renders can't override it
  useEffect(() => {
    const id = "ws-hide-navbar";
    if (navbarHidden) {
      if (!document.getElementById(id)) {
        const s = document.createElement("style");
        s.id = id;
        s.textContent = "header { display: none !important; }";
        document.head.appendChild(s);
      }
    } else {
      document.getElementById(id)?.remove();
    }
    return () => { document.getElementById(id)?.remove(); };
  }, [navbarHidden]);

  // Listen for toggle events dispatched by the navbar ⌃ button
  useEffect(() => {
    function handleToggle() { setNavbarHidden((v) => !v); }
    window.addEventListener("workspace:navbar-toggle", handleToggle);
    return () => {
      window.removeEventListener("workspace:navbar-toggle", handleToggle);
      document.getElementById("ws-hide-navbar")?.remove();
    };
  }, []);

  const toggleElement = useCallback((id) => {
    setExpandedElements((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const currentPrompt = prompts[currentIdx];
  const currentElement = elementForPromptIdx(currentIdx);
  const colors = ELEMENT_COLORS[currentElement];

  const wordCount = useMemo(() => {
    const text = (answers[currentIdx] || "").trim();
    return text ? text.split(/\s+/).filter(Boolean).length : 0;
  }, [answers, currentIdx]);

  function setAnswer(i, text) {
    setAnswers((prev) => { const next = [...prev]; next[i] = text; return next; });
    setSaveSuccess(false);
    setSaveErr("");
  }

  async function saveResponse() {
    const text = (answers[currentIdx] || "").trim();
    if (!text) { setSaveErr("Write something before saving."); return; }
    setSaveLoading(true); setSaveErr(""); setSaveSuccess(false);
    try {
      const token = await getToken({ skipCache: true });
      const started = timers[currentIdx];
      const time_spent = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
      const res = await fetch("/api/backend-api/session/respond", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          session_id: sessionId,
          prompt_index: currentIdx,
          response_text: text,
          time_spent_seconds: time_spent,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to save.");
      }
      setSavedIndices((prev) => new Set([...prev, currentIdx]));
      setSaveSuccess(true);
    } catch (e) {
      setSaveErr(e?.message || "Failed to save.");
    } finally {
      setSaveLoading(false);
    }
  }

  async function getNudge() {
    if (savedIndices.size === 0) {
      setNudgeErr("Save at least one response before requesting a nudge.");
      return;
    }
    setNudgeLoading(true); setNudgeErr(""); setNudgeText(""); setNudgeVisible(true);
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(
        `/api/backend-api/session/${sessionId}/analyze?token=${encodeURIComponent(token)}`,
        { headers: { "Cache-Control": "no-cache" } }
      );
      if (!res.ok) {
        const txt = await res.text();
        let detail = txt;
        try { detail = JSON.parse(txt).detail; } catch {}
        throw new Error(detail || "Failed to get nudge.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") { setNudgeLoading(false); return; }
          setNudgeText((prev) => prev + data);
        }
      }
    } catch (e) {
      setNudgeErr(e?.message || "Failed to get nudge.");
    } finally {
      setNudgeLoading(false);
    }
  }

  async function completeSession() {
    setCompleteLoading(true); setCompleteErr("");
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch("/api/backend-api/session/complete", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error("Failed to complete session.");
      localStorage.removeItem(`dramarama_puzzle_${sessionId}`);
      onComplete();
    } catch (e) {
      setCompleteErr(e?.message || "Failed to complete.");
    } finally {
      setCompleteLoading(false);
    }
  }

  function handleResizeStart(e) {
    e.preventDefault();
    resizingRef.current = true;
    startYRef.current = e.clientY;
    startHeightRef.current = inputHeight;

    function onMove(e) {
      if (!resizingRef.current) return;
      const delta = startYRef.current - e.clientY; // drag up = taller
      setInputHeight(Math.max(140, Math.min(520, startHeightRef.current + delta)));
    }
    function onUp() {
      resizingRef.current = false;
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
    }
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
  }

  const completedCount = savedIndices.size;
  const allAnswered = completedCount === 13;

  return (
    <div className={`flex overflow-hidden ${navbarHidden ? "h-screen" : "h-[calc(100vh-5rem)] mt-20"}`}>
      {/* Floating restore tab — shown when navbar is hidden */}
      {navbarHidden && (
        <button
          className="fixed top-0 left-1/2 -translate-x-1/2 z-[60] bg-white border border-t-0 border-mist text-smoke hover:text-black text-xs font-mono px-5 py-1 rounded-b-lg shadow-md transition-colors"
          onClick={() => window.dispatchEvent(new CustomEvent("workspace:navbar-toggle"))}
          title="Show navbar"
        >
          ↓ Show Nav
        </button>
      )}

      {/* Mobile sidebar toggle */}
      <button
        className="lp:hidden fixed bottom-4 left-4 z-40 bg-black text-white w-12 h-12 rounded-full flex items-center justify-center text-xl shadow-lg"
        onClick={() => setSidebarOpen((v) => !v)}
      >
        {sidebarOpen ? "✕" : "📚"}
      </button>

      {/* Elements Sidebar */}
      <div
        className={`bg-white border-r border-mist flex-shrink-0 overflow-hidden transition-all duration-200 ${
          sidebarOpen ? "w-72" : "w-0"
        } lp:w-72`}
      >
        <ElementsSidebar
          currentPromptIdx={currentIdx}
          expandedElements={expandedElements}
          onToggle={toggleElement}
        />
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex-shrink-0 bg-white border-b border-mist px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="font-display text-lg text-black">{algorithmTitle}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full font-mono ${allAnswered ? "bg-earth/15 text-earth" : "bg-mist text-smoke"}`}>
              {completedCount}/13
            </span>
          </div>
          <div className="flex items-center gap-3">
            {completeErr && <span className="text-xs text-fire">{completeErr}</span>}
            <button
              onClick={() => window.dispatchEvent(new CustomEvent("workspace:navbar-toggle"))}
              className="hidden sm:flex items-center gap-1.5 text-smoke hover:text-black border border-mist hover:border-smoke/50 rounded px-2.5 py-1 text-xs font-mono transition-colors"
              title={navbarHidden ? "Show navbar" : "Hide navbar"}
            >
              {navbarHidden ? "↓ Nav" : "↑ Nav"}
            </button>
            <Button
              radius="none"
              size="sm"
              className={`${allAnswered ? "bg-black text-white" : "bg-white border border-mist text-black"}`}
              isLoading={completeLoading}
              onPress={completeSession}
            >
              Complete Session →
            </Button>
          </div>
        </div>

        {/* Scrollable area: puzzle + nudge */}
        <div className="flex-1 overflow-y-auto">
          {/* Puzzle — full width, no box */}
          <div className="px-8 lp:px-14 pt-10 pb-8 border-b border-mist/50">
            <div className="text-xs uppercase tracking-widest text-smoke mb-5">The Puzzle</div>
            <div className="font-display text-xl lp:text-2xl text-black leading-relaxed whitespace-pre-wrap">
              {puzzleText}
            </div>
          </div>

          {/* Prompt dots */}
          <div className="px-8 lp:px-14 py-5 flex items-center gap-2">
            {Array.from({ length: 13 }).map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentIdx(i)}
                title={`Prompt ${i + 1}`}
                className={`h-2 rounded-full transition-all ${
                  i === currentIdx
                    ? `${colors.dot} w-5`
                    : savedIndices.has(i)
                    ? "w-2 bg-earth"
                    : "w-2 bg-mist hover:bg-smoke"
                }`}
              />
            ))}
            <span className="ml-2 text-xs text-smoke font-mono">{currentIdx + 1} / 13</span>
          </div>

          {/* Nudge panel */}
          {nudgeVisible && (
            <div className="mx-8 lp:mx-14 mb-8 border border-mist rounded-xl overflow-hidden">
              <div className="bg-gradient-to-r from-water/10 to-change/5 px-5 py-3 border-b border-mist flex items-center justify-between">
                <div className="text-sm font-semibold text-black">Your Nudge</div>
                <button
                  className="text-xs text-smoke hover:text-black transition-colors"
                  onClick={() => setNudgeVisible(false)}
                >
                  ✕ Close
                </button>
              </div>
              <div className="p-5 bg-white">
                {nudgeLoading && !nudgeText && (
                  <div className="text-sm text-smoke animate-pulse">Analyzing your thinking…</div>
                )}
                {nudgeErr && <div className="text-sm text-fire">{nudgeErr}</div>}
                {nudgeText && (
                  <div className="text-black whitespace-pre-wrap leading-relaxed text-sm">
                    {nudgeText}
                    {nudgeLoading && (
                      <span className="inline-block w-1 h-4 bg-black ml-1 animate-pulse" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="h-4" />
        </div>

        {/* Input panel — sticky at bottom, resizable */}
        <div
          className="flex-shrink-0 border-t border-mist bg-white flex flex-col"
          style={{ height: `${inputHeight}px` }}
        >
          {/* Resize handle */}
          <div
            className="flex-shrink-0 h-3 cursor-row-resize flex items-center justify-center group select-none"
            onMouseDown={handleResizeStart}
          >
            <div className="w-10 h-1 bg-mist rounded-full group-hover:bg-smoke transition-colors" />
          </div>

          {/* Panel body */}
          <div className="flex-1 flex flex-col px-6 lp:px-14 pb-3 min-h-0">

            {/* Prompt header row */}
            <div className="flex items-center justify-between py-1 flex-shrink-0">
              <div className={`flex items-center gap-2 text-sm font-semibold ${colors.text}`}>
                <span>{ELEMENTS.find((e) => e.id === currentElement)?.emoji}</span>
                <span>
                  {currentPrompt
                    ? `${String(currentPrompt.element || "").toUpperCase()} ${currentPrompt.sub_element} — ${currentPrompt.name}`
                    : "Loading…"}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => setCurrentIdx((v) => Math.max(0, v - 1))}
                  disabled={currentIdx === 0}
                  className="text-xs px-2.5 py-1 border border-mist text-black disabled:text-smoke disabled:cursor-not-allowed hover:border-black transition-colors"
                >
                  ← Prev
                </button>
                <button
                  onClick={() => setCurrentIdx((v) => Math.min(12, v + 1))}
                  disabled={currentIdx === 12}
                  className="text-xs px-2.5 py-1 border border-mist text-black disabled:text-smoke disabled:cursor-not-allowed hover:border-black transition-colors"
                >
                  Next →
                </button>
              </div>
            </div>

            {/* Prompt question */}
            <div className="text-sm text-black font-medium leading-snug mb-2 flex-shrink-0">
              {currentPrompt?.prompt || "Loading prompt…"}
            </div>

            {/* Textarea — grows to fill remaining space */}
            <textarea
              className="flex-1 w-full resize-none border border-mist focus:border-black outline-none font-mono text-sm text-black placeholder:text-smoke px-3 py-2.5 transition-colors min-h-0 bg-white"
              value={answers[currentIdx]}
              onChange={(e) => setAnswer(currentIdx, e.target.value)}
              placeholder="Think freely… write rough drafts, concrete examples, questions, anything."
            />

            {/* Actions row */}
            <div className="flex items-center justify-between pt-2 flex-shrink-0">
              <div className="flex items-center gap-3 text-xs text-smoke">
                <span className="font-mono">{wordCount} words</span>
                {savedIndices.has(currentIdx) && (
                  <span className="text-earth font-medium">✓ Saved</span>
                )}
                {saveErr && <span className="text-fire">{saveErr}</span>}
                {saveSuccess && !saveErr && <span className="text-earth">Saved!</span>}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  radius="none"
                  size="sm"
                  className="bg-black text-white"
                  isLoading={saveLoading}
                  onPress={saveResponse}
                >
                  Save
                </Button>
                <Button
                  radius="none"
                  size="sm"
                  className={`border ${
                    nudgeLoading ? "border-smoke text-smoke" : "border-black text-black bg-white"
                  }`}
                  isLoading={nudgeLoading}
                  onPress={getNudge}
                >
                  Get Nudge
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [phase, setPhase] = useState("loading"); // "loading" | "setup" | "working"
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setPhase("setup"); return; }

    let cancelled = false;

    async function loadActiveSession() {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) throw new Error();
        const data = await res.json();
        const active = (data.sessions || []).find((s) => s.status === "in_progress");

        if (active) {
          // Check cache first — only regenerate if not cached
          const cachedPuzzle = localStorage.getItem(`dramarama_puzzle_${active.id}`);

          const detailRes = await fetch(`/api/backend-api/user/sessions/${active.id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });

          let puzzleText = cachedPuzzle;
          if (!puzzleText) {
            const puzzleRes = await fetch("/api/backend-api/puzzle/generate", {
              method: "POST",
              headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
              body: JSON.stringify({ algorithm_title: active.algorithm_title }),
            });
            const puzzleData = puzzleRes.ok ? await puzzleRes.json() : {};
            puzzleText = puzzleData.puzzle_text || active.algorithm_title;
            localStorage.setItem(`dramarama_puzzle_${active.id}`, puzzleText);
          }

          if (cancelled) return;

          const detail = detailRes.ok ? await detailRes.json() : null;

          if (cancelled) return;

          const savedIdx = new Set((detail?.responses || []).map((r) => r.prompt_index));
          const initialAnswers = {};
          (detail?.responses || []).forEach((r) => {
            initialAnswers[r.prompt_index] = r.response_text;
          });

          // Start at first unsaved prompt
          const firstUnsaved = Array.from({ length: 13 }, (_, i) => i).find(
            (i) => !savedIdx.has(i)
          ) ?? 0;

          setSessionData({
            algorithmTitle: active.algorithm_title,
            puzzleText,
            sessionId: active.id,
            initialSavedIndices: savedIdx,
            initialAnswers,
            initialCurrentIdx: firstUnsaved,
          });
          setPhase("working");
        } else {
          if (!cancelled) setPhase("setup");
        }
      } catch {
        if (!cancelled) setPhase("setup");
      }
    }

    loadActiveSession();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn]);

  if (!isLoaded || phase === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎭</div>
          <p className="text-smoke">Loading…</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center border border-mist rounded-xl p-8">
          <div className="text-4xl mb-4">🔒</div>
          <h2 className="font-display text-2xl text-black mb-2">Sign in required</h2>
          <p className="text-smoke text-sm mb-6">Sign in to access the workspace and track your progress.</p>
          <Link href="/login">
            <Button className="bg-black text-white w-full" radius="none">Sign In</Button>
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
