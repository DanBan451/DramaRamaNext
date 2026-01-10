"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import { Textarea } from "@nextui-org/input";
import Footer from "@/components/Footer";
import ConfettiOverlay from "@/components/ConfettiOverlay";

const DEMO_ALGO = {
  title: "Two Sum",
  url: "https://leetcode.com/problems/two-sum/",
  summary:
    "Given an array of integers and a target, return indices of the two numbers such that they add up to the target.",
};

const elementEmojis = {
  earth: "🌳",
  fire: "🔥",
  air: "💨",
  water: "🌊",
};

const MIN_WORDS = 20;

function safeJsonParse(text) {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

export default function DemoPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();

  const [prompts, setPrompts] = useState([]);
  const [loadingPrompts, setLoadingPrompts] = useState(true);
  const [promptErr, setPromptErr] = useState("");

  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState(() => Array.from({ length: 12 }, () => ""));
  const [timeStartedAt, setTimeStartedAt] = useState(() => Array.from({ length: 12 }, () => null));

  const [nudgeLoading, setNudgeLoading] = useState(false);
  const [nudgeErr, setNudgeErr] = useState("");
  const [nudge, setNudge] = useState("");

  const [finalTakeaway, setFinalTakeaway] = useState("");
  const [celebrate, setCelebrate] = useState(false);
  const [done, setDone] = useState(false);

  const currentPrompt = prompts[idx];
  const completedCount = useMemo(
    () => answers.filter((a) => String(a || "").trim().length > 0).length,
    [answers]
  );

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoadingPrompts(true);
        setPromptErr("");
        const res = await fetch("/api/backend-api/prompts", { cache: "no-store" });
        if (!res.ok) {
          setPromptErr("Unable to load prompts. Please try again.");
          return;
        }
        const data = await res.json();
        if (!cancelled) setPrompts(Array.isArray(data) ? data : []);
      } catch {
        if (!cancelled) setPromptErr("Unable to load prompts. Please try again.");
      } finally {
        if (!cancelled) setLoadingPrompts(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    // Start a timer for the current prompt on first entry
    setTimeStartedAt((prev) => {
      const next = [...prev];
      if (next[idx] == null) next[idx] = Date.now();
      return next;
    });
  }, [idx]);

  const currentWordCount = useMemo(() => {
    const text = String(answers[idx] || "").trim();
    if (!text) return 0;
    return text.split(/\s+/).filter(Boolean).length;
  }, [answers, idx]);

  const canGoNext = useMemo(() => currentWordCount >= MIN_WORDS, [currentWordCount]);
  const isLastPrompt = idx === 11;
  const allAnswered = useMemo(() => {
    return answers.every((a) => {
      const text = String(a || "").trim();
      const wc = text ? text.split(/\s+/).filter(Boolean).length : 0;
      return wc >= MIN_WORDS;
    });
  }, [answers]);

  function setAnswer(i, text) {
    setAnswers((prev) => {
      const next = [...prev];
      next[i] = text;
      return next;
    });
  }

  function resetAll() {
    setIdx(0);
    setAnswers(Array.from({ length: 12 }, () => ""));
    setTimeStartedAt(Array.from({ length: 12 }, () => null));
    setNudge("");
    setNudgeErr("");
    setFinalTakeaway("");
    setCelebrate(false);
    setDone(false);
  }

  async function generateNudge() {
    if (!isLoaded) return;
    if (!isSignedIn) {
      setNudgeErr("Please sign in to run the demo.");
      return;
    }
    if (!allAnswered) {
      setNudgeErr("Please answer all 12 prompts before generating your nudge.");
      return;
    }

    setNudgeLoading(true);
    setNudgeErr("");
    setNudge("");

    try {
      const token = await getToken({ skipCache: true });
      if (!token) {
        setNudgeErr("Unable to authenticate. Please sign in again.");
        return;
      }

      const responses = answers.map((text, prompt_index) => {
        const started = timeStartedAt[prompt_index];
        const time_spent_seconds = started ? Math.max(0, Math.round((Date.now() - started) / 1000)) : 0;
        return { prompt_index, response_text: text, time_spent_seconds };
      });

      const res = await fetch("/api/backend-api/demo/nudge", {
        method: "POST",
        headers: {
          "content-type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          algorithm_title: DEMO_ALGO.title,
          algorithm_url: DEMO_ALGO.url,
          responses,
        }),
      });

      if (!res.ok) {
        const txt = await res.text();
        const j = safeJsonParse(txt);
        throw new Error(j?.detail || txt || "Failed to generate nudge");
      }

      const data = await res.json();
      setNudge(data?.nudge_text || "");
    } catch (e) {
      setNudgeErr(e?.message || "Failed to generate nudge");
    } finally {
      setNudgeLoading(false);
    }
  }

  function finishDemo() {
    setDone(true);
    setCelebrate(true);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <ConfettiOverlay
        active={celebrate}
        onDone={() => {
          // Auto-reset after confetti, leaving the user at the start.
          resetAll();
        }}
      />

      <div className="flex-1 pt-24 lp:pt-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="border border-mist rounded-2xl p-6 lp:p-10">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="font-display text-3xl text-black">Demo</div>
                <div className="text-smoke mt-2">
                  A private, no-save walkthrough of the 12 prompts + a generated “nudge”.
                </div>
              </div>
              <Button className="bg-mist/70 text-black" radius="none" onPress={resetAll}>
                Reset
              </Button>
            </div>

            <div className="mt-8 border border-mist rounded-xl p-5 bg-white">
              <div className="text-xs uppercase tracking-wide text-smoke">Algorithm</div>
              <div className="mt-2 text-xl font-semibold text-black">{DEMO_ALGO.title}</div>
              <div className="mt-1 text-sm text-ash">{DEMO_ALGO.summary}</div>
              <a
                className="mt-3 inline-block text-sm text-black underline"
                href={DEMO_ALGO.url}
                target="_blank"
                rel="noopener noreferrer"
              >
                View on LeetCode
              </a>
            </div>

            <SignedOut>
              <div className="mt-8 border border-mist rounded-xl p-5 bg-earth/5">
                <div className="font-semibold text-black">Sign in to run the demo</div>
                <div className="text-sm text-ash mt-1">
                  We require sign-in to prevent abuse of the LLM endpoint. Your demo responses are not saved.
                </div>
                <div className="mt-4">
                  <SignInButton mode="modal">
                    <Button className="bg-black text-white" radius="none">
                      Sign In
                    </Button>
                  </SignInButton>
                </div>
              </div>
            </SignedOut>

            <SignedIn>
              <div className="mt-8">
                {loadingPrompts ? (
                  <div className="text-sm text-ash">Loading prompts…</div>
                ) : promptErr ? (
                  <div className="text-sm text-fire">{promptErr}</div>
                ) : (
                  <>
                    <div className="flex items-center justify-between gap-4">
                      <div className="text-sm text-ash">
                        Prompt {idx + 1} / 12 • Completed: {completedCount} / 12
                      </div>
                      {currentPrompt ? (
                        <div className="text-sm text-black font-medium">
                          {elementEmojis[currentPrompt.element] || "🎭"}{" "}
                          {String(currentPrompt.element || "").toUpperCase()} {currentPrompt.sub_element} —{" "}
                          {currentPrompt.name}
                        </div>
                      ) : null}
                    </div>

                    {currentPrompt ? (
                      <div className="mt-4 border border-mist rounded-xl p-5 bg-white">
                        <div className="text-sm text-black font-semibold">{currentPrompt.prompt}</div>
                        <div className="mt-4">
                          <Textarea
                            minRows={5}
                            radius="none"
                            classNames={{
                              inputWrapper: "border-2 border-mist focus-within:border-black",
                            }}
                            value={answers[idx]}
                            onValueChange={(v) => setAnswer(idx, v)}
                            placeholder={`Write your thoughts… (minimum ${MIN_WORDS} words)`}
                          />
                        </div>

                        <div className="mt-3 flex items-center justify-between text-sm">
                          <div className={currentWordCount >= MIN_WORDS ? "text-ash" : "text-fire"}>
                            {currentWordCount} words • minimum {MIN_WORDS}
                          </div>
                          <div className="text-ash">Tip: concrete examples > generic text</div>
                        </div>

                        <div className="mt-4 flex items-center justify-between gap-3">
                          <Button
                            radius="none"
                            className="bg-white border-2 border-mist text-black"
                            isDisabled={idx === 0}
                            onPress={() => setIdx((v) => Math.max(0, v - 1))}
                          >
                            Back
                          </Button>

                          {!isLastPrompt ? (
                            <Button
                              radius="none"
                              className="bg-black text-white"
                              isDisabled={!canGoNext}
                              onPress={() => setIdx((v) => Math.min(11, v + 1))}
                            >
                              Next
                            </Button>
                          ) : (
                            <Button
                              radius="none"
                              className="bg-black text-white"
                              isDisabled={!allAnswered || nudgeLoading}
                              isLoading={nudgeLoading}
                              onPress={generateNudge}
                            >
                              Get My Nudge
                            </Button>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {nudgeErr ? <div className="mt-4 text-sm text-fire">{nudgeErr}</div> : null}

                    {nudge ? (
                      <div className="mt-8 border border-mist rounded-xl p-5 bg-water/5">
                        <div className="text-xs uppercase tracking-wide text-smoke">Your Nudge</div>
                        <div className="mt-3 text-black whitespace-pre-wrap leading-relaxed">{nudge}</div>

                        <div className="mt-6 border-t border-mist pt-5">
                          <div className="text-sm font-semibold text-black">
                            One last step (optional)
                          </div>
                          <div className="text-sm text-ash mt-1">
                            Write a quick takeaway or next step you’ll try. This is not saved.
                          </div>
                          <div className="mt-3">
                            <Textarea
                              minRows={3}
                              radius="none"
                              classNames={{
                                inputWrapper: "border-2 border-mist focus-within:border-black bg-white",
                              }}
                              value={finalTakeaway}
                              onValueChange={setFinalTakeaway}
                              placeholder="My next step is…"
                            />
                          </div>
                          <div className="mt-4 flex items-center justify-between gap-3">
                            <Button
                              radius="none"
                              className="bg-white border-2 border-mist text-black"
                              onPress={resetAll}
                            >
                              Start Over
                            </Button>
                            <Button
                              radius="none"
                              className="bg-black text-white"
                              onPress={finishDemo}
                              isDisabled={done}
                            >
                              Finish Demo
                            </Button>
                          </div>

                          {done ? (
                            <div className="mt-4 text-black font-semibold">
                              Congratulations — you completed all 12 prompts.
                            </div>
                          ) : null}
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
              </div>
            </SignedIn>

            <div className="mt-10 border-t border-mist pt-6">
              <div className="text-xs uppercase tracking-wide text-smoke">Attribution</div>
              <div className="mt-2 text-sm text-ash leading-relaxed">
                DramaRama is inspired by the “5 Elements of Effective Thinking” framework and the MUYOM
                (“Making Up Your Own Mind”) philosophy described by Edward B. Burger and Michael Starbird.
              </div>
              <div className="mt-3 text-sm">
                <a
                  className="text-black underline"
                  href="https://www.amazon.com/5-Elements-Effective-Thinking/dp/0691156662"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  The 5 Elements of Effective Thinking (Amazon)
                </a>
              </div>
              <div className="mt-2 text-sm">
                <a
                  className="text-black underline"
                  href="https://www.amazon.com/Making-Your-Own-Mind-Puzzle-Solving/dp/0691182787/"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Making Up Your Own Mind (Amazon)
                </a>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}

