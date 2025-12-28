"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useParams } from "next/navigation";

// Mock session detail data
const mockSessionDetail = {
  id: "1",
  algorithmTitle: "Two Sum",
  algorithmUrl: "https://leetcode.com/problems/two-sum",
  algorithmDescription:
    "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
  date: "2024-12-28",
  startedAt: "14:32",
  endedAt: "15:17",
  status: "completed",
  dominantElement: "earth",
  promptsCompleted: 12,
  timeSpent: 45,
  joulesEarned: 124,
  difficulty: "Easy",
  responses: [
    {
      element: "earth",
      subElement: "1.0",
      prompt: "What are the absolute basics of this problem? Break it down to its simplest form.",
      response:
        "At its core, this is a search problem. I need to find two numbers in an array that sum to a target. The basics: I have an array, I have a target, I need to find indices. The simplest case would be an array of 2 elements.",
      wordCount: 52,
      timeSpent: 4,
    },
    {
      element: "earth",
      subElement: "2.0",
      prompt: "Create a specific, simple example. What does the problem look like with concrete numbers?",
      response:
        "Let me use [2, 7, 11, 15] with target 9. I can see that 2 + 7 = 9, so the answer is [0, 1]. This helps me understand I'm looking for pairs. Another example: [3, 3] with target 6 returns [0, 1].",
      wordCount: 48,
      timeSpent: 3,
    },
    {
      element: "earth",
      subElement: "3.0",
      prompt: "Add an adjective. How would you describe this problem to a colleague? What makes it unique?",
      response:
        "This is a 'complementary pair' problem. I'm not just searching for a value, I'm searching for a VALUE'S COMPLEMENT. That's the key insight - for each number, I need its complement (target - num).",
      wordCount: 41,
      timeSpent: 5,
    },
    {
      element: "fire",
      subElement: "1.0",
      prompt: "Fail fast. Write a rough solution even if it's wrong. What's your first instinct?",
      response:
        "Brute force: two nested loops checking every pair. O(n²) time. It works but it's slow. for i in range(n): for j in range(i+1, n): if nums[i] + nums[j] == target: return [i, j]",
      wordCount: 43,
      timeSpent: 3,
    },
    {
      element: "fire",
      subElement: "2.0",
      prompt: "Fail again. What went wrong with your first approach? How can you improve it?",
      response:
        "The nested loop is inefficient - I'm checking the same pairs multiple times essentially. What if I remembered what I've seen? A hash map could store values I've encountered, turning O(n²) into O(n).",
      wordCount: 42,
      timeSpent: 4,
    },
    {
      element: "fire",
      subElement: "3.0",
      prompt: "Fail intentionally. What's an extreme or impossible scenario? What breaks your solution?",
      response:
        "What if the array has duplicates like [3, 3] with target 6? My hash map approach needs to be careful - I can't store [0] and then find [0] again. I need to check for complement BEFORE adding current index.",
      wordCount: 44,
      timeSpent: 5,
    },
    {
      element: "air",
      subElement: "1.0",
      prompt: "Be your own Socrates. What is the REAL question here? Are you solving the right problem?",
      response:
        "The real question isn't 'find two numbers' - it's 'given a number, can I instantly know if its complement exists?' This reframes it from a search problem to a lookup problem. Hash maps excel at instant lookups.",
      wordCount: 43,
      timeSpent: 4,
    },
    {
      element: "air",
      subElement: "2.0",
      prompt: "Ask a basic question. What fundamental concept are you missing or taking for granted?",
      response:
        "Why does hash map work here? Because hash map gives O(1) lookup. I'm trading space for time. Is that always worth it? In this case yes, because n could be large and O(n²) is unacceptable for large inputs.",
      wordCount: 45,
      timeSpent: 3,
    },
    {
      element: "air",
      subElement: "3.0",
      prompt: "Ask another question. What related question might give you insight into this one?",
      response:
        "What if I needed THREE numbers that sum to target? (3Sum problem). It builds on this but needs sorting + two pointers. Seeing the connection helps me understand the pattern family.",
      wordCount: 36,
      timeSpent: 4,
    },
    {
      element: "water",
      subElement: "1.0",
      prompt: "Run down all paths. What are ALL the possible approaches? Don't dismiss any yet.",
      response:
        "1) Brute force O(n²), 2) Sort + two pointers O(n log n), 3) Hash map O(n), 4) Binary search on sorted O(n log n). Hash map wins for this problem because we need original indices (sorting loses them).",
      wordCount: 44,
      timeSpent: 5,
    },
    {
      element: "water",
      subElement: "2.0",
      prompt: "Embrace doubt. What are you uncertain about? Where might you be wrong?",
      response:
        "I'm uncertain about edge cases: empty array? Single element? All same values? Negative numbers? The hash map approach handles all these naturally, but I should test them to be sure.",
      wordCount: 35,
      timeSpent: 3,
    },
    {
      element: "water",
      subElement: "3.0",
      prompt: "Never stop. Where does this idea lead? What's the next step after solving this?",
      response:
        "After Two Sum comes 3Sum, 4Sum, kSum. The pattern: reduce k-sum to (k-1)-sum recursively. Also: Two Sum variations - sorted array (two pointers), BST (tree traversal), design (data structure). This is a foundation problem.",
      wordCount: 42,
      timeSpent: 4,
    },
  ],
  hint: {
    elementFocus: "earth",
    text: "Your Earth responses show strong fundamental understanding! You correctly identified the 'complementary pair' insight which is the key to the optimal solution. Consider spending more time on Water 2.0 - embracing doubt about edge cases before coding will save debugging time.",
  },
};

