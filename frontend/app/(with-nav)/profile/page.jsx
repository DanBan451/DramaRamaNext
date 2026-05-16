"use client";

import React from "react";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { useAuth, useUser } from "@clerk/nextjs";
import useSWR, { mutate } from "swr";
import Footer from "@/components/Footer";
import { readBackendErrorMessage } from "@/lib/read-backend-error";

// Element metadata - simplified for profile display
const ELEMENTS = [
  { id: "earth", name: "Earth", emoji: "🌳" },
  { id: "fire", name: "Fire", emoji: "🔥" },
  { id: "air", name: "Air", emoji: "💨" },
  { id: "water", name: "Water", emoji: "🌊" },
];

// SWR fetcher that uses Clerk token
const createFetcher = (getToken) => async (url) => {
  const token = await getToken();
  if (!token) throw new Error("Unable to authenticate");
  const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    const msg = await readBackendErrorMessage(res, "Failed to fetch");
    throw new Error(msg);
  }
  return res.json();
};

export default function ProfilePage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const { user } = useUser();

  const fetcher = createFetcher(getToken);

  // SWR with caching
  const { data: stats, error: statsError, isLoading: statsLoading } = useSWR(
    isLoaded && isSignedIn ? "/api/backend-api/user/stats" : null,
    fetcher,
    { revalidateOnFocus: false, dedupingInterval: 300000 }
  );

  // Phase 4b removed legacy /user/sessions; user-facing work history will
  // come back as a courses-based recent-activity feed in a later phase.
  const loading = statsLoading;
  const error = statsError?.message;

  const [avatarLoading, setAvatarLoading] = React.useState(false);

  async function regenerateAvatar() {
    setAvatarLoading(true);
    try {
      const token = await getToken();
      const res = await fetch("/api/backend-api/user/regenerate-avatar", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.success) {
        // Refresh stats to get new avatar
        await mutate("/api/backend-api/user/stats");
        // Reload page to show new image (avoids cache issues)
        window.location.reload();
      } else {
        const errorMsg = typeof data.error === 'string' 
          ? data.error 
          : (data.detail || "Unknown error");
        alert("Failed to generate avatar: " + errorMsg);
      }
    } catch (e) {
      alert("Error: " + (e?.message || String(e)));
    } finally {
      setAvatarLoading(false);
    }
  }

  // Compute element strengths from breakdown
  const elementStrengths = stats?.element_breakdown
    ? ELEMENTS.map((el) => ({
        ...el,
        words: stats.element_breakdown[el.id] || 0,
      })).sort((a, b) => b.words - a.words)
    : [];

  const totalWords = elementStrengths.reduce((s, e) => s + e.words, 0) || 1;

  // Show loading skeleton while auth or data is loading
  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-white pt-24">
        {/* Left panel skeleton - aligned with navbar, 50% width */}
        <div className="lp:w-[50vw] px-6 lp:pl-[max(24px,calc((100vw-1536px)/2+24px))] py-8 relative z-10">
          <div className="max-w-md">
            {/* Name skeleton */}
            <div className="h-12 w-48 bg-mist rounded animate-pulse mb-2" />
            {/* Subtitle skeleton */}
            <div className="h-5 w-32 bg-mist rounded animate-pulse mb-6" />
            
            {/* Stats row skeleton */}
            <div className="flex items-center gap-6 mb-8 py-4 border-y border-mist">
              <div>
                <div className="h-8 w-12 bg-mist rounded animate-pulse mb-1" />
                <div className="h-3 w-16 bg-mist rounded animate-pulse" />
              </div>
              <div className="w-px h-8 bg-mist" />
              <div>
                <div className="h-8 w-16 bg-mist rounded animate-pulse mb-1" />
                <div className="h-3 w-12 bg-mist rounded animate-pulse" />
              </div>
              <div className="w-px h-8 bg-mist" />
              <div>
                <div className="h-8 w-8 bg-mist rounded animate-pulse mb-1" />
                <div className="h-3 w-20 bg-mist rounded animate-pulse" />
              </div>
            </div>

            {/* Elements skeleton */}
            <div className="mb-8">
              <div className="h-3 w-32 bg-mist rounded animate-pulse mb-4" />
              <div className="space-y-3">
                {[1,2,3,4].map(i => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-mist rounded animate-pulse" />
                    <div className="flex-1">
                      <div className="h-3 w-full bg-mist rounded animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Buttons skeleton */}
            <div className="flex gap-3">
              <div className="h-10 w-28 bg-mist rounded animate-pulse" />
              <div className="h-10 w-28 bg-mist rounded animate-pulse" />
            </div>
          </div>
        </div>
        
        {/* Right panel skeleton - 60% from right edge, full height with fades */}
        <div className="hidden lp:block fixed right-0 top-0 w-[60vw] h-screen">
          <div className="w-full h-full bg-gradient-to-br from-change/5 via-change/10 to-change/15" />
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white pt-24">
      {/* Left Panel - User Content, aligned with navbar, 50% width, overlaps image */}
      <div className="lp:w-[50vw] px-6 lp:pl-[max(24px,calc((100vw-1536px)/2+24px))] py-8 relative z-10">
        <div className="max-w-md">
          {/* User Name & Title */}
          <h1 className="font-display text-4xl lp:text-5xl text-black mb-2">
            {user?.firstName || "Thinker"}
          </h1>
          
          {/* Professional title based on thinking style */}
          {stats?.archetype_name ? (
            <p className="text-lg text-change font-medium mb-4">
              {stats.archetype_name}
            </p>
          ) : (
            <p className="text-smoke mb-4">
              Building your thinking profile...
            </p>
          )}

          {/* Stats Row - Clean, no colored numbers */}
          <div className="flex items-center gap-6 mb-8 py-4 border-y border-mist">
            <div>
              <div className="text-2xl font-semibold text-black">{stats?.total_sessions || 0}</div>
              <div className="text-xs text-smoke uppercase tracking-wider">Sessions</div>
            </div>
            <div className="w-px h-8 bg-mist" />
            <div>
              <div className="text-2xl font-semibold text-black">
                {(stats?.total_joules || 0).toLocaleString()}
              </div>
              <div className="text-xs text-smoke uppercase tracking-wider">Joules</div>
            </div>
            <div className="w-px h-8 bg-mist" />
            <div>
              <div className="text-2xl font-semibold text-black">{stats?.current_streak || 0}</div>
              <div className="text-xs text-smoke uppercase tracking-wider">Day Streak</div>
            </div>
          </div>

          {/* Element Distribution - Using grayscale emojis */}
          <div className="mb-8">
            <h3 className="text-xs uppercase tracking-widest text-smoke mb-4">The Elements You&apos;re Building</h3>
            <div className="space-y-3">
              {elementStrengths.map((el) => {
                const pct = totalWords > 1 ? Math.round((el.words / totalWords) * 100) : 0;
                return (
                  <div key={el.id} className="flex items-center gap-3">
                    <span className="text-xl grayscale opacity-60 w-8">{el.emoji}</span>
                    <div className="flex-1">
                      <div className="flex justify-between text-xs mb-1">
                        <span className="text-ash">{el.name}</span>
                        <span className="text-smoke">{pct}%</span>
                      </div>
                      <div className="h-1.5 bg-mist rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-change/40 rounded-full transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3">
            <Button
              as={Link}
              href="/course/new"
              className="bg-primary text-white font-medium px-6 hover:bg-primary/90"
              radius="none"
            >
              Start Your Course
            </Button>
            <Button
              as={Link}
              href="/goals"
              className="bg-transparent border border-mist text-black px-6 hover:bg-mist"
              radius="none"
            >
              My Courses
            </Button>
          </div>
        </div>
      </div>

      {/* Right Panel - 60% width from right edge, full viewport height with gradient fades */}
      <div className="hidden lp:block fixed right-0 top-0 w-[60vw] h-screen">
        {/* Background image or placeholder */}
        <div className="w-full h-full flex items-center justify-center">
          {stats?.avatar_image_url ? (
            <img 
              src={stats.avatar_image_url} 
              alt="Your thinking profile"
              className="w-full h-full object-cover"
              onError={(e) => {
                e.target.style.display = 'none';
                const parent = e.target.parentElement;
                parent.innerHTML = `
                  <div class="w-full h-full bg-gradient-to-br from-change/5 via-change/10 to-change/15 flex items-center justify-center">
                    <div class="text-center p-8">
                      <p class="text-smoke text-sm mb-6">Image expired. Click regenerate to create a new one.</p>
                      <button id="regenerate-btn" class="bg-change text-white text-sm px-4 py-2 rounded hover:bg-change/90">
                        Regenerate
                      </button>
                    </div>
                  </div>
                `;
                setTimeout(() => {
                  const btn = document.getElementById('regenerate-btn');
                  if (btn) btn.onclick = () => regenerateAvatar();
                }, 0);
              }}
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-change/5 via-change/10 to-change/15 flex items-center justify-center">
              {/* Minimal placeholder - white and purple only */}
              <div className="text-center p-8">
                <div className="relative w-80 h-80 mx-auto mb-8">
                  <svg viewBox="0 0 200 200" className="w-full h-full">
                    <circle cx="100" cy="100" r="90" fill="white" stroke="#9B5DE5" strokeWidth="0.5" />
                    <circle cx="100" cy="100" r="70" fill="none" stroke="#9B5DE5" strokeWidth="0.3" opacity="0.5" />
                    <circle cx="100" cy="100" r="50" fill="none" stroke="#9B5DE5" strokeWidth="0.3" opacity="0.4" />
                    <circle cx="100" cy="100" r="30" fill="#9B5DE5" opacity="0.1" />
                    {elementStrengths.map((el, i) => {
                      const angle = (i / 4) * Math.PI * 2 - Math.PI / 2;
                      const pct = totalWords > 1 ? (el.words / totalWords) : 0.25;
                      const x = 100 + Math.cos(angle) * 60;
                      const y = 100 + Math.sin(angle) * 60;
                      return (
                        <circle 
                          key={el.id} 
                          cx={x} 
                          cy={y} 
                          r={6 + pct * 12} 
                          fill="#9B5DE5" 
                          opacity={0.15 + pct * 0.35} 
                        />
                      );
                    })}
                  </svg>
                </div>
                <p className="text-smoke text-sm mb-6">Your thinking profile visualization</p>
                <Button
                  className="bg-change text-white text-sm hover:bg-change/90"
                  radius="none"
                  size="sm"
                  isLoading={avatarLoading}
                  onPress={regenerateAvatar}
                >
                  Generate Profile Image
                </Button>
              </div>
            </div>
          )}
        </div>
        
        {/* Gradient fades - always on top */}
        <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent pointer-events-none" />
        <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent pointer-events-none" />
        
        {/* Regenerate button */}
        {stats?.avatar_image_url && (
          <Button
            className="absolute bottom-8 right-8 bg-white/90 backdrop-blur text-black text-xs hover:bg-white z-10"
            radius="none"
            size="sm"
            isLoading={avatarLoading}
            onPress={regenerateAvatar}
          >
            Regenerate
          </Button>
        )}
      </div>
      <Footer />
    </div>
  );
}
