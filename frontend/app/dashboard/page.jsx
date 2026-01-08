"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth } from "@clerk/nextjs";
import Footer from "@/components/Footer";

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
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [stats, setStats] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchData();
    }
  }, [isLoaded, isSignedIn]);

  async function fetchData() {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setError("Unable to authenticate");
        return;
      }

      const API_URL = "/api/backend-api";

      // Fetch stats
      const statsResponse = await fetch(`${API_URL}/user/stats`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      } else {
        const err = await statsResponse.json().catch(() => ({}));
        setError(err.detail || "Failed to load stats from backend.");
      }

      // Fetch sessions (limit to 5 for dashboard preview)
      const sessionsResponse = await fetch(`${API_URL}/user/sessions?limit=5`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setSessions(sessionsData.sessions || []);
      } else {
        const err = await sessionsResponse.json().catch(() => ({}));
        setError(err.detail || "Failed to load sessions from backend.");
      }

      // If we got here without throwing and no endpoint complained, clear error
      // (If an endpoint set an error above, keep it.)
      setError((prev) => prev);
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Unable to load data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }

    console.log("3. ---> stats: ", stats);
  }

  // Calculate element progress from stats
  const elementProgress = stats?.element_breakdown ? [
    { id: "earth", emoji: "🌳", name: "Earth", progress: Math.min(100, (stats.element_breakdown.earth || 0) / 100), words: stats.element_breakdown.earth || 0 },
    { id: "fire", emoji: "🔥", name: "Fire", progress: Math.min(100, (stats.element_breakdown.fire || 0) / 100), words: stats.element_breakdown.fire || 0 },
    { id: "air", emoji: "💨", name: "Air", progress: Math.min(100, (stats.element_breakdown.air || 0) / 100), words: stats.element_breakdown.air || 0 },
    { id: "water", emoji: "🌊", name: "Water", progress: Math.min(100, (stats.element_breakdown.water || 0) / 100), words: stats.element_breakdown.water || 0 },
  ] : [];

  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎭</div>
          <p className="text-smoke">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pt-24 pb-16">
      <div className="max-w-[1400px] mx-auto px-6 lp:px-20">
        {/* Header */}
        <div className="flex flex-col tb:flex-row tb:items-center tb:justify-between gap-6 mb-12">
          <div>
            <h1 className="font-display text-4xl lp:text-5xl text-black mb-2">
              Your Dashboard
            </h1>
            <p className="text-smoke">
              {loading ? "Loading your progress..." : error ? error : "Track your thinking journey"}
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
              as={Link}
              href="/go/leetcode?url=https%3A%2F%2Fleetcode.com%2F"
              target="_blank"
              rel="noopener noreferrer"
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
            <div className="text-4xl font-bold text-black">
              {loading ? "-" : stats?.current_streak || 0}
            </div>
            <div className="text-sm text-smoke">days in a row</div>
          </div>

          <div className="bg-gradient-to-br from-change/10 to-change/5 rounded-xl p-6 border border-change/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">⚡</span>
              <span className="text-sm font-medium text-change">Total Joules</span>
            </div>
            <div className="text-4xl font-bold text-black">
              {loading ? "-" : (stats?.total_joules || 0).toLocaleString()}
            </div>
            <div className="text-sm text-smoke">mental energy</div>
          </div>

          <div className="bg-gradient-to-br from-earth/10 to-earth/5 rounded-xl p-6 border border-earth/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">📊</span>
              <span className="text-sm font-medium text-earth">Sessions</span>
            </div>
            <div className="text-4xl font-bold text-black">
              {loading ? "-" : stats?.total_sessions || 0}
            </div>
            <div className="text-sm text-smoke">algorithms explored</div>
          </div>

          <div className="bg-gradient-to-br from-air/10 to-air/5 rounded-xl p-6 border border-air/20">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-2xl">🎯</span>
              <span className="text-sm font-medium text-air">Completion</span>
            </div>
            <div className="text-4xl font-bold text-black">
              {loading ? "-" : stats?.total_sessions > 0 
                ? Math.round((stats?.completed_sessions / stats?.total_sessions) * 100) 
                : 0}%
            </div>
            <div className="text-sm text-smoke">sessions completed</div>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid lp:grid-cols-3 gap-8">
          {/* Left Column - Element Progress */}
          <div className="lp:col-span-1">
            <div className="bg-white rounded-xl border border-mist p-6 mb-8">
              <h2 className="font-display text-2xl text-black mb-6">Element Mastery</h2>
              
              {loading ? (
                <div className="text-center py-8 text-smoke">Loading...</div>
              ) : elementProgress.length > 0 ? (
              <div className="space-y-6">
                  {elementProgress.map((element) => (
                  <div key={element.id}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{element.emoji}</span>
                        <span className="font-medium text-black">{element.name}</span>
                      </div>
                      <span className="text-sm font-mono text-smoke">
                          {element.words} words
                      </span>
                    </div>
                    <div className="progress-bar">
                      <div
                        className={`progress-bar-fill ${elementColors[element.id]}`}
                        style={{ width: `${element.progress}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
              ) : (
                <div className="text-center py-8 text-smoke">
                  Complete sessions to see your element mastery
                </div>
              )}

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

              {loading ? (
                <div className="text-center py-12 text-smoke">Loading sessions...</div>
              ) : sessions.length > 0 ? (
              <div className="space-y-3">
                  {sessions.map((session) => (
                  <Link
                    key={session.id}
                    href={`/sessions/${session.id}`}
                    className="session-card block p-4 rounded-lg hover:bg-mist/50 transition-all"
                  >
                    <div className="flex items-start gap-4">
                      {/* Element indicator */}
                        <div className="w-12 h-12 rounded-lg flex items-center justify-center text-2xl bg-mist">
                          {session.prompts_completed >= 12 ? "✅" : "🎭"}
                      </div>

                      {/* Session info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-black truncate">
                              {session.algorithm_title}
                          </h3>
                          {session.status === "completed" ? (
                            <span className="text-xs bg-earth/10 text-earth px-2 py-0.5 rounded">
                              Completed
                            </span>
                          ) : (
                            <span className="text-xs bg-smoke/10 text-smoke px-2 py-0.5 rounded">
                                {session.status}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-4 text-sm text-smoke">
                            <span>{new Date(session.started_at).toLocaleDateString()}</span>
                          <span>•</span>
                            <span>{session.prompts_completed}/12 prompts</span>
                        </div>
                      </div>

                      {/* Joules earned */}
                      <div className="text-right">
                          <div className="font-bold text-change">+{session.prompts_completed * 10}</div>
                        <div className="text-xs text-smoke">joules</div>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="mt-3 progress-bar h-1">
                      <div
                          className="progress-bar-fill bg-change"
                          style={{ width: `${(session.prompts_completed / 12) * 100}%` }}
                      />
                    </div>
                  </Link>
                ))}
              </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-4xl mb-4">🧩</div>
                  <h3 className="font-display text-xl text-black mb-2">No sessions yet</h3>
                  <p className="text-smoke mb-6">
                    Start your first session by opening a problem on LeetCode!
                  </p>
                  <Button
                    as={Link}
                    href="/go/leetcode?url=https%3A%2F%2Fleetcode.com%2F"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-black text-white"
                    radius="none"
                  >
                    Go to LeetCode
                  </Button>
                </div>
              )}
            </div>

            {/* Quick Tips */}
            {!loading && stats?.element_breakdown && (
            <div className="mt-8 bg-gradient-to-br from-black to-ash rounded-xl p-6 text-white">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-2xl shrink-0">
                  💡
                </div>
                <div>
                  <h3 className="font-display text-xl mb-2">Thinking Tip</h3>
                  <p className="text-white/70 text-sm">
                      {getWeakestElementTip(stats.element_breakdown)}
                  </p>
                  </div>
                </div>
              </div>
            )}
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

function getWeakestElementTip(breakdown) {
  const elements = Object.entries(breakdown);
  if (elements.every(([, v]) => v === 0)) {
    return "Start your first session to begin tracking your element mastery!";
  }

  const [weakest] = elements.reduce((min, curr) => 
    curr[1] < min[1] ? curr : min
  );

  const tips = {
    earth: "Your Earth element could use more attention. Focus on understanding the fundamentals—what are the absolute basics of each problem?",
    fire: "Your Fire element is lower than others. Remember to embrace failure! Try writing rough solutions quickly, even if they're wrong.",
    air: "Your Air element needs work. Practice asking more questions—what is the REAL problem you're trying to solve?",
    water: "Your Water element engagement is lower. Try seeing the flow of ideas—how does one concept connect to another?",
  };

  return tips[weakest] || "Keep practicing all elements for balanced growth!";
}
