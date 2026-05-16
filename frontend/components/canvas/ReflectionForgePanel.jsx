"use client";

import { useEffect, useState } from "react";
import {
  saveReflectionAnswers,
  forgeFireStarterDraft,
  createFireStarter,
} from "@/lib/canvas-api";

const Q1 =
  "We saw these elements on your canvas — does this match what you practiced? Add or adjust anything.";
const Q2 =
  "Which element, when you applied it, produced the most insight?";
const Q3 =
  "Looking back at when you first opened this puzzle, what is the one question you wish you had asked yourself?";

export default function ReflectionForgePanel({
  coursePuzzleId,
  initialAnswers,
  canvasElementsSummary = "",
  getToken,
  onSavedAnswers,
  onForged,
  layout = "bottom",
}) {
  const [step, setStep] = useState(1);
  const [a1, setA1] = useState(
    initialAnswers?.elements_applied || canvasElementsSummary || "",
  );
  const [a2, setA2] = useState(initialAnswers?.most_insightful_element || "");
  const [a3, setA3] = useState(initialAnswers?.question_at_start || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [draft, setDraft] = useState(null);
  const [selectedName, setSelectedName] = useState(null);
  const [customName, setCustomName] = useState("");

  const hasSaved =
    initialAnswers?.elements_applied &&
    initialAnswers?.most_insightful_element &&
    initialAnswers?.question_at_start;
  const [phase, setPhase] = useState(hasSaved ? "ready_to_forge" : "questions");

  const question = step === 1 ? Q1 : step === 2 ? Q2 : Q3;
  const value = step === 1 ? a1 : step === 2 ? a2 : a3;
  const setValue = step === 1 ? setA1 : step === 2 ? setA2 : setA3;

  const shellClass =
    layout === "bottom"
      ? "flex flex-col bg-white border-t border-mist max-h-[42vh] shrink-0"
      : "h-full flex flex-col bg-white border-l border-mist";

  useEffect(() => {
    if (initialAnswers?.elements_applied || a1.trim()) return;
    if (canvasElementsSummary) setA1(canvasElementsSummary);
  }, [canvasElementsSummary, initialAnswers?.elements_applied, a1]);

  async function startForgeDraft() {
    setPhase("forging");
    setError(null);
    try {
      const d = await forgeFireStarterDraft(coursePuzzleId, getToken);
      setDraft(d);
      if (d.proposed_names?.length) setSelectedName(d.proposed_names[0]);
      setPhase("modal");
    } catch (e) {
      setPhase(hasSaved ? "ready_to_forge" : "questions");
      setError(e?.message || "Could not draft Fire Starter.");
    }
  }

  useEffect(() => {
    if (phase !== "ready_to_forge") return;
    startForgeDraft();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function submitAllReflections() {
    setSaving(true);
    setError(null);
    try {
      await saveReflectionAnswers(
        coursePuzzleId,
        {
          elements_applied: a1.trim(),
          most_insightful_element: a2.trim(),
          question_at_start: a3.trim(),
        },
        getToken,
      );
      onSavedAnswers?.();
      await startForgeDraft();
    } catch (e) {
      setError(e?.message || "Could not save reflections.");
    } finally {
      setSaving(false);
    }
  }

  async function saveFireStarter() {
    const name = (customName.trim() || selectedName || "").trim();
    if (!name || !draft) return;
    setSaving(true);
    setError(null);
    try {
      await createFireStarter(
        {
          course_puzzle_id: coursePuzzleId,
          name,
          description: draft.description,
          element_combination: draft.element_combination,
          flow_of_ideas: draft.flow_of_ideas,
        },
        getToken,
      );
      onForged?.(name);
    } catch (e) {
      setError(e?.message || "Could not save Fire Starter.");
    } finally {
      setSaving(false);
    }
  }

  if (phase === "forging" || phase === "ready_to_forge") {
    return (
      <div className={shellClass}>
        <div className="px-4 py-6 flex flex-col items-center justify-center gap-3 flex-1 min-h-[8rem]">
          <p className="text-sm text-black text-center leading-relaxed">
            Forging your Fire Starter from this session…
          </p>
          <div className="h-1.5 w-32 rounded-full bg-mist overflow-hidden">
            <div className="h-full w-1/2 rounded-full bg-change animate-pulse" />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    );
  }

  if (phase === "modal" && draft) {
    return (
      <div className={shellClass}>
        <div className="px-4 py-3 border-b border-mist shrink-0">
          <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
            Name Your Fire Starter
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0">
          <div>
            <p className="text-xs font-mono uppercase text-smoke mb-1">Insight</p>
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
              {draft.description}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-smoke mb-2">Pick a name</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {draft.proposed_names.map((n) => (
                <button
                  key={n}
                  type="button"
                  onClick={() => {
                    setSelectedName(n);
                    setCustomName("");
                  }}
                  className={`text-left rounded-lg border px-3 py-2 text-sm transition-colors ${
                    selectedName === n && !customName.trim()
                      ? "border-change bg-change/10"
                      : "border-mist hover:border-change/40"
                  }`}
                >
                  {n}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="text-xs font-mono uppercase text-smoke block mb-1">
              Or write your own
            </label>
            <input
              value={customName}
              onChange={(e) => setCustomName(e.target.value)}
              className="w-full border border-mist rounded-md px-3 py-2 text-sm"
              placeholder="Your name…"
            />
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-3 border-t border-mist flex gap-2 shrink-0">
          <button
            type="button"
            disabled={saving}
            onClick={saveFireStarter}
            className="flex-1 text-sm py-2.5 bg-change text-white rounded-md font-semibold hover:bg-change/90 disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Fire Starter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={shellClass}>
      <div className="px-4 py-3 border-b border-mist shrink-0">
        <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
          Stage 3 — Reflect
        </h3>
        <p className="text-[10px] font-mono text-smoke mt-1">Question {step} of 3</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3 min-h-0">
        <p className="text-sm text-black leading-relaxed font-medium">{question}</p>
        {step === 1 && canvasElementsSummary && !initialAnswers?.elements_applied && (
          <p className="text-xs text-smoke leading-relaxed">
            From your canvas: <span className="text-black">{canvasElementsSummary}</span>
          </p>
        )}
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={layout === "bottom" ? 3 : 6}
          className="w-full border border-mist rounded-md px-3 py-2 text-sm resize-none"
          placeholder={
            step === 1
              ? "Confirm or edit what you practiced…"
              : step === 2
                ? "e.g. Air — asking what the manager actually reads each day…"
                : "e.g. What is the simplest version of this I can solve first?"
          }
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="p-3 border-t border-mist flex gap-2 shrink-0">
        {step > 1 && (
          <button
            type="button"
            onClick={() => setStep((s) => s - 1)}
            className="px-3 py-2 text-sm border border-mist rounded-md"
          >
            Back
          </button>
        )}
        <button
          type="button"
          disabled={!value.trim() || saving}
          onClick={() => {
            if (step < 3) {
              setStep((s) => s + 1);
            } else {
              submitAllReflections();
            }
          }}
          className="flex-1 py-2 rounded-md bg-change text-white text-sm font-medium disabled:opacity-40"
        >
          {step < 3 ? "Next" : saving ? "Saving…" : "Submit & forge"}
        </button>
      </div>
    </div>
  );
}
