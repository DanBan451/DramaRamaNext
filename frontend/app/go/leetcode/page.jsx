"use client";

import { SignedIn, SignedOut, SignInButton, useAuth } from "@clerk/nextjs";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@nextui-org/button";
import Footer from "@/components/Footer";

// Assumption: this JWT template exists in Clerk and is configured correctly.
const EXTENSION_TOKEN_TEMPLATE = "dramarama-extension";

function withDramaRamaTokenFragment(urlString, token) {
  const url = new URL(urlString);
  // Put token in the fragment so it is NOT sent to LeetCode servers (only readable by the extension).
  const fragment = new URLSearchParams(url.hash.replace(/^#/, ""));
  fragment.set("dramarama_token", token);
  // Also attach HQ origin so the extension can auto-configure where to call API/auth endpoints.
  // This avoids hardcoding localhost in the extension and avoids requiring end-user configuration.
  try {
    fragment.set("dramarama_hq", window.location.origin);
  } catch {
    // ignore
  }
  url.hash = fragment.toString();
  return url.toString();
}

export default function GoLeetCodePage() {
  const params = useSearchParams();
  const { getToken, isLoaded } = useAuth();
  const [err, setErr] = useState("");

  const target = useMemo(() => {
    // Default: LeetCode homepage
    return params.get("url") || "https://leetcode.com/";
  }, [params]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!isLoaded) return;
      try {
        // Assumption: template token minting always works (no fallback to default session JWT).
        const token = await getToken({ template: EXTENSION_TOKEN_TEMPLATE, skipCache: true });
        if (cancelled) return;
        if (!token) {
          setErr("Could not get an auth token. Please sign in again.");
          return;
        }
        const out = withDramaRamaTokenFragment(target, token);
        // Navigate in the same tab (user said they go to LeetCode through our site).
        window.location.assign(out);
      } catch (e) {
        if (cancelled) return;
        setErr("Failed to generate token for extension handoff.");
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [getToken, isLoaded, target]);

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 flex items-center justify-center px-6">
      <div className="max-w-md w-full border border-mist rounded-xl p-6 text-center">
        <SignedIn>
          <div className="text-3xl mb-3">🎭</div>
          <div className="font-display text-2xl text-black mb-2">Sending you to LeetCode…</div>
          <div className="text-smoke text-sm">
            We’re attaching your auth token for the DramaRama extension (stored locally in the extension).
          </div>
          {err ? <div className="text-fire text-sm mt-4">{err}</div> : null}
        </SignedIn>

        <SignedOut>
          <div className="text-3xl mb-3">🔒</div>
          <div className="font-display text-2xl text-black mb-2">Sign in required</div>
          <div className="text-smoke text-sm mb-4">
            Please sign in first so we can authenticate the extension automatically.
          </div>
          <SignInButton mode="modal">
            <Button className="bg-black text-white" radius="none">
              Sign In
            </Button>
          </SignInButton>
        </SignedOut>
      </div>
      </div>
      
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}


