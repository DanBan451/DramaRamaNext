"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@nextui-org/button";

// Mock data - will be replaced with real data from backend
const mockUser = {
  name: "Daniel",
  joules: 2847,
  streak: 7,
  totalSessions: 23,
  joinedDate: "Nov 2024",
};

const mockElementProgress = [
  { id: "earth", emoji: "🌳", name: "Earth", progress: 85, sessions: 18 },
  { id: "fire", emoji: "🔥", name: "Fire", progress: 72, sessions: 15 },
  { id: "air", emoji: "💨", name: "Air", progress: 90, sessions: 20 },
  { id: "water", emoji: "🌊", name: "Water", progress: 65, sessions: 12 },
];

const mockRecentSessions = [
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
  },
];

const mockWeeklyActivity = [
  { day: "Mon", joules: 124 },
  { day: "Tue", joules: 98 },
  { day: "Wed", joules: 156 },
  { day: "Thu", joules: 45 },
  { day: "Fri", joules: 187 },
  { day: "Sat", joules: 0 },
  { day: "Sun", joules: 78 },
];

const elementColors = {
  earth: "bg-earth",
  fire: "bg-fire",
  air: "bg-air",
  water: "bg-water",
  change: "bg-change",
};

const elementEmojis = {
  earth: "🌳",
  fire: "🔥",
  air: "💨",
  water: "🌊",
  change: "🪨",
};

