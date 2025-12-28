"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";

// Mock data
const mockSessions = [
  {
    id: "1",
    algorithmTitle: "Two Sum",
    algorithmUrl: "https://leetcode.com/problems/two-sum",
    date: "2024-12-28",
    status: "completed",
    dominantElement: "earth",
    promptsCompleted: 12,
    timeSpent: 45,
    joulesEarned: 124,
    difficulty: "Easy",
  },
  {
    id: "2",
    algorithmTitle: "Valid Parentheses",
    algorithmUrl: "https://leetcode.com/problems/valid-parentheses",
    date: "2024-12-27",
    status: "completed",
    dominantElement: "fire",
    promptsCompleted: 12,
    timeSpent: 38,
    joulesEarned: 98,
    difficulty: "Easy",
  },
  {
    id: "3",
    algorithmTitle: "Merge Intervals",
    algorithmUrl: "https://leetcode.com/problems/merge-intervals",
    date: "2024-12-26",
    status: "completed",
    dominantElement: "air",
    promptsCompleted: 12,
    timeSpent: 52,
    joulesEarned: 156,
    difficulty: "Medium",
  },
  {
    id: "4",
    algorithmTitle: "Binary Tree Level Order",
    algorithmUrl: "https://leetcode.com/problems/binary-tree-level-order-traversal",
    date: "2024-12-25",
    status: "abandoned",
    dominantElement: "water",
    promptsCompleted: 8,
    timeSpent: 25,
    joulesEarned: 45,
    difficulty: "Medium",
  },
  {
    id: "5",
    algorithmTitle: "LRU Cache",
    algorithmUrl: "https://leetcode.com/problems/lru-cache",
    date: "2024-12-24",
    status: "completed",
    dominantElement: "earth",
    promptsCompleted: 12,
    timeSpent: 67,
    joulesEarned: 187,
    difficulty: "Medium",
  },
  {
    id: "6",
    algorithmTitle: "Maximum Subarray",
    algorithmUrl: "https://leetcode.com/problems/maximum-subarray",
    date: "2024-12-23",
    status: "completed",
    dominantElement: "fire",
    promptsCompleted: 12,
    timeSpent: 41,
    joulesEarned: 112,
    difficulty: "Medium",
  },
  {
    id: "7",
    algorithmTitle: "Climbing Stairs",
    algorithmUrl: "https://leetcode.com/problems/climbing-stairs",
    date: "2024-12-22",
    status: "completed",
    dominantElement: "air",
    promptsCompleted: 12,
    timeSpent: 28,
    joulesEarned: 89,
    difficulty: "Easy",
  },
  {
    id: "8",
    algorithmTitle: "Coin Change",
    algorithmUrl: "https://leetcode.com/problems/coin-change",
    date: "2024-12-21",
    status: "completed",
    dominantElement: "water",
    promptsCompleted: 12,
    timeSpent: 72,
    joulesEarned: 203,
    difficulty: "Medium",
  },
];

const elementEmojis = {
  earth: "🌳",
  fire: "🔥",
  air: "💨",
  water: "🌊",
};

const elementColors = {
  earth: "bg-earth",
  fire: "bg-fire",
  air: "bg-air",
  water: "bg-water",
};

const elementBgColors = {
  earth: "bg-earth/10",
  fire: "bg-fire/10",
  air: "bg-air/10",
  water: "bg-water/10",
};

