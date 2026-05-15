"use client";

import { useState } from "react";
import {
  saveReflectionAnswers,
  forgeFireStarterDraft,
  createFireStarter,
} from "@/lib/canvas-api";

const Q1 =
  "Which Elements of Effective Thinking did you apply to this puzzle?";
const Q2 =
  "Which element, when you applied it, produced the most insight?";
const Q3 = "What question should you have asked at the beginning?";

export default function ReflectionForgePanel({
  coursePuzzleId,
  initialAnswers,
  getToken,
  onSavedAnswers,
  onForged,
}) {
  const [step, setStep] = useState(1);
  const [a1, setA1] = useState(initialAnswers?.elements_applied || "");
  const [a2, setA2] = useState(initialAnswers?.most_insightful_element || "");
  const [a3, setA3] = useState(initialAnswers?.question_at_start || "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const [draft, setDraft] = useState(null);
  const [draftLoading, setDraftLoading] = useState(false);
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
      setPhase("ready_to_forge");
    } catch (e) {
      setError(e?.message || "Could not save reflections.");
    } finally {
      setSaving(false);
    }
  }

  async function runForgeDraft() {
    setDraftLoading(true);
    setError(null);
    try {
      const d = await forgeFireStarterDraft(coursePuzzleId, getToken);
      setDraft(d);
      if (d.proposed_names?.length) setSelectedName(d.proposed_names[0]);
      setPhase("modal");
    } catch (e) {
      setError(e?.message || "Could not draft Fire Starter.");
    } finally {
      setDraftLoading(false);
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

  if (phase === "modal" && draft) {
    return (
      <div className="h-full flex flex-col bg-white border-l border-mist">
        <div className="px-4 py-3 border-b border-mist">
          <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
            Name Your Fire Starter
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
          <div>
            <p className="text-xs font-mono uppercase text-smoke mb-1">Insight</p>
            <p className="text-sm text-black leading-relaxed whitespace-pre-wrap">
              {draft.description}
            </p>
          </div>
          <div>
            <p className="text-xs font-mono uppercase text-smoke mb-2">Pick a name</p>
            <div className="grid gap-2">
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
        <div className="p-3 border-t border-mist flex gap-2">
          <button
            type="button"
            onClick={() => {
              setPhase("ready_to_forge");
              setDraft(null);
            }}
            className="flex-1 text-sm py-2 border border-mist rounded-md"
          >
            Back
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={saveFireStarter}
            className="flex-1 text-sm py-2 bg-primary text-white rounded-md font-medium disabled:opacity-50"
          >
            {saving ? "Saving…" : "Save Fire Starter"}
          </button>
        </div>
      </div>
    );
  }

  if (phase === "ready_to_forge") {
    return (
      <div className="h-full flex flex-col bg-white border-l border-mist">
        <div className="px-4 py-3 border-b border-mist">
          <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
            Stage 3 — Reflect
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-4">
          <p className="text-sm text-black leading-relaxed">
            Reflections saved. When you&apos;re ready, forge a named insight from
            this session — it travels with you into Ignite.
          </p>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
        <div className="p-3 border-t border-mist">
          <button
            type="button"
            disabled={draftLoading}
            onClick={runForgeDraft}
            className="w-full py-2.5 rounded-md bg-violet-700 text-white text-sm font-semibold hover:bg-violet-800 disabled:opacity-50"
          >
            {draftLoading ? "Forging…" : "Forge Your Fire Starter"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-white border-l border-mist">
      <div className="px-4 py-3 border-b border-mist">
        <h3 className="text-[11px] font-mono tracking-[0.2em] uppercase text-smoke">
          Stage 3 — Reflect
        </h3>
        <p className="text-[10px] font-mono text-smoke mt-1">Question {step} of 3</p>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        <p className="text-sm text-black leading-relaxed font-medium">{question}</p>
        <textarea
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={6}
          className="w-full border border-mist rounded-md px-3 py-2 text-sm resize-none"
          placeholder="Type your answer…"
        />
        {error && <p className="text-xs text-red-600">{error}</p>}
      </div>
      <div className="p-3 border-t border-mist flex gap-2">
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
          {step < 3 ? "Next" : saving ? "Saving…" : "Submit reflections"}
        </button>
      </div>
    </div>
  );
}
