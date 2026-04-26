"use client";

// Dev shortcut: resolves to the first puzzle of the user's most recent
// ready course and redirects. Returns the user to /courses if they have
// no generated puzzles yet.

import { useEffect, useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { getDevRedirectTarget } from "@/lib/canvas-api";

export default function CanvasTestRedirect() {
  const { isLoaded, isSignedIn, getToken } = useAuth();
  const router = useRouter();
  const [message, setMessage] = useState("Resolving your latest puzzle…");

  useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/login?redirect=/canvas-test");
      return;
    }
    let cancelled = false;
    (async () => {
      try {
        const target = await getDevRedirectTarget(getToken);
        if (cancelled) return;
        if (target?.course_puzzle_id) {
          router.replace(`/canvas/${target.course_puzzle_id}`);
        } else {
          setMessage("No ready courses — sending you to /courses…");
          router.replace("/courses");
        }
      } catch (e) {
        if (!cancelled) {
          setMessage(`Couldn't resolve canvas: ${e?.message || "unknown error"}`);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, isSignedIn, getToken, router]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-white">
      <p className="text-sm text-gray-500">{message}</p>
    </div>
  );
}
