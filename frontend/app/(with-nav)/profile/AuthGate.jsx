"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AuthGate({ children }) {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/login");
  }, [isLoaded, isSignedIn, router]);

  // Show skeleton loading while auth is loading - matches profile page skeleton
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-white pt-24">
        <div className="lp:w-[50vw] px-6 lp:pl-[max(24px,calc((100vw-1536px)/2+24px))] py-8 relative z-10">
          <div className="max-w-md">
            <div className="h-12 w-48 bg-mist rounded animate-pulse mb-2" />
            <div className="h-5 w-32 bg-mist rounded animate-pulse mb-6" />
            <div className="flex items-center gap-6 mb-8 py-4 border-y border-mist">
              <div className="h-8 w-12 bg-mist rounded animate-pulse" />
              <div className="w-px h-8 bg-mist" />
              <div className="h-8 w-16 bg-mist rounded animate-pulse" />
              <div className="w-px h-8 bg-mist" />
              <div className="h-8 w-8 bg-mist rounded animate-pulse" />
            </div>
          </div>
        </div>
        <div className="hidden lp:block fixed right-0 top-0 w-[60vw] h-screen">
          <div className="w-full h-full bg-gradient-to-br from-change/5 via-change/10 to-change/15" />
          <div className="absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-white to-transparent" />
          <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white to-transparent" />
        </div>
      </div>
    );
  }

  if (!isSignedIn) return null;
  return children;
}


