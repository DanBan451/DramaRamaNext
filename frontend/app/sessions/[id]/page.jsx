"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";

const elementEmojis = {
  earth: "🌳",
  fire: "🔥",
  air: "💨",
  water: "🌊",
};

const elementColors = {
  earth: "border-l-earth bg-earth/5",
  fire: "border-l-fire bg-fire/5",
  air: "border-l-air bg-air/5",
  water: "border-l-water bg-water/5",
};

export default function SessionDetailPage() {
  const { id } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [session, setSession] = useState(null);
  const [responses, setResponses] = useState([]);
  const [hint, setHint] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isLoaded && isSignedIn && id) {
      fetchSessionDetail();
    }
  }, [isLoaded, isSignedIn, id]);

  async function fetchSessionDetail() {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setError("Unable to authenticate");
        return;
      }

      const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

      const response = await fetch(`${API_URL}/api/user/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSession(data.session);
        setResponses(data.responses || []);
        setHint(data.hint);
        setError(null);
      } else if (response.status === 404) {
        setError("Session not found");
      } else {
        setError("Failed to load session");
      }
    } catch (err) {
      console.error("Error fetching session:", err);
      setError("Unable to load session. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin text-4xl mb-4">🎭</div>
          <p className="text-smoke">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-[1000px] mx-auto px-6 lp:px-20">
          <div className="text-center py-16 bg-fire/5 rounded-xl border border-fire/20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-fire font-medium mb-2">Error</p>
            <p className="text-smoke text-sm mb-6">{error}</p>
            <Button
              as={Link}
              href="/sessions"
              className="bg-black text-white"
              radius="none"
            >
              Back to Sessions
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24 pb-16">
      <div className="max-w-[1000px] mx-auto px-6 lp:px-20">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/sessions"
            className="inline-flex items-center gap-2 text-smoke hover:text-black transition-colors mb-6"
          >
            ← Back to Sessions
          </Link>
          
          <div className="flex flex-col tb:flex-row tb:items-start tb:justify-between gap-4">
            <div>
              <h1 className="font-display text-3xl lp:text-4xl text-black mb-2">
                {session?.algorithm_title}
              </h1>
              <div className="flex items-center gap-4 text-sm text-smoke">
                <span>
                  {session?.started_at && new Date(session.started_at).toLocaleDateString('en-US', {
                    weekday: 'long',
                    month: 'long',
                    day: 'numeric',
                    year: 'numeric'
                  })}
                </span>
                <span>•</span>
                <span className={`px-2 py-0.5 rounded ${
                  session?.status === "completed" ? "bg-earth/10 text-earth" :
                  session?.status === "in_progress" ? "bg-air/10 text-air" :
                  "bg-smoke/10 text-smoke"
                }`}>
                  {session?.status?.replace("_", " ")}
                </span>
              </div>
            </div>

            {session?.algorithm_url && (
              <Button
                as="a"
                href={session.algorithm_url}
                target="_blank"
                className="bg-mist text-black hover:bg-smoke hover:text-white transition-colors"
                radius="none"
              >
                View Problem →
              </Button>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        <div className="bg-mist/50 rounded-xl p-6 mb-8">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-medium text-black">Progress</span>
            <span className="text-sm font-mono text-smoke">
              {session?.prompts_completed || 0}/12 prompts
            </span>
          </div>
          <div className="progress-bar h-3">
            <div
              className="progress-bar-fill bg-change"
              style={{ width: `${((session?.prompts_completed || 0) / 12) * 100}%` }}
            />
          </div>
          <div className="flex justify-between mt-2 text-xs text-smoke">
            <span>🌳 Earth</span>
            <span>🔥 Fire</span>
            <span>💨 Air</span>
            <span>🌊 Water</span>
          </div>
        </div>

        {/* Responses */}
        <div className="space-y-4 mb-12">
          <h2 className="font-display text-2xl text-black mb-6">Your Responses</h2>
          
          {responses.length > 0 ? (
            responses.map((response, index) => (
              <div
                key={response.id}
                className={`border-l-4 rounded-r-lg p-6 ${elementColors[response.element]}`}
              >
                <div className="flex items-center gap-3 mb-3">
                  <span className="text-2xl">{elementEmojis[response.element]}</span>
                  <div>
                    <div className="font-semibold text-black">
                      {response.element?.toUpperCase()} {response.sub_element}
                    </div>
                    <div className="text-sm text-smoke">
                      {response.prompt?.name}
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg p-4 mb-3">
                  <p className="text-sm text-smoke mb-2 italic">
                    "{response.prompt?.prompt}"
                  </p>
                </div>

                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-black whitespace-pre-wrap">
                    {response.response_text}
                  </p>
                </div>

                <div className="flex items-center gap-4 mt-3 text-xs text-smoke">
                  <span>{response.word_count} words</span>
                  <span>•</span>
                  <span>{Math.floor(response.time_spent_seconds / 60)}m {response.time_spent_seconds % 60}s</span>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-mist/30 rounded-xl">
              <p className="text-smoke">No responses recorded yet.</p>
            </div>
          )}
        </div>

        {/* AI Hint */}
        {hint && (
          <div className="bg-gradient-to-br from-change/10 to-fire/10 rounded-xl p-8 border border-change/20">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🎯</span>
              <h2 className="font-display text-2xl text-black">Your Personalized Nudge</h2>
            </div>
            
            {hint.element_focus && (
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full text-sm mb-4">
                <span>{elementEmojis[hint.element_focus]}</span>
                <span className="font-medium">Focus: {hint.element_focus}</span>
              </div>
            )}

            <div className="bg-white/80 rounded-lg p-6">
              <p className="text-black whitespace-pre-wrap leading-relaxed">
                {hint.hint_text}
              </p>
            </div>

            {hint.user_final_response && (
              <div className="mt-6 pt-6 border-t border-change/20">
                <h3 className="font-semibold text-black mb-3">Your Response to the Nudge</h3>
                <div className="bg-white/50 rounded-lg p-4">
                  <p className="text-smoke">{hint.user_final_response}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Session Stats */}
        <div className="grid grid-cols-2 lp:grid-cols-4 gap-4 mt-8">
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-black">
              {responses.reduce((sum, r) => sum + r.word_count, 0)}
            </div>
            <div className="text-sm text-smoke">Total Words</div>
          </div>
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-black">
              {Math.floor(responses.reduce((sum, r) => sum + r.time_spent_seconds, 0) / 60)}m
            </div>
            <div className="text-sm text-smoke">Time Spent</div>
          </div>
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-change">
              +{(session?.prompts_completed || 0) * 10}
            </div>
            <div className="text-sm text-smoke">Joules Earned</div>
          </div>
          <div className="bg-mist/30 rounded-lg p-4 text-center">
            <div className="text-2xl font-bold text-black">
              {responses.length > 0 
                ? Math.round(responses.reduce((sum, r) => sum + r.word_count, 0) / responses.length)
                : 0}
            </div>
            <div className="text-sm text-smoke">Avg Words/Prompt</div>
          </div>
        </div>
      </div>
    </div>
  );
}
