"use client";

import React, { useEffect, useState } from "react";
import { SignedIn, SignedOut, useAuth, SignInButton } from "@clerk/nextjs";
import { Button } from "@nextui-org/button";
import Footer from "@/components/Footer";

const EXTENSION_TOKEN_TEMPLATE =
  process.env.NEXT_PUBLIC_CLERK_EXTENSION_JWT_TEMPLATE || "dramarama-extension";

export default function ConnectExtensionPage() {
  const { getToken } = useAuth();
  const [token, setToken] = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | ready | error

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setStatus("loading");
        let t = "";
        try {
          t = (await getToken({ template: EXTENSION_TOKEN_TEMPLATE, skipCache: true })) || "";
        } catch {
          t = "";
        }
        if (!t) {
          t = (await getToken({ skipCache: true })) || "";
        }
        if (!mounted) return;
        setToken(t || "");
        setStatus(t ? "ready" : "error");
      } catch {
        if (!mounted) return;
        setStatus("error");
      }
    }
    run();
    return () => {
      mounted = false;
    };
  }, [getToken]);

  async function copyToken() {
    if (!token) return;
    await navigator.clipboard.writeText(token);
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <div className="flex-1 pt-28 pb-16">
      <div className="max-w-[900px] mx-auto px-6 lp:px-20">
        <h1 className="font-display text-4xl lp:text-5xl text-black mb-3">
          Connect Chrome Extension
        </h1>
        <p className="text-smoke mb-8">
          This page generates a JWT for local development so the extension can call your backend. If you configure a Clerk JWT
          template, it can be long-lived and won’t expire mid-session.
        </p>

        <SignedOut>
          <div className="border border-mist rounded-xl p-6 bg-mist/20">
            <p className="text-black mb-4">Please sign in first.</p>
            <SignInButton mode="modal">
              <Button className="bg-black text-white" radius="none">
                Sign In
              </Button>
            </SignInButton>
          </div>
        </SignedOut>

        <SignedIn>
          <div className="border border-mist rounded-xl p-6">
            <div className="flex flex-col tb:flex-row tb:items-center tb:justify-between gap-3 mb-4">
              <div>
                <div className="text-sm font-mono text-smoke uppercase tracking-wider">
                  Step 1
                </div>
                <div className="text-black font-medium">Copy your token</div>
              </div>
              <Button
                onClick={copyToken}
                className="bg-black text-white"
                radius="none"
                isDisabled={!token}
              >
                Copy Token
              </Button>
            </div>

            <textarea
              className="w-full h-40 font-mono text-xs border border-mist rounded-lg p-3"
              value={
                status === "loading"
                  ? "Generating token…"
                  : token || "No token available. Try refreshing the page."
              }
              readOnly
            />

            <div className="mt-6 border-t border-mist pt-6">
              <div className="text-sm font-mono text-smoke uppercase tracking-wider mb-2">
                Step 2
              </div>
              <p className="text-smoke mb-3">
                Open the DramaRama extension popup → <b>“I’m already logged in”</b> → paste the token → <b>Connect</b>.
              </p>
              <div className="text-xs text-smoke">
                Tip: If it expires, just refresh this page and copy a new one.
              </div>
            </div>
          </div>
        </SignedIn>
      </div>
      </div>
      
      <div className="mt-16">
        <Footer />
      </div>
    </div>
  );
}


