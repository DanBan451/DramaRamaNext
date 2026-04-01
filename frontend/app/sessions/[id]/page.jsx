"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth } from "@clerk/nextjs";
import { useParams } from "next/navigation";
import Spinner from "@/components/Spinner";
import InsightStructure from "@/components/InsightStructure";

// Element colors (original brighter versions)
const ELEMENT_COLORS = {
  earth: "#4A7C59",
  fire: "#E85D04",
  air: "#7B9EA8",
  water: "#3D5A80",
  change: "#9B5DE5",
};

export default function SessionDetailPage() {
  const { id } = useParams();
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [session, setSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [understanding, setUnderstanding] = useState(null);
  const [insights, setInsights] = useState([]);
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

      const API_URL = "/api/backend-api";

      // Fetch session details
      const sessionRes = await fetch(`${API_URL}/user/sessions/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (sessionRes.ok) {
        const data = await sessionRes.json();
        setSession(data.session);
        setError(null);
        
        // Fetch conversation messages
        const msgsRes = await fetch(`${API_URL}/session/${id}/element-messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (msgsRes.ok) {
          const msgsData = await msgsRes.json();
          // Flatten all messages into single thread
          const allMsgs = [];
          Object.values(msgsData.messages || {}).forEach(msgList => {
            msgList.forEach(msg => {
              allMsgs.push({
                role: msg.role,
                text: msg.message_text,
                element: msg.element_applied || "earth",
                createdAt: msg.created_at,
              });
            });
          });
          allMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          setMessages(allMsgs);
        }
        
        // Fetch deep understanding
        const duRes = await fetch(`${API_URL}/session/${id}/deep-understanding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (duRes.ok) {
          const duData = await duRes.json();
          setUnderstanding(duData.understanding_document);
          // Parse insights from the understanding document if available
          if (duData.insights && Array.isArray(duData.insights)) {
            setInsights(duData.insights);
          }
        }
        
        // Fetch insights separately if not included in understanding
        const insightsRes = await fetch(`${API_URL}/session/${id}/insights`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (insightsRes.ok) {
          const insightsData = await insightsRes.json();
          if (insightsData.insights && Array.isArray(insightsData.insights)) {
            setInsights(insightsData.insights);
          }
        }
      } else if (sessionRes.status === 404) {
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
          <Spinner size="lg" color="black" />
          <p className="text-smoke mt-4">Loading session...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-white pt-24 pb-16">
        <div className="max-w-4xl mx-auto px-6">
          <div className="text-center py-16 bg-mist rounded-lg">
            <p className="text-primary font-medium mb-2">Error</p>
            <p className="text-smoke text-sm mb-6">{error}</p>
            <Button
              as={Link}
              href="/profile"
              className="bg-black text-white hover:bg-ash"
              radius="none"
            >
              Back to Profile
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-6xl mx-auto px-6 py-24 pt-32">
        {/* Header */}
        <div className="mb-8">
          <Link
            href="/profile"
            className="inline-flex items-center gap-2 text-smoke hover:text-black transition-colors mb-6"
          >
            ← Back to Profile
          </Link>

          <h1 className="font-display text-3xl text-black mb-3">
            {session?.problem_description 
              ? (session.problem_description.length > 100 
                  ? session.problem_description.slice(0, 100) + "…" 
                  : session.problem_description) 
              : "Session"}
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
            <span className={`px-2 py-1 rounded text-xs ${
              session?.status === "completed" 
                ? "bg-earth/10 text-earth" 
                : "bg-change/10 text-change"
            }`}>
              {session?.status === "completed" ? "Completed" : "In Progress"}
            </span>
          </div>
        </div>

        {/* Two Column Layout */}
        <div className="grid lg:grid-cols-2 gap-8">
          {/* Left: Understanding Structure */}
          <div>
            <h2 className="text-sm uppercase tracking-widest text-smoke mb-4">
              Understanding Structure
            </h2>
            <div className="bg-white border border-mist rounded-lg p-4 min-h-[400px] shadow-sm">
              {insights.length > 0 ? (
                <InsightStructure insights={insights} animated={false} />
              ) : understanding ? (
                <p className="text-ash leading-relaxed whitespace-pre-wrap p-2">
                  {understanding}
                </p>
              ) : (
                <div className="text-center py-12">
                  <p className="text-smoke">No understanding structure yet</p>
                </div>
              )}
            </div>
            
            {/* Thinker Description */}
            {session?.thinker_description && (
              <div className="mt-6 p-4 bg-mist rounded-lg">
                <p className="text-sm text-smoke mb-2">Thinker Profile</p>
                <p className="text-black italic">"{session.thinker_description}"</p>
              </div>
            )}
          </div>

          {/* Right: Conversation */}
          <div>
            <h2 className="text-sm uppercase tracking-widest text-smoke mb-4">
              Conversation
            </h2>
            <div className="bg-mist/30 border border-mist rounded-lg p-6 min-h-[400px] max-h-[600px] overflow-y-auto">
              {messages.length > 0 ? (
                <div className="space-y-4">
                  {messages.map((msg, i) => (
                    <div 
                      key={i} 
                      className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                    >
                      <div 
                        className={`max-w-[85%] px-4 py-3 rounded-lg ${
                          msg.role === "user" 
                            ? "bg-black text-white" 
                            : "bg-white border border-mist text-ash shadow-sm"
                        }`}
                        style={msg.role === "assistant" && msg.element ? {
                          borderLeftColor: ELEMENT_COLORS[msg.element],
                          borderLeftWidth: "4px"
                        } : {}}
                      >
                        <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <p className="text-smoke">No conversation recorded</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mt-8">
          <div className="bg-white border border-mist rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold text-black">
              {messages.filter(m => m.role === "user").length}
            </div>
            <div className="text-xs text-smoke uppercase tracking-widest">Messages</div>
          </div>
          <div className="bg-white border border-mist rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold text-change">
              +{(session?.prompts_completed || messages.filter(m => m.role === "user").length) * 10}
            </div>
            <div className="text-xs text-smoke uppercase tracking-widest">Joules</div>
          </div>
          <div className="bg-white border border-mist rounded-lg p-4 text-center shadow-sm">
            <div className="text-2xl font-semibold text-black">
              {messages.filter(m => m.role === "user").reduce((sum, m) => sum + (m.text?.split(/\s+/).length || 0), 0)}
            </div>
            <div className="text-xs text-smoke uppercase tracking-widest">Words</div>
          </div>
        </div>
      </div>
    </div>
  );
}