export default function DashboardPage() {
  const [activeTab, setActiveTab] = useState("overview");
  const maxJoules = Math.max(...mockWeeklyActivity.map((d) => d.joules));

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lp:px-20">
        {/* Header */}
        <div className="flex flex-col tb:flex-row tb:items-center tb:justify-between gap-6 mb-12">
          <div>
            <h1 className="font-display text-4xl lp:text-5xl text-black mb-2">
              Welcome back, {mockUser.name}
            </h1>
            <p className="text-smoke">
              Member since {mockUser.joinedDate} • Keep up the great thinking!
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              as={Link}
              href="/sessions"
              className="bg-mist text-black hover:bg-smoke hover:text-white transition-colors"
              radius="none"
            >
              View All Sessions
            </Button>
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
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-2 lp:grid-cols-4 gap-4 mb-12">
          <div className="bg-gradient-to-br from-fire/10 to-fire/5 rounded-xl p-6 border border-fire/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl streak-flame">🔥</span>
              <span className="text-sm font-medium text-fire">Streak</span>
            </div>
            <div className="text-4xl font-bold text-black">{mockUser.streak}</div>
            <div className="text-sm text-smoke">days in a row</div>
          </div>

          <div className="bg-gradient-to-br from-change/10 to-change/5 rounded-xl p-6 border border-change/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <span className="text-sm font-medium text-change">Total Joules</span>
            </div>
            <div className="text-4xl font-bold text-black">{mockUser.joules.toLocaleString()}</div>
            <div className="text-sm text-smoke">mental energy</div>
          </div>

          <div className="bg-gradient-to-br from-earth/10 to-earth/5 rounded-xl p-6 border border-earth/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-earth">Sessions</span>
            </div>
            <div className="text-4xl font-bold text-black">{mockUser.totalSessions}</div>
            <div className="text-sm text-smoke">algorithms explored</div>
          </div>

          <div className="bg-gradient-to-br from-air/10 to-air/5 rounded-xl p-6 border border-air/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <span className="text-sm font-medium text-air">Completion</span>
            </div>
            <div className="text-4xl font-bold text-black">87%</div>
            <div className="text-sm text-smoke">sessions completed</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lp:grid-cols-3 gap-8">
          {/* Left Column - Element Progress */}
          <div className="lp:col-span-1">
            <div className="bg-white rounded-xl border border-mist p-6 mb-8">
              <h2 className="font-display text-2xl text-black mb-6">Element Mastery</h2>
              <div className="space-y-6">
                {mockElementProgress.map((element) => (
                  <div key={element.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{element.emoji}</span>
                        <span className="font-medium text-black">{element.name}</span>
                      </div>
                      <span className="text-sm font-mono text-smoke">
                        {element.progress}%
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill ${elementColors[element.id]}`}
                        style={{ width: `${element.progress}%` }}
                      />
                    </div>
                    <div className="text-xs text-smoke mt-1">
                      {element.sessions} sessions
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-8 pt-6 border-t border-mist">
                <Link
                  href="/elements"
                  className="flex items-center gap-2 text-sm text-smoke hover:text-black transition-colors"
                >
                  <span>Learn about the Elements</span>
                  <span>→</span>
                </Link>
              </div>
            </div>

            {/* Weekly Activity */}
            <div className="bg-white rounded-xl border border-mist p-6">
              <h2 className="font-display text-2xl text-black mb-6">This Week</h2>
              <div className="flex items-end justify-between h-32 gap-2">
                {mockWeeklyActivity.map((day, i) => (
                  <div key={i} className="flex-1 flex flex-col items-center gap-2">
                    <div
                      className={`w-full rounded-t transition-all ${
                        day.joules > 0 ? "bg-change" : "bg-mist"
                      }`}
                      style={{
                        height: `${day.joules > 0 ? (day.joules / maxJoules) * 100 : 10}%`,
                        minHeight: "4px",
                      }}
                    />
                    <span className="text-xs text-smoke">{day.day}</span>
                  </div>
                ))}
              </div>
              <div className="mt-4 pt-4 border-t border-mist flex justify-between text-sm">
                <span className="text-smoke">Total this week</span>
                <span className="font-semibold text-black">
                  {mockWeeklyActivity.reduce((a, b) => a + b.joules, 0)} joules
                </span>
              </div>
            </div>
          </div>

          {/* Right Column - Recent Sessions */}
          <div className="lp:col-span-2">
            <div className="bg-white rounded-xl border border-mist p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="font-display text-2xl text-black">Recent Sessions</h2>
                <Link
                  href="/sessions"
                  className="text-sm text-smoke hover:text-black transition-colors"
                >
                  View all →
                </Link>
              </div>

              <div className="space-y-3">
                {mockRecentSessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="session-card block p-4 rounded-lg hover:bg-mist/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Element indicator */}
                      <div
                        className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                          session.dominantElement === "earth"
                            ? "bg-earth/10"
                            : session.dominantElement === "fire"
                            ? "bg-fire/10"
                            : session.dominantElement === "air"
                            ? "bg-air/10"
                            : "bg-water/10"
                        }`}
                      >
                        {elementEmojis[session.dominantElement]}
                      </div>

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-black truncate">
                            {session.algorithmTitle}
                          </h3>
                          {session.status === "completed" ? (
                            <span className="text-xs bg-earth/10 text-earth px-2 py-0.5 rounded">
                              Completed
                            </span>
                          ) : (
                            <span className="text-xs bg-smoke/10 text-smoke px-2 py-0.5 rounded">
                              Abandoned
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-smoke">
                          <span>{session.date}</span>
                          <span>•</span>
                          <span>{session.timeSpent} min</span>
                          <span>•</span>
                          <span>{session.promptsCompleted}/12 prompts</span>
                        </div>
                      </div>

                      {/* Joules earned */}
                      <div className="text-right">
                        <div className="font-bold text-change">+{session.joulesEarned}</div>
                        <div className="text-xs text-smoke">joules</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 progress-bar h-1">
                      <div
                        className={`progress-bar-fill ${elementColors[session.dominantElement]}`}
                        style={{ width: `${(session.promptsCompleted / 12) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Quick Tips */}
            <div className="mt-8 bg-gradient-to-br from-black to-ash rounded-xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl shrink-0">
                  💡
                </div>
                <div>
                  <h3 className="font-display text-xl mb-2">Thinking Tip</h3>
                  <p className="text-white/70 text-sm">
                    Your <strong className="text-water">Water</strong> element engagement is lower
                    than others. Try focusing on seeing the flow of ideas in your next session—how
                    does one concept lead to another? What paths haven't you explored?
                  </p>
                  <Link
                    href="/elements#water"
                    className="inline-block mt-3 text-sm text-white/60 hover:text-white transition-colors"
                  >
                    Learn more about Water →
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

