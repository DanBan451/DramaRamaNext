"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth } from "@clerk/nextjs";
import Footer from "@/components/Footer";

export default function SessionsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filter, setFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const sessionsPerPage = 15;

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchSessions();
    }
  }, [isLoaded, isSignedIn]);

  async function fetchSessions() {
    try {
      setLoading(true);
      const token = await getToken();
      
      if (!token) {
        setError("Unable to authenticate");
        return;
      }

      const API_URL = "/api/backend-api";

      const response = await fetch(`${API_URL}/user/sessions?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.ok) {
        const data = await response.json();
        setSessions(data.sessions || []);
        setError(null);
      } else {
        setError("Failed to load sessions");
      }
    } catch (err) {
      console.error("Error fetching sessions:", err);
      setError("Unable to load sessions. Make sure the backend is running.");
    } finally {
      setLoading(false);
    }
  }

  const filteredSessions = sessions.filter(session => {
    if (filter === "all") return true;
    return session.status === filter;
  });

  // Pagination
  const totalPages = Math.ceil(filteredSessions.length / sessionsPerPage);
  const startIndex = (currentPage - 1) * sessionsPerPage;
  const endIndex = startIndex + sessionsPerPage;
  const paginatedSessions = filteredSessions.slice(startIndex, endIndex);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filter]);

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
      <div className="max-w-[1200px] mx-auto px-6 lp:px-20">
        {/* Header */}
        <div className="flex flex-col tb:flex-row tb:items-center tb:justify-between gap-6 mb-12">
          <div>
            <h1 className="font-display text-4xl lp:text-5xl text-black mb-2">
              Your Sessions
            </h1>
            <p className="text-smoke">
              {loading ? "Loading..." : `${sessions.length} total sessions`}
            </p>
          </div>
          <Button
            as={Link}
            href="/dashboard"
            className="bg-mist text-black hover:bg-smoke hover:text-white transition-colors"
            radius="none"
          >
            ← Back to Dashboard
          </Button>
        </div>

        {/* Filter Tabs */}
        <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
          {[
            { id: "all", label: "All" },
            { id: "completed", label: "Completed" },
            { id: "in_progress", label: "In Progress" },
            { id: "abandoned", label: "Abandoned" },
          ].map((tab) => (
              <button
              key={tab.id}
              onClick={() => setFilter(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
                filter === tab.id
                  ? "bg-black text-white"
                  : "bg-mist text-smoke hover:bg-smoke hover:text-white"
                }`}
              >
              {tab.label}
              </button>
            ))}
          </div>

        {/* Sessions List */}
        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin text-4xl mb-4">🔄</div>
            <p className="text-smoke">Loading sessions...</p>
          </div>
        ) : error ? (
          <div className="text-center py-16 bg-fire/5 rounded-xl border border-fire/20">
            <div className="text-4xl mb-4">⚠️</div>
            <p className="text-fire font-medium mb-2">Error Loading Sessions</p>
            <p className="text-smoke text-sm">{error}</p>
            <Button
              onClick={fetchSessions}
              className="mt-4 bg-black text-white"
              radius="none"
            >
              Retry
            </Button>
        </div>
        ) : filteredSessions.length > 0 ? (
          <>
        <div className="space-y-4 mb-8">
          {paginatedSessions.map((session) => (
            <Link
              key={session.id}
              href={`/sessions/${session.id}`}
                className="block bg-white border border-mist rounded-xl p-6 hover:shadow-lg hover:border-smoke transition-all"
            >
                <div className="flex items-start gap-4">
                  {/* Status Icon */}
                  <div className={`w-12 h-12 rounded-lg flex items-center justify-center text-2xl ${
                    session.status === "completed" ? "bg-earth/10" :
                    session.status === "in_progress" ? "bg-air/10" :
                    "bg-smoke/10"
                  }`}>
                    {session.status === "completed" ? "✅" :
                     session.status === "in_progress" ? "🔄" : "⏸️"}
                </div>

                  {/* Session Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                    <h3 className="font-display text-xl text-black">
                        {session.algorithm_title}
                    </h3>
                      <span className={`text-xs px-3 py-1 rounded-full font-medium ${
                        session.status === "completed" ? "bg-earth/10 text-earth" :
                        session.status === "in_progress" ? "bg-air/10 text-air" :
                        "bg-smoke/10 text-smoke"
                      }`}>
                        {session.status.replace("_", " ")}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-4 text-sm text-smoke mb-3">
                      <span>
                        {new Date(session.started_at).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </span>
                      {session.algorithm_url && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px]">
                            {new URL(session.algorithm_url).hostname}
                          </span>
                        </>
                    )}
                  </div>

                    {/* Progress */}
                    <div className="flex items-center gap-4">
                      <div className="flex-1 max-w-[300px]">
                  <div className="progress-bar h-2">
                    <div
                            className="progress-bar-fill bg-change"
                            style={{ width: `${(session.prompts_completed / 12) * 100}%` }}
                    />
                  </div>
                </div>
                      <span className="text-sm font-mono text-smoke">
                        {session.prompts_completed}/12
                      </span>
                  </div>
                </div>

                  {/* Joules */}
                  <div className="text-right">
                  <div className="text-2xl font-bold text-change">
                      +{session.prompts_completed * 10}
                  </div>
                  <div className="text-sm text-smoke">joules</div>
                </div>
              </div>
            </Link>
          ))}
        </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-center gap-2">
                <Button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  isDisabled={currentPage === 1}
                  className="bg-mist text-black hover:bg-smoke hover:text-white disabled:opacity-50"
                  radius="none"
                >
                  ← Previous
                </Button>
                
                <div className="flex items-center gap-2">
                  {[...Array(totalPages)].map((_, index) => {
                    const page = index + 1;
                    // Show first page, last page, current page, and pages around current
                    if (
                      page === 1 ||
                      page === totalPages ||
                      (page >= currentPage - 1 && page <= currentPage + 1)
                    ) {
                      return (
                        <button
                          key={page}
                          onClick={() => setCurrentPage(page)}
                          className={`w-10 h-10 rounded-lg font-medium transition-all ${
                            currentPage === page
                              ? "bg-black text-white"
                              : "bg-mist text-smoke hover:bg-smoke hover:text-white"
                          }`}
                        >
                          {page}
                        </button>
                      );
                    } else if (
                      page === currentPage - 2 ||
                      page === currentPage + 2
                    ) {
                      return <span key={page} className="text-smoke">...</span>;
                    }
                    return null;
                  })}
                </div>

                <Button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  isDisabled={currentPage === totalPages}
                  className="bg-mist text-black hover:bg-smoke hover:text-white disabled:opacity-50"
                  radius="none"
                >
                  Next →
                </Button>
              </div>
            )}
          </>
        ) : (
          <div className="text-center py-16 bg-mist/30 rounded-xl">
            <div className="text-4xl mb-4">🧩</div>
            <h3 className="font-display text-xl text-black mb-2">
              No {filter === "all" ? "" : filter.replace("_", " ")} sessions
            </h3>
            <p className="text-smoke mb-6">
              {filter === "all" 
                ? "Start your first session on LeetCode!"
                : `You don't have any ${filter.replace("_", " ")} sessions.`}
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
      </div>
      
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}