const elementInfo = {
  earth: { emoji: "🌳", name: "Earth", color: "earth" },
  fire: { emoji: "🔥", name: "Fire", color: "fire" },
  air: { emoji: "💨", name: "Air", color: "air" },
  water: { emoji: "🌊", name: "Water", color: "water" },
};

const elementBgColors = {
  earth: "bg-earth/10",
  fire: "bg-fire/10",
  air: "bg-air/10",
  water: "bg-water/10",
};

const elementBorderColors = {
  earth: "border-earth",
  fire: "border-fire",
  air: "border-air",
  water: "border-water",
};

export default function SessionDetailPage() {
  const params = useParams();
  const session = mockSessionDetail;

  // Group responses by element
  const groupedResponses = session.responses.reduce((acc, response) => {
    if (!acc[response.element]) acc[response.element] = [];
    acc[response.element].push(response);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[1000px] mx-auto px-6 lp:px-20">
        {/* Back button */}
        <Link
          href="/sessions"
          className="inline-flex items-center gap-2 text-smoke hover:text-black transition-colors mb-8"
        >
          ← Back to Sessions
        </Link>

        {/* Header */}
        <div className="mb-12">
          <div className="flex items-start gap-6 mb-6">
            <div
              className={`w-20 h-20 rounded-2xl flex items-center justify-center text-4xl ${
                elementBgColors[session.dominantElement]
              }`}
            >
              {elementInfo[session.dominantElement].emoji}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="font-display text-3xl lp:text-4xl text-black">
                  {session.algorithmTitle}
                </h1>
                <span
                  className={`text-xs px-2 py-1 rounded ${
                    session.difficulty === "Easy"
                      ? "bg-earth/10 text-earth"
                      : session.difficulty === "Medium"
                      ? "bg-fire/10 text-fire"
                      : "bg-water/10 text-water"
                  }`}
                >
                  {session.difficulty}
                </span>
              </div>
              <p className="text-smoke mb-4">{session.algorithmDescription}</p>
              <div className="flex items-center gap-6 text-sm text-smoke">
                <span>{session.date}</span>
                <span>•</span>
                <span>
                  {session.startedAt} - {session.endedAt}
                </span>
                <span>•</span>
                <span>{session.timeSpent} minutes</span>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-change/10 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-change">+{session.joulesEarned}</div>
              <div className="text-sm text-smoke">Joules Earned</div>
            </div>
            <div className="bg-mist/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-black">{session.promptsCompleted}/12</div>
              <div className="text-sm text-smoke">Prompts Completed</div>
            </div>
            <div className="bg-mist/50 rounded-lg p-4 text-center">
              <div className="text-2xl font-bold text-black">
                {elementInfo[session.dominantElement].emoji}
              </div>
              <div className="text-sm text-smoke">Dominant Element</div>
            </div>
          </div>
        </div>

        {/* AI Hint/Nudge */}
        <div className="bg-gradient-to-br from-black to-ash rounded-xl p-6 text-white mb-12">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl shrink-0">
              ✨
            </div>
            <div>
              <h3 className="font-display text-xl mb-2">Your Nudge</h3>
              <p className="text-white/80">{session.hint.text}</p>
            </div>
          </div>
        </div>

        {/* Responses by Element */}
        <div className="space-y-12">
          {Object.entries(groupedResponses).map(([element, responses]) => (
            <div key={element}>
              <div className="flex items-center gap-3 mb-6">
                <span className="text-3xl">{elementInfo[element].emoji}</span>
                <h2 className="font-display text-2xl text-black">{elementInfo[element].name}</h2>
              </div>

              <div className="space-y-6">
                {responses.map((response, index) => (
                  <div
                    key={index}
                    className={`border-l-4 ${elementBorderColors[element]} pl-6 py-2`}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-mono text-sm text-smoke">
                        {element.toUpperCase()} {response.subElement}
                      </span>
                      <span className="text-smoke">•</span>
                      <span className="text-sm text-smoke">{response.timeSpent} min</span>
                      <span className="text-smoke">•</span>
                      <span className="text-sm text-smoke">{response.wordCount} words</span>
                    </div>
                    <p className="text-black font-medium mb-3">{response.prompt}</p>
                    <div className="bg-mist/30 rounded-lg p-4">
                      <p className="text-ash whitespace-pre-wrap">{response.response}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="mt-12 pt-8 border-t border-mist flex flex-col tb:flex-row gap-4 justify-between items-center">
          <Link
            href={session.algorithmUrl}
            target="_blank"
            className="text-smoke hover:text-black transition-colors"
          >
            View on LeetCode →
          </Link>
          <div className="flex gap-4">
            <Button
              as={Link}
              href="/sessions"
              className="bg-mist text-black hover:bg-smoke hover:text-white"
              radius="none"
            >
              Back to Sessions
            </Button>
            <Button
              as="a"
              href="https://leetcode.com"
              target="_blank"
              className="bg-black text-white hover:bg-ash"
              radius="none"
            >
              Start New Session
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

