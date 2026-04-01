"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useAuth } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import Spinner from "@/components/Spinner";
import InsightStructure from "@/components/InsightStructure";
import LiveDocument from "@/components/LiveDocument";

// Element emoji mapping for clean visual indicators
const ELEMENT_EMOJIS = {
  earth: "🌳",
  fire: "🔥",
  air: "💨",
  water: "🌊",
  change: "🪨",
};

// ─── Setup Phase ─────────────────────────────────────────────────────────────

function SetupPhase({ onStart }) {
  const [problemDescription, setProblemDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const { getToken } = useAuth();

  async function handleStart(e) {
    e.preventDefault();
    if (!problemDescription.trim()) return;
    setLoading(true);
    setErr("");
    try {
      const token = await getToken({ skipCache: true });
      if (!token) throw new Error("Unable to authenticate. Please sign in.");

      const res = await fetch("/api/backend-api/session/start", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ problem_description: problemDescription.trim() }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.detail || "Failed to start session.");
      }
      const data = await res.json();

      onStart({
        problemDescription: data.problem_description,
        sessionId: data.session_id,
        firstMessage: data.first_message,
      });
    } catch (e) {
      setErr(e?.message || "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-white flex items-center justify-center px-6 py-16">
      <div className="max-w-xl w-full">
        <div className="text-center mb-10">
          <h1 className="font-display text-4xl text-black mb-4">
            What are you thinking about?
          </h1>
          <p className="text-smoke text-lg">
            Describe a real problem you're facing. We'll think through it together.
          </p>
        </div>

        <form onSubmit={handleStart} className="flex flex-col gap-4">
          <textarea
            value={problemDescription}
            onChange={(e) => setProblemDescription(e.target.value)}
            placeholder="I'm trying to figure out how to..."
            className="w-full px-5 py-4 bg-white border border-mist text-black placeholder:text-smoke font-sans text-base rounded focus:border-smoke outline-none transition-colors resize-none"
            rows={6}
            disabled={loading}
          />

          {err && <div className="text-primary text-sm">{err}</div>}
          
          <Button
            type="submit"
            className="bg-primary text-white font-medium w-full py-6 hover:bg-primary/90"
            radius="none"
            isLoading={loading}
            isDisabled={!problemDescription.trim() || loading}
          >
            {loading ? "Starting..." : "Start Thinking →"}
          </Button>
        </form>

        <p className="text-center text-smoke text-sm mt-8">
          Your conversation builds a Deep Understanding Document in real time.
        </p>
      </div>
    </div>
  );
}

// ─── Working Phase ────────────────────────────────────────────────────────────

function WorkingPhase({ problemDescription, sessionId, firstMessage, onComplete }) {
  const { getToken } = useAuth();
  
  // Conversation state
  const [messages, setMessages] = useState(() => {
    if (firstMessage) {
      return [{ role: "assistant", text: firstMessage, element: "earth" }];
    }
    return [];
  });
  const [inputText, setInputText] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  
  // Deep Understanding Document - single unified document
  const [documentText, setDocumentText] = useState("");
  const [documentLoading, setDocumentLoading] = useState(true);
  
  // Completion state
  const [completeLoading, setCompleteLoading] = useState(false);
  const [completionData, setCompletionData] = useState(null);
  
  // Resizable panels
  const [leftPanelWidth, setLeftPanelWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const containerRef = useRef(null);

  // Load existing messages and insights on mount
  useEffect(() => {
    let cancelled = false;
    async function loadSessionData() {
      try {
        const token = await getToken({ skipCache: true });
        
        // Load element messages (conversation history)
        const msgsRes = await fetch(`/api/backend-api/session/${sessionId}/element-messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        // Load deep understanding entries
        const duRes = await fetch(`/api/backend-api/session/${sessionId}/deep-understanding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (!cancelled && msgsRes.ok) {
          const data = await msgsRes.json();
          // Flatten all messages from all prompt indices into single thread
          const allMsgs = [];
          Object.values(data.messages || {}).forEach(msgList => {
            msgList.forEach(msg => {
              allMsgs.push({
                role: msg.role,
                text: msg.message_text,
                element: msg.element_applied || "earth",
                createdAt: msg.created_at,
              });
            });
          });
          // Sort by created_at
          allMsgs.sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
          if (allMsgs.length > 0) {
            setMessages(allMsgs);
          }
        }
        
        if (!cancelled && duRes.ok) {
          const data = await duRes.json();
          // Load understanding document as single text
          if (data.understanding_document) {
            setDocumentText(data.understanding_document);
          }
        }
        
        if (!cancelled) {
          setDocumentLoading(false);
        }
      } catch (e) {
        console.error("Failed to load session data:", e);
        if (!cancelled) setDocumentLoading(false);
      }
    }
    loadSessionData();
    return () => { cancelled = true; };
  }, [sessionId, getToken]);

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  // Handle panel resize
  const handleMouseDown = (e) => {
    e.preventDefault();
    setIsResizing(true);
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!isResizing || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidth = ((e.clientX - containerRect.left) / containerRect.width) * 100;
      setLeftPanelWidth(Math.min(Math.max(newWidth, 25), 75));
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isResizing]);

  async function sendMessage(e) {
    e?.preventDefault();
    const text = inputText.trim();
    if (!text || isStreaming) return;
    
    // Add user message
    setMessages(prev => [...prev, { role: "user", text, element: null }]);
    setInputText("");
    setIsStreaming(true);
    setStreamingText("");
    
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch(`/api/backend-api/session/${sessionId}/chat`, {
        method: "POST",
        headers: { 
          "content-type": "application/json", 
          Authorization: `Bearer ${token}` 
        },
        body: JSON.stringify({ user_message: text }),
      });
      
      if (!res.ok) {
        throw new Error("Failed to send message");
      }
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let assistantText = "";
      let elementApplied = "earth";
      let insight = null;
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        for (const line of chunk.split("\n")) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          
          try {
            const parsed = JSON.parse(data);
            if (parsed.type === "chunk") {
              assistantText += parsed.content;
              setStreamingText(assistantText);
            } else if (parsed.type === "done") {
              elementApplied = parsed.element || "earth";
              insight = parsed.insight;
            }
          } catch {
            // Not JSON, might be raw text
          }
        }
      }
      
      // Add assistant message
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: assistantText, 
        element: elementApplied 
      }]);
      setStreamingText("");
      
      // Fetch updated document to trigger live animation
      try {
        const duRes = await fetch(`/api/backend-api/session/${sessionId}/deep-understanding`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (duRes.ok) {
          const data = await duRes.json();
          if (data.understanding_document) {
            setDocumentText(data.understanding_document);
          }
        }
      } catch (e) {
        console.error("Failed to refresh document:", e);
      }
      
    } catch (e) {
      console.error("Chat error:", e);
      setMessages(prev => [...prev, { 
        role: "assistant", 
        text: "Sorry, something went wrong. Please try again.", 
        element: "earth" 
      }]);
    } finally {
      setIsStreaming(false);
      inputRef.current?.focus();
    }
  }

  async function handleComplete() {
    setCompleteLoading(true);
    try {
      const token = await getToken({ skipCache: true });
      const res = await fetch("/api/backend-api/session/complete", {
        method: "POST",
        headers: { "content-type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ session_id: sessionId }),
      });
      if (!res.ok) throw new Error("Failed to complete session");
      const data = await res.json();
      setCompletionData(data);
    } catch (e) {
      console.error("Complete error:", e);
    } finally {
      setCompleteLoading(false);
    }
  }

  return (
    <div ref={containerRef} className="h-screen pt-20 bg-white flex flex-col lp:flex-row overflow-hidden max-w-[1536px] mx-auto">
      {/* Left Column: Deep Understanding Structure - stacks on mobile, side-by-side on desktop */}
      <div 
        className="flex flex-col border-b lp:border-b-0 border-mist max-h-[40vh] lp:max-h-none lp:flex-shrink-0"
        style={{ width: leftPanelWidth < 100 ? `${leftPanelWidth}%` : undefined }}
      >
        {/* Header */}
        <div className="flex-shrink-0 px-6 py-6 border-b border-mist bg-mist/50">
          <div>
            <h2 className="text-lg font-semibold text-black mb-2">Your Understanding</h2>
            <p className="text-sm text-smoke truncate">
              {problemDescription.length > 60 
                ? problemDescription.slice(0, 60) + "..." 
                : problemDescription}
            </p>
          </div>
        </div>
        
        {/* Document Content - Single unified document with live updates */}
        <div className="flex-1 overflow-y-auto px-6 py-4 bg-white">
          {documentLoading ? (
            <div className="space-y-3">
              <div className="h-4 bg-mist rounded animate-pulse w-3/4" />
              <div className="h-4 bg-mist rounded animate-pulse w-full" />
              <div className="h-4 bg-mist rounded animate-pulse w-5/6" />
              <div className="h-4 bg-mist rounded animate-pulse w-2/3" />
            </div>
          ) : (
            <div className="border-l-3 border-change/30 pl-4">
              <LiveDocument text={documentText} />
            </div>
          )}
        </div>
        
        {/* Complete Session - Bottom of left panel */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-mist bg-white">
          <Button
            className="bg-transparent border border-smoke text-smoke hover:bg-mist hover:text-black w-full"
            radius="none"
            isLoading={completeLoading}
            onPress={handleComplete}
          >
            Complete Session
          </Button>
        </div>
      </div>

      {/* Resizable Handle */}
      <div 
        className="hidden lp:flex resize-handle"
        onMouseDown={handleMouseDown}
      />
      
      {/* Right Column: Chat */}
      <div 
        className="flex flex-col bg-mist/30 flex-1"
        style={{ width: `${100 - leftPanelWidth}%` }}
      >
        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
          {messages.map((msg, i) => (
            <div 
              key={i} 
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div 
                className={`max-w-[85%] px-4 py-3 rounded-lg ${
                  msg.role === "user" 
                    ? "bg-black text-white" 
                    : "bg-white border border-mist text-ash shadow-sm border-l-2 border-l-change"
                }`}
              >
                {msg.role === "assistant" && msg.element && (
                  <div className="flex items-start gap-2 mb-1">
                    <span className="text-base grayscale opacity-60">
                      {ELEMENT_EMOJIS[msg.element] || "🪨"}
                    </span>
                  </div>
                )}
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.text}</p>
              </div>
            </div>
          ))}
          
          {/* Streaming message */}
          {isStreaming && streamingText && (
            <div className="flex justify-start">
              <div className="max-w-[85%] px-4 py-3 rounded-lg bg-white border border-mist text-ash shadow-sm border-l-2 border-l-change">
                <div className="flex items-start gap-2 mb-1">
                  <span className="text-base grayscale opacity-60">🪨</span>
                </div>
                <p className="text-sm leading-relaxed whitespace-pre-wrap">
                  {streamingText}
                  <span className="inline-block w-2 h-4 bg-smoke ml-1 animate-pulse" />
                </p>
              </div>
            </div>
          )}
          
          {/* Typing indicator */}
          {isStreaming && !streamingText && (
            <div className="flex justify-start">
              <div className="px-4 py-3 rounded-lg bg-white border border-mist shadow-sm border-l-2 border-l-change">
                <div className="flex gap-1">
                  <span className="w-2 h-2 bg-smoke rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                  <span className="w-2 h-2 bg-smoke rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                  <span className="w-2 h-2 bg-smoke rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>
        
        {/* Input */}
        <div className="flex-shrink-0 px-6 py-4 border-t border-mist bg-white">
          <form onSubmit={sendMessage} className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Share your thoughts..."
              className="flex-1 px-4 py-3 bg-white border border-mist text-black placeholder:text-smoke rounded focus:border-smoke outline-none transition-colors"
              disabled={isStreaming}
            />
            <Button
              type="submit"
              className="bg-primary text-white font-medium px-6 hover:bg-primary/90"
              radius="none"
              isDisabled={!inputText.trim() || isStreaming}
            >
              Send
            </Button>
          </form>
        </div>
      </div>
      
      {/* Completion Modal */}
      {completionData && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-6">
          <div className="bg-white border border-mist rounded-lg max-w-lg w-full p-8 shadow-xl">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-display text-black mb-2">Session Complete</h2>
              {completionData.thinker_description && (
                <p className="text-smoke italic">"{completionData.thinker_description}"</p>
              )}
            </div>
            
            {completionData.analysis && (
              <div className="space-y-4 mb-6">
                {completionData.analysis.key_insight && (
                  <div>
                    <div className="text-xs font-medium text-smoke uppercase tracking-wider mb-1">Key Insight</div>
                    <p className="text-sm text-ash">{completionData.analysis.key_insight}</p>
                  </div>
                )}
              </div>
            )}
            
            <Button
              className="bg-black text-white font-medium w-full hover:bg-ash"
              radius="none"
              onPress={onComplete}
            >
              Back to Workspace
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function WorkspacePage() {
  const { isLoaded, isSignedIn, getToken } = useAuth();

  const [phase, setPhase] = useState("loading");
  const [sessionData, setSessionData] = useState(null);

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) { setPhase("setup"); return; }

    let cancelled = false;

    async function loadActiveSession() {
      try {
        const token = await getToken({ skipCache: true });
        const res = await fetch("/api/backend-api/user/sessions", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok || cancelled) throw new Error();
        const data = await res.json();
        const active = (data.sessions || []).find((s) => s.status === "in_progress");

        if (active && !cancelled) {
          setSessionData({
            problemDescription: active.problem_description || "",
            sessionId: active.id,
            firstMessage: null, // Will load from element_messages
          });
          setPhase("working");
        } else if (!cancelled) {
          setPhase("setup");
        }
      } catch {
        if (!cancelled) setPhase("setup");
      }
    }

    loadActiveSession();
    return () => { cancelled = true; };
  }, [isLoaded, isSignedIn, getToken]);

  if (!isLoaded || phase === "loading") {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center">
        <div className="text-center">
          <Spinner size="lg" color="black" />
          <p className="text-smoke mt-4">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isSignedIn) {
    return (
      <div className="min-h-screen bg-white flex items-center justify-center px-6">
        <div className="max-w-sm w-full text-center border border-mist rounded-lg p-8 bg-white shadow-lg">
          <h2 className="text-2xl font-display text-black mb-2">Sign in required</h2>
          <p className="text-smoke text-sm mb-6">Sign in to access the workspace.</p>
          <Link href="/login">
            <Button className="bg-black text-white w-full hover:bg-ash" radius="none">Sign In</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (phase === "working" && sessionData) {
    return (
      <WorkingPhase
        {...sessionData}
        onComplete={() => {
          setSessionData(null);
          setPhase("setup");
        }}
      />
    );
  }

  return (
    <SetupPhase
      onStart={(data) => {
        setSessionData(data);
        setPhase("working");
      }}
    />
  );
}