export default function SessionsPage() {
  const [filter, setFilter] = useState("all");
  const [elementFilter, setElementFilter] = useState("all");

  const filteredSessions = mockSessions.filter((session) => {
    if (filter !== "all" && session.status !== filter) return false;
    if (elementFilter !== "all" && session.dominantElement !== elementFilter) return false;
    return true;
  });

  const totalJoules = filteredSessions.reduce((a, b) => a + b.joulesEarned, 0);
  const totalTime = filteredSessions.reduce((a, b) => a + b.timeSpent, 0);
  const avgCompletion =
    filteredSessions.reduce((a, b) => a + b.promptsCompleted, 0) /
    filteredSessions.length /
    12;

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lp:px-20">
        {/* Header */}
        <div className="flex flex-col tb:flex-row tb:items-center tb:justify-between gap-6 mb-8">
          <div>
            <h1 className="font-display text-4xl lp:text-5xl text-black mb-2">
              Your Sessions
            </h1>
            <p className="text-smoke">
              Every algorithm you've thought through, preserved.
            </p>
          </div>
          <Button
            as="a"
            href="https://leetcode.com"
            target="_blank"
            className="bg-black text-white hover:bg-ash transition-colors"
            radius="none"
          >
            Start New Session
          </Button>
        </div>

        {/* Stats Summary */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-change">{totalJoules}</div>
            <div className="text-sm text-smoke">Total Joules</div>
          </div>
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-black">{totalTime} min</div>
            <div className="text-sm text-smoke">Time Invested</div>
          </div>
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-earth">
              {Math.round(avgCompletion * 100)}%
            </div>
            <div className="text-sm text-smoke">Avg Completion</div>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-col tb:flex-row gap-4 mb-8">
          <div className="flex bg-mist/50 rounded-lg p-1">
            {["all", "completed", "abandoned"].map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all capitalize ${
                  filter === status
                    ? "bg-white text-black shadow-sm"
                    : "text-smoke hover:text-black"
                }`}
              >
                {status === "all" ? "All Sessions" : status}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            {["all", "earth", "fire", "air", "water"].map((element) => (
              <button
                key={element}
                onClick={() => setElementFilter(element)}
                className={`w-10 h-10 rounded-lg flex items-center justify-center text-lg transition-all ${
                  elementFilter === element
                    ? element === "all"
                      ? "bg-black text-white"
                      : `${elementBgColors[element]} ring-2 ring-offset-2 ring-${element}`
                    : "bg-mist/50 hover:bg-mist"
                }`}
              >
                {element === "all" ? "✦" : elementEmojis[element]}
              </button>
            ))}
          </div>
        </div>

        {/* Sessions List */}
        <div className="space-y-4">
          {filteredSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
              className="block bg-white border border-mist rounded-xl p-6 hover:shadow-lg hover:border-smoke/30 transition-all"
            >
              <div className="flex items-start gap-6">
                {/* Element indicator */}
                <div
                  className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl shrink-0 ${
                    elementBgColors[session.dominantElement]
                  }`}
                >
                  {elementEmojis[session.dominantElement]}
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 mb-2">
                    <h3 className="font-display text-xl text-black">
                      {session.algorithmTitle}
                    </h3>
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
                    {session.status === "completed" ? (
                      <span className="text-xs bg-black text-white px-2 py-1 rounded">
                        ✓ Completed
                      </span>
                    ) : (
                      <span className="text-xs bg-smoke/20 text-smoke px-2 py-1 rounded">
                        Abandoned
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 text-sm text-smoke mb-4">
                    <span>{session.date}</span>
                    <span>•</span>
                    <span>{session.timeSpent} minutes</span>
                    <span>•</span>
                    <span>{session.promptsCompleted}/12 prompts</span>
                  </div>

                  {/* Progress bar */}
                  <div className="progress-bar h-2">
                    <div
                      className={`progress-bar-fill ${elementColors[session.dominantElement]}`}
                      style={{ width: `${(session.promptsCompleted / 12) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Joules earned */}
                <div className="text-right shrink-0">
                  <div className="text-2xl font-bold text-change">
                    +{session.joulesEarned}
                  </div>
                  <div className="text-sm text-smoke">joules</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

        {filteredSessions.length === 0 && (
          <div className="text-center py-16">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="font-display text-2xl text-black mb-2">No sessions found</h3>
            <p className="text-smoke mb-6">Try adjusting your filters or start a new session.</p>
            <Button
              as="a"
              href="https://leetcode.com"
              target="_blank"
              className="bg-black text-white"
              radius="none"
            >
              Start New Session
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}

