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
        prompt: "What are the fundamentals of this problem that you'd need to ground yourself in before using AI? What context is essential?",
      },
      {
        version: "2.0",
        name: "Spotlight the Specific",
        description:
          "Warm up with a special case or specific example to gain new insight that can then be extended to the general situation. Reframe any structure discovered in that example to expose a general principle hidden in the original issue.",
        prompt: "Create a simpler, concrete version of this scenario. What would a minimal example look like?",
      },
      {
        version: "3.0",
        name: "Add the Adjective",
        description:
          "To understand anything in greater detail, challenge yourself to add as many descriptors as possible. Do not leave an adjective for another descriptor until some new facet is revealed.",
        prompt: "Add a descriptor to your approach. Is it iterative? Exploratory? Defensive? How does that lens change how you'd tackle this with AI?",
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
        prompt: "Try something — even if it's wrong. What's your rough first attempt at solving this with AI?",
      },
      {
        version: "2.0",
        name: "Fail Again",
        description:
          "Imagine you must fail ten times to succeed. With this mindset, each failure becomes progress. Embrace the need to make ten initial mistakes—be open to being wrong and doubt those aspects of which you are certain.",
        prompt: "What went wrong with that attempt? Where did the AI approach break down?",
      },
      {
        version: "3.0",
        name: "Fail Intentionally",
        description:
          "Consider extreme cases and remove all real constraints to create completely impractical thoughts and solutions. Determine the precise breakpoint where things went wrong—study it for what has promise.",
        prompt: "What's an extreme or impossible AI approach? What does that failure teach you about the right approach?",
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
        prompt: "What is the REAL question here? Are you even approaching the right problem with AI?",
      },
      {
        version: "2.0",
        name: "Create Basic Questions",
        description:
          "Ask fundamental questions to make fundamental breakthroughs. Even wondering 'What does the simplest case look like?' is a powerful way of probing into the original, subtler scenario.",
        prompt: "What fundamental concept about this domain or these AI tools are you missing?",
      },
      {
        version: "3.0",
        name: "Ask Something Else",
        description:
          "Whether you are stuck or not, considering something else not only resets your thinking, but allows you to refocus on the issue in an entirely original way. Ask 'What's a different but related question?'",
        prompt: "What related problem might give you insight into this one? Is there an adjacent question worth exploring?",
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
        prompt: "What are ALL the possible approaches to solving this with AI? Map out every path.",
      },
      {
        version: "2.0",
        name: "Embrace Doubt",
        description:
          "Challenge your own narrow thinking and opinions to see where that flow takes you. Embrace doubt as a strength—wonder 'What if I'm wrong?' The opposite of doubt is not certainty, but rather closed-mindedness.",
        prompt: "What are you uncertain about? Where might your AI approach be wrong?",
      },
      {
        version: "3.0",
        name: "Never Stop",
        description:
          "Following the flow of an idea requires persistence and tenacity to see where that flow will carry you. Do not let go of an idea until it takes you somewhere new, unexpected, or to an insight into something otherwise unrelated.",
        prompt: "Follow your best approach to its conclusion. Where does it lead? What's the next step after that?",
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
        prompt: "How has thinking through this puzzle changed how you'd approach AI-assisted work?",
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
  const [puzzles, setPuzzles] = useState([]);
  const [selectedPuzzleId, setSelectedPuzzleId] = useState("");
  const [loading, setLoading] = useState(false);
  const [puzzlesLoading, setPuzzlesLoading] = useState(true);
  const [err, setErr] = useState("");
  const [genTopic, setGenTopic] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [genErr, setGenErr] = useState("");
  const [showGenerate, setShowGenerate] = useState(false);
  const { getToken } = useAuth();

  useEffect(() => {
    let cancelled = false;
    async function loadPuzzles() {
      try {
        const res = await fetch("/api/backend-api/puzzles", { cache: "no-store" });
        if (!res.ok) throw new Error();
        const data = await res.json();
        if (!cancelled) setPuzzles(data.puzzles || []);
      } catch {
        // puzzles may not exist yet
      } finally {
        if (!cancelled) setPuzzlesLoading(false);
      }
    }
    loadPuzzles();
    return () => { cancelled = true; };
  }, []);

  async function handleStart(e) {
    e.preventDefault();
    if (!selectedPuzzleId) return;
    setLoading(true);
    setErr("");
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Unable to authenticate. Please sign in.");

      const sessionRes = await fetch("/api/backend-api/session/start", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ puzzle_id: selectedPuzzleId }),
      });
      if (!sessionRes.ok) {
        const j = await sessionRes.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to start session.");
      }
      const { session_id, puzzle_id } = await sessionRes.json();

      const selectedPuzzle = puzzles.find((p) => p.id === selectedPuzzleId);

      onStart({
        puzzleId: puzzle_id,
        puzzleTitle: selectedPuzzle?.title || "Puzzle",
        puzzleScenario: selectedPuzzle?.scenario || "",
        puzzleConstraints: selectedPuzzle?.constraints || [],
        puzzleExample: selectedPuzzle?.example || "",
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

  async function handleGenerate(e) {
    e.preventDefault();
    if (!genTopic.trim()) return;
    setGenLoading(true);
    setGenErr("");
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(`/api/backend-api/puzzle/generate?topic=${encodeURIComponent(genTopic.trim())}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to generate puzzle.");
      }
      const data = await res.json();
      // Refresh puzzle list
      const listRes = await fetch("/api/backend-api/puzzles", { cache: "no-store" });
      if (listRes.ok) {
        const listData = await listRes.json();
        setPuzzles(listData.puzzles || []);
      }
      setSelectedPuzzleId(data.puzzle_id);
      setGenTopic("");
      setShowGenerate(false);
    } catch (e) {
      setGenErr(e?.message || "Failed to generate.");
    } finally {
      setGenLoading(false);
    }
  }

  const selectedPuzzle = puzzles.find((p) => p.id === selectedPuzzleId);

  return (
    <div className="flex-1 flex items-center justify-center px-6 pt-24 pb-16">
      <div className="max-w-lg w-full">
        <div className="text-center mb-10">
          <div className="text-5xl mb-4">🎭</div>
          <h1 className="font-display text-4xl text-black mb-3">Workspace</h1>
          <p className="text-smoke">
            Choose an AI-utilization puzzle and think through it using the 5 Elements of Effective Thinking.
          </p>
        </div>

        <form onSubmit={handleStart} className="flex flex-col gap-4">
          {puzzlesLoading ? (
            <div className="text-center text-smoke text-sm py-4">Loading puzzles…</div>
          ) : puzzles.length === 0 ? (
            <div className="text-center text-smoke text-sm py-4">No puzzles available yet. Generate one below.</div>
          ) : (
            <>
              <select
                value={selectedPuzzleId}
                onChange={(e) => setSelectedPuzzleId(e.target.value)}
                className="w-full px-4 py-3 border-2 border-mist focus:border-black outline-none text-black font-mono text-sm transition-colors bg-white appearance-none cursor-pointer"
                disabled={loading}
              >
                <option value="">Select a puzzle…</option>
                {puzzles.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </select>

              {selectedPuzzle && (
                <div className="border border-mist rounded-lg p-4 bg-mist/20">
                  <div className="text-sm text-black leading-relaxed mb-2">{selectedPuzzle.scenario}</div>
                  {selectedPuzzle.constraints?.length > 0 && (
                    <div className="text-xs text-smoke">
                      <span className="font-semibold">Constraints:</span>{" "}
                      {selectedPuzzle.constraints.join(" · ")}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {err && <div className="text-fire text-sm">{err}</div>}
          <Button
            type="submit"
            className="bg-black text-white w-full"
            radius="none"
            isLoading={loading}
            isDisabled={!selectedPuzzleId || loading}
          >
            {loading ? "Starting session…" : "Start Session →"}
          </Button>
        </form>

        {/* Dev-only generate button */}
        <div className="mt-6 text-center">
          <button
            onClick={() => setShowGenerate((v) => !v)}
            className="text-xs text-smoke hover:text-black transition-colors underline"
          >
            {showGenerate ? "Hide generator" : "Generate new puzzle (dev)"}
          </button>
          {showGenerate && (
            <form onSubmit={handleGenerate} className="mt-3 flex gap-2">
              <input
                type="text"
                value={genTopic}
                onChange={(e) => setGenTopic(e.target.value)}
                placeholder="Topic, e.g. legal research, data analysis…"
                className="flex-1 px-3 py-2 border border-mist focus:border-black outline-none text-black placeholder:text-smoke font-mono text-xs transition-colors"
                disabled={genLoading}
              />
              <Button
                type="submit"
                size="sm"
                radius="none"
                className="bg-black text-white text-xs"
                isLoading={genLoading}
                isDisabled={!genTopic.trim() || genLoading}
              >
                Generate
              </Button>
            </form>
          )}
          {genErr && <div className="text-fire text-xs mt-2">{genErr}</div>}
        </div>

        <div className="mt-8 flex items-center justify-center gap-4 text-sm text-smoke">
          <span>13 prompts</span>
          <span>•</span>
          <span>5 Elements</span>
          <span>•</span>
          <span>AI-utilization puzzles</span>
        </div>
      </div>
    </div>
  );
}

// ─── Working Phase ────────────────────────────────────────────────────────────

function WorkingPhase({
  puzzleId,
  puzzleTitle,
  puzzleScenario,
  puzzleConstraints,
  puzzleExample,
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

  const [nudgesByPrompt, setNudgesByPrompt] = useState(() => ({}));
  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeErr, setNudgeErr] = useState("");

  const [completeLoading, setCompleteLoading] = useState(false);
  const [completeErr, setCompleteErr] = useState("");
  const [completionAnalysis, setCompletionAnalysis] = useState(null);

  const [nudgeLimit, setNudgeLimit] = useState({ used: 0, limit: 5, unlimited: false });

  const [expandedElements, setExpandedElements] = useState(() => new Set(["earth"]));
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [navbarHidden, setNavbarHidden] = useState(false);

  // Resizable input panel
  const [inputHeight, setInputHeight] = useState(280);
  const resizingRef = useRef(false);
  const startYRef = useRef(0);
  const startHeightRef = useRef(0);

  // Fetch prompts + nudge limit
  useEffect(() => {
    let cancelled = false;
    fetch("/api/backend-api/prompts", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => { if (!cancelled) setPrompts(Array.isArray(data) ? data : []); })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    async function loadNudgeLimit() {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch(`/api/backend-api/session/${sessionId}/nudge-limit`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok && !cancelled) {
          const data = await res.json();
          setNudgeLimit(data);
        }
      } catch {}
    }
    loadNudgeLimit();
    return () => { cancelled = true; };
  }, [sessionId]);

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
    if (!nudgeLimit.unlimited && nudgeLimit.used >= nudgeLimit.limit) {
      setNudgeErr(`Nudge limit reached (${nudgeLimit.limit} per puzzle).`);
      return;
    }
    setNudgeLoading(true); setNudgeErr("");
    setNudgesByPrompt((prev) => ({ ...prev, [currentIdx]: "" }));
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(
        `/api/backend-api/session/${sessionId}/analyze?token=${encodeURIComponent(token)}&prompt_index=${currentIdx}`,
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
          if (data === "[DONE]") {
            setNudgeLoading(false);
            setNudgeLimit((prev) => prev.unlimited ? prev : { ...prev, used: prev.used + 1 });
            return;
          }
          setNudgesByPrompt((prev) => ({ ...prev, [currentIdx]: (prev[currentIdx] || "") + data }));
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
      const data = await res.json();
      if (data.analysis) {
        setCompletionAnalysis(data.analysis);
      } else {
        onComplete();
      }
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
            <span className="font-display text-lg text-black">{puzzleTitle}</span>
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
            {/* Puzzle premise */}
            <div className="text-sm text-ash italic leading-relaxed mb-6 border-l-2 border-mist pl-4">
              Your goal is to think through this problem using the 5 Elements of Effective Thinking. You are not expected to solve it immediately — the purpose is to apply each element and develop deeper understanding.
            </div>
            <div className="text-xs uppercase tracking-widest text-smoke mb-5">The Puzzle</div>
            <div className="font-display text-xl lp:text-2xl text-black leading-relaxed mb-4">
              {puzzleScenario}
            </div>
            {puzzleConstraints?.length > 0 && (
              <div className="mb-3">
                <div className="text-xs font-semibold text-smoke uppercase tracking-wider mb-2">Constraints</div>
                <ul className="list-disc list-inside text-sm text-ash space-y-1">
                  {puzzleConstraints.map((c, i) => <li key={i}>{c}</li>)}
                </ul>
              </div>
            )}
            {puzzleExample && (
              <div>
                <div className="text-xs font-semibold text-smoke uppercase tracking-wider mb-2">Example</div>
                <div className="text-sm text-ash leading-relaxed whitespace-pre-wrap bg-mist/30 px-4 py-3 rounded-lg font-mono">
                  {puzzleExample}
                </div>
              </div>
            )}
          </div>

          {/* Prompt dots */}
          <div className="px-8 lp:px-14 py-5 flex items-center gap-2">
            {Array.from({ length: 13 }).map((_, i) => {
              const dotElement = elementForPromptIdx(i);
              const dotColors = ELEMENT_COLORS[dotElement];
              return (
                <button
                  key={i}
                  onClick={() => setCurrentIdx(i)}
                  title={`Prompt ${i + 1}`}
                  className={`h-2 rounded-full transition-all ${
                    i === currentIdx
                      ? `${dotColors.dot} w-5`
                      : savedIndices.has(i)
                      ? `w-2 ${dotColors.dot} opacity-50`
                      : "w-2 bg-mist hover:bg-smoke"
                  }`}
                />
              );
            })}
            <span className="ml-2 text-xs text-smoke font-mono">{currentIdx + 1} / 13</span>
          </div>

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
          <div className="flex-1 flex flex-col px-6 lp:px-14 pb-3 min-h-0 overflow-y-auto">

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

            {/* Inline element explanation */}
            {(() => {
              const el = ELEMENTS.find((e) => e.id === currentElement);
              if (!el) return null;
              const subIdx = el.promptIndices.indexOf(currentIdx);
              const sub = subIdx >= 0 ? el.subElements[subIdx] : el.subElements[0];
              if (!sub) return null;
              return (
                <div className={`text-xs leading-relaxed mb-2 flex-shrink-0 ${colors.text} opacity-80`}>
                  {sub.description}
                </div>
              );
            })()}

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

            {/* Inline nudge — appears below the textarea for the current element */}
            {(nudgesByPrompt[currentIdx] || (nudgeLoading && nudgesByPrompt[currentIdx] === "")) && (
              <div className={`mt-2 flex-shrink-0 border rounded-lg overflow-hidden ${colors.border} border`}>
                <div className={`${colors.bg} px-3 py-1.5 flex items-center justify-between`}>
                  <div className={`text-xs font-semibold ${colors.text}`}>Nudge</div>
                  <button
                    className="text-xs text-smoke hover:text-black transition-colors"
                    onClick={() => setNudgesByPrompt((prev) => { const next = { ...prev }; delete next[currentIdx]; return next; })}
                  >
                    ✕
                  </button>
                </div>
                <div className="px-3 py-2 bg-white">
                  {nudgeLoading && !nudgesByPrompt[currentIdx] && (
                    <div className="text-xs text-smoke animate-pulse">Thinking about your response…</div>
                  )}
                  {nudgesByPrompt[currentIdx] && (
                    <div className="text-black whitespace-pre-wrap leading-relaxed text-xs">
                      {nudgesByPrompt[currentIdx]}
                      {nudgeLoading && (
                        <span className="inline-block w-1 h-3 bg-black ml-0.5 animate-pulse" />
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}
            {nudgeErr && <div className="text-xs text-fire mt-1 flex-shrink-0">{nudgeErr}</div>}

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
                    nudgeLoading ? "border-smoke text-smoke"
                    : (!nudgeLimit.unlimited && nudgeLimit.used >= nudgeLimit.limit) ? "border-mist text-smoke cursor-not-allowed"
                    : "border-black text-black bg-white"
                  }`}
                  isLoading={nudgeLoading}
                  isDisabled={!nudgeLimit.unlimited && nudgeLimit.used >= nudgeLimit.limit}
                  onPress={getNudge}
                >
                  {nudgeLimit.unlimited
                    ? "Get Nudge"
                    : `Nudge (${nudgeLimit.limit - nudgeLimit.used} left)`}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Completion analysis overlay */}
      {completionAnalysis && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white rounded-xl max-w-lg w-full p-8 shadow-2xl">
            <div className="text-center mb-6">
              <div className="text-4xl mb-3">🎉</div>
              <h2 className="font-display text-2xl text-black mb-1">Session Complete</h2>
              <p className="text-sm text-smoke">{completionAnalysis.title || "Great work!"}</p>
            </div>
            {completionAnalysis.key_insight && (
              <div className="mb-4">
                <div className="text-xs font-semibold text-smoke uppercase tracking-wider mb-1">Key Insight</div>
                <div className="text-sm text-black leading-relaxed">{completionAnalysis.key_insight}</div>
              </div>
            )}
            {completionAnalysis.output_capability && (
              <div className="mb-6">
                <div className="text-xs font-semibold text-smoke uppercase tracking-wider mb-1">New Capability</div>
                <div className="text-sm text-black leading-relaxed">{completionAnalysis.output_capability}</div>
              </div>
            )}
            <Button
              radius="none"
              className="bg-black text-white w-full"
              onPress={onComplete}
            >
              Back to Workspace →
            </Button>
          </div>
        </div>
      )}
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
          // Fetch session detail and puzzle data in parallel
          const [detailRes, puzzleRes] = await Promise.all([
            fetch(`/api/backend-api/user/sessions/${active.id}`, {
              headers: { Authorization: `Bearer ${token}` },
            }),
            active.puzzle_id
              ? fetch(`/api/backend-api/puzzles/${active.puzzle_id}`, { cache: "no-store" })
              : Promise.resolve(null),
          ]);

          if (cancelled) return;

          const detail = detailRes.ok ? await detailRes.json() : null;
          const puzzleData = puzzleRes?.ok ? await puzzleRes.json() : null;

          if (cancelled) return;

          const savedIdx = new Set((detail?.responses || []).map((r) => r.prompt_index));
          const initialAnswers = {};
          (detail?.responses || []).forEach((r) => {
            initialAnswers[r.prompt_index] = r.response_text;
          });

          const firstUnsaved = Array.from({ length: 13 }, (_, i) => i).find(
            (i) => !savedIdx.has(i)
          ) ?? 0;

          setSessionData({
            puzzleId: active.puzzle_id,
            puzzleTitle: puzzleData?.title || active.puzzle_title || "Puzzle",
            puzzleScenario: puzzleData?.scenario || detail?.session?.puzzle_scenario || "",
            puzzleConstraints: puzzleData?.constraints || [],
            puzzleExample: puzzleData?.example || "",
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
