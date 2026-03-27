"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth, useUser } from "@clerk/nextjs";
import Footer from "@/components/Footer";

const ELEMENTS_META = [
  { id: "earth", emoji: "🌳", name: "Earth", title: "Understand Deeply" },
  { id: "fire", emoji: "🔥", name: "Fire", title: "Fail Effectively" },
  { id: "air", emoji: "�", name: "Air", title: "Create Questions" },
  { id: "water", emoji: "🌊", name: "Water", title: "Flow of Ideas" },
];

export default function DashboardPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();
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
      if (!token) { setError("Unable to authenticate"); return; }

      const API_URL = "/api/backend-api";

      const [statsRes, sessionsRes] = await Promise.all([
        fetch(`${API_URL}/user/stats`, { headers: { Authorization: `Bearer ${token}` } }),
        fetch(`${API_URL}/user/sessions?limit=10`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (statsRes.ok) setStats(await statsRes.json());
      else {
        const err = await statsRes.json().catch(() => ({}));
        setError(err.detail || "Failed to load stats.");
      }

      if (sessionsRes.ok) {
        const data = await sessionsRes.json();
        setSessions(data.sessions || []);
      }
    } catch (err) {
      console.error("Error fetching data:", err);
      setError("Unable to load data. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  // Compute element strengths from breakdown
  const elementStrengths = stats?.element_breakdown
    ? ELEMENTS_META.map((el) => ({
        ...el,
        words: stats.element_breakdown[el.id] || 0,
      })).sort((a, b) => b.words - a.words)
    : [];

  const totalWords = elementStrengths.reduce((s, e) => s + e.words, 0) || 1;

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
        <div className="max-w-[1536px] mx-auto px-6">

          {/* Profile Header */}
          <div className="flex flex-col tb:flex-row tb:items-end tb:justify-between gap-6 mb-12">
            <div className="flex items-center gap-5">
              <div className="w-20 h-20 rounded-full bg-gradient-to-br from-change/30 to-earth/30 flex items-center justify-center text-4xl border-2 border-mist">
                🎭
              </div>
              <div>
                <h1 className="font-display text-4xl lp:text-5xl text-black mb-1">
                  {user?.firstName || "Thinker"}
                </h1>
                <p className="text-smoke">
                  {loading ? "Loading…" : error ? error : `${stats?.completed_sessions || 0} battles completed · ${(stats?.total_joules || 0).toLocaleString()} joules earned`}
                </p>
              </div>
            </div>
            <Button
              as={Link}
              href="/workspace"
              className="bg-black text-white hover:bg-ash transition-colors"
              radius="none"
            >
              New Battle →
            </Button>
          </div>

          {/* Key Stats Row */}
          <div className="grid grid-cols-3 gap-4 mb-12">
            <div className="text-center py-6 border border-mist rounded-xl">
              <div className="text-3xl font-bold text-black">{loading ? "-" : stats?.total_sessions || 0}</div>
              <div className="text-xs text-smoke uppercase tracking-wider mt-1">Battles</div>
            </div>
            <div className="text-center py-6 border border-mist rounded-xl">
              <div className="text-3xl font-bold text-change">{loading ? "-" : (stats?.total_joules || 0).toLocaleString()}</div>
              <div className="text-xs text-smoke uppercase tracking-wider mt-1">Joules</div>
            </div>
            <div className="text-center py-6 border border-mist rounded-xl">
              <div className="text-3xl font-bold text-fire">{loading ? "-" : stats?.current_streak || 0}</div>
              <div className="text-xs text-smoke uppercase tracking-wider mt-1">Day Streak</div>
            </div>
          </div>

          <div className="grid lp:grid-cols-3 gap-8">
            {/* Left — Element Strengths */}
            <div className="lp:col-span-1">
              <div className="border border-mist rounded-xl p-6">
                <h2 className="font-display text-xl text-black mb-5">Element Strengths</h2>
                {loading ? (
                  <div className="text-center py-6 text-smoke">Loading…</div>
                ) : elementStrengths.length > 0 && totalWords > 1 ? (
                  <div className="space-y-4">
                    {elementStrengths.map((el) => {
                      const pct = Math.round((el.words / totalWords) * 100);
                      return (
                        <div key={el.id} className="flex items-center gap-3">
                          <span className="text-xl w-8 text-center">{el.emoji}</span>
                          <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-sm font-medium text-black">{el.name}</span>
                              <span className="text-xs text-smoke font-mono">{pct}%</span>
                            </div>
                            <div className="h-2 bg-mist rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full bg-${el.id} transition-all`}
                                style={{ width: `${pct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="text-center py-6 text-smoke text-sm">
                    Complete battles to see your element strengths
                  </div>
                )}
                <div className="mt-6 pt-4 border-t border-mist">
                  <Link href="/elements" className="text-sm text-smoke hover:text-black transition-colors">
                    Learn the Elements →
                  </Link>
                </div>
              </div>
            </div>

            {/* Right — Battles */}
            <div className="lp:col-span-2">
              <div className="border border-mist rounded-xl p-6">
                <div className="flex items-center justify-between mb-5">
                  <h2 className="font-display text-xl text-black">Recent Battles</h2>
                  <Link href="/sessions" className="text-sm text-smoke hover:text-black transition-colors">
                    View all →
                  </Link>
                </div>

                {loading ? (
                  <div className="text-center py-12 text-smoke">Loading…</div>
                ) : sessions.length > 0 ? (
                  <div className="space-y-3">
                    {sessions.map((session) => (
                      <Link
                        key={session.id}
                        href={`/sessions/${session.id}`}
                        className="block p-4 rounded-lg border border-mist hover:border-smoke transition-all group"
                      >
                        <div className="flex items-start gap-4">
                          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-lg bg-mist flex-shrink-0">
                            {session.status === "completed" ? "✅" : "⚔️"}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-sm font-medium text-black mb-1 line-clamp-2">
                              {session.problem_description || "Session"}
                            </div>
                            <div className="flex items-center gap-3 text-xs text-smoke">
                              <span>{new Date(session.started_at).toLocaleDateString()}</span>
                              <span>·</span>
                              <span>{session.prompts_completed}/13</span>
                              {session.status === "completed" && (
                                <span className="text-earth font-medium">Completed</span>
                              )}
                              {session.status === "in_progress" && (
                                <span className="text-change font-medium">In Progress</span>
                              )}
                            </div>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <div className="font-bold text-sm text-change">+{session.prompts_completed * 10}</div>
                            <div className="text-[10px] text-smoke">joules</div>
                          </div>
                        </div>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">⚔️</div>
                    <h3 className="font-display text-xl text-black mb-2">No battles yet</h3>
                    <p className="text-smoke mb-6">
                      Describe a real problem and apply the 5 Elements to build deep understanding.
                    </p>
                    <Button as={Link} href="/workspace" className="bg-black text-white" radius="none">
                      Start First Battle
                    </Button>
                  </div>
                )}
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
