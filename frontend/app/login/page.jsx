"use client";

import React from "react";
import Link from "next/link";
import Image from "next/image";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useState, useMemo } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get redirect URL from query params (for extension flow)
  const redirectUrl = useMemo(() => {
    const redirect = searchParams.get("redirect");
    console.log("🔍 Login page - raw redirect param:", redirect);
    
    // Allow internal redirects for security
    if (redirect) {
      try {
        // Try to decode (in case it's double-encoded)
        const decoded = decodeURIComponent(redirect);
        console.log("🔍 Login page - decoded redirect:", decoded);
        if (decoded.startsWith("/")) {
          console.log("✅ Login page - using decoded redirect:", decoded);
          // Store in localStorage as backup (survives OAuth redirects)
          localStorage.setItem('clerk_redirect_url', decoded);
          return decoded;
        }
      } catch (e) {
        console.log("⚠️ Login page - decode error, trying raw:", e);
        // If decoding fails, check raw value
        if (redirect.startsWith("/")) {
          console.log("✅ Login page - using raw redirect:", redirect);
          localStorage.setItem('clerk_redirect_url', redirect);
          return redirect;
        }
      }
    }
    
    // Try to get from localStorage (in case we came back from OAuth)
    const stored = localStorage.getItem('clerk_redirect_url');
    if (stored && stored.startsWith("/")) {
      console.log("📦 Login page - found stored redirect:", stored);
      return stored;
    }
    
    console.log("📌 Login page - falling back to /");
    return "/";
  }, [searchParams]);

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      console.log("🚀 Redirecting signed-in user to:", redirectUrl);
      // Clear the stored redirect after using it
      localStorage.removeItem('clerk_redirect_url');
      router.push(redirectUrl);
    }
  }, [isLoaded, isSignedIn, router, redirectUrl]);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Subtle grayish-purple palette */}
      <div className="hidden lp:flex w-1/2 bg-gradient-to-br from-ash via-void to-ash relative overflow-hidden">
        {/* Subtle purple glow */}
        <div className="absolute top-1/4 right-0 w-96 h-96 bg-change/10 rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-1/4 w-64 h-64 bg-change/5 rounded-full blur-2xl" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-12 lp:px-16 py-16 w-full">
          <div className="mb-auto">
            <Link href="/" className="flex items-center gap-3 hover:opacity-80 transition-opacity">
              <Image
                src="/images/icons8-drama-96.png"
                width={32}
                height={32}
                alt="DramaRama"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="font-mono text-xs text-white/80 tracking-[0.3em] uppercase">DramaRama</span>
            </Link>
          </div>

          <div className="my-auto">
            <h1 className="font-display text-4xl lp:text-5xl text-white mb-6 leading-tight">
              Think through it.
            </h1>
            <p className="text-white/60 text-lg max-w-md leading-relaxed">
              Pick a puzzle. See where your thinking takes you.
            </p>
          </div>

          <div className="mt-auto" />
        </div>
      </div>

      {/* Right Panel - Clerk Auth */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 tb:px-8 py-16 bg-white">
        <div className="w-full max-w-[640px]">
          {/* Mobile logo */}
          <div className="lp:hidden mb-12">
            <Link href="/" className="flex items-center gap-2">
              <Image
                src="/images/icons8-drama-96.png"
                width={28}
                height={28}
                alt="DramaRama"
              />
              <span className="font-mono text-xs text-black tracking-[0.3em] uppercase">DramaRama</span>
            </Link>
          </div>

          {/* Toggle - same width as Clerk card */}
          <div className="flex bg-mist/50 rounded-lg p-1 mb-8 w-full">
            <button
              onClick={() => setIsLogin(true)}
              className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all ${
                isLogin
                  ? "bg-white text-black shadow-sm"
                  : "text-smoke hover:text-black"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setIsLogin(false)}
              className={`flex-1 py-3 rounded-md text-sm font-semibold transition-all ${
                !isLogin
                  ? "bg-white text-black shadow-sm"
                  : "text-smoke hover:text-black"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* Clerk Components - properly aligned */}
          <div className="clerk-container w-full">
            {isLogin ? (
              <SignIn 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none p-0 bg-transparent w-full max-w-[600px] overflow-visible mx-auto",
                    cardBox: "w-full max-w-[600px] shadow-none px-0 overflow-visible mx-auto",
                    headerTitle: "font-display text-2xl text-black",
                    headerSubtitle: "text-smoke",
                    formButtonPrimary: "bg-black hover:bg-ash text-white min-h-[48px] w-full",
                    formFieldInput: "border-mist focus:border-black rounded-md bg-white text-black min-h-[48px] w-full",
                    footerActionLink: "text-black hover:text-ash",
                    dividerLine: "bg-mist",
                    dividerText: "text-smoke",
                    socialButtonsBlockButton: "border-mist hover:bg-mist/50 rounded-md min-h-[48px] w-full pr-6 overflow-visible",
                    identityPreview: "bg-mist/50",
                    formFieldLabel: "text-ash",
                    main: "w-full",
                    form: "w-full",
                    formButtons: "w-full",
                    formField: "w-full",
                    footer: "w-full",
                  },
                }}
                routing="hash"
                signInUrl="/login"
                signUpUrl="/login"
                fallbackRedirectUrl={redirectUrl}
                forceRedirectUrl={redirectUrl}
              />
            ) : (
              <SignUp 
                appearance={{
                  elements: {
                    rootBox: "w-full",
                    card: "shadow-none p-0 bg-transparent w-full max-w-[600px] overflow-visible mx-auto",
                    cardBox: "w-full max-w-[600px] shadow-none px-0 overflow-visible mx-auto",
                    headerTitle: "font-display text-2xl text-black",
                    headerSubtitle: "text-smoke",
                    formButtonPrimary: "bg-black hover:bg-ash text-white min-h-[48px] w-full",
                    formFieldInput: "border-mist focus:border-black rounded-md bg-white text-black min-h-[48px] w-full",
                    footerActionLink: "text-black hover:text-ash",
                    dividerLine: "bg-mist",
                    dividerText: "text-smoke",
                    socialButtonsBlockButton: "border-mist hover:bg-mist/50 rounded-md min-h-[48px] w-full pr-6 overflow-visible",
                    formFieldLabel: "text-ash",
                    main: "w-full",
                    form: "w-full",
                    formButtons: "w-full",
                    formField: "w-full",
                    footer: "w-full",
                  },
                }}
                routing="hash"
                signInUrl="/login"
                signUpUrl="/login"
                fallbackRedirectUrl={redirectUrl}
                forceRedirectUrl={redirectUrl}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
