"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { SignIn, SignUp } from "@clerk/nextjs";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@clerk/nextjs";
import { useEffect } from "react";

export default function LoginPage() {
  const [isLogin, setIsLogin] = useState(true);
  const { isSignedIn, isLoaded } = useAuth();
  const router = useRouter();

  // Redirect if already signed in
  useEffect(() => {
    if (isLoaded && isSignedIn) {
      router.push("/dashboard");
    }
  }, [isLoaded, isSignedIn, router]);

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Decorative */}
      <div className="hidden lp:flex w-1/2 bg-black relative overflow-hidden">
        {/* Gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-earth/20 via-fire/20 to-water/20" />
        
        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center px-20 py-16">
          <div className="mb-auto">
            <Link href="/" className="flex items-center gap-3">
              {/* White logo for dark background */}
              <Image
                src="/images/icons8-drama-96.png"
                width={50}
                height={50}
                alt="DramaRama"
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="font-display text-white text-2xl">DramaRama</span>
            </Link>
          </div>

          <div className="my-auto">
            <h1 className="font-display text-5xl text-white mb-6 leading-tight">
              Enter the
              <br />
              <span className="italic text-white/80">Mental Gym</span>
            </h1>
            <p className="text-white/60 text-lg max-w-md mb-12">
              Where algorithms become puzzles to love, not obstacles to overcome.
            </p>

            {/* Elements showcase */}
            <div className="flex gap-4">
              {["🌳", "🔥", "💨", "🌊", "🪨"].map((emoji, i) => (
                <div
                  key={i}
                  className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-xl opacity-0 animate-fade-in"
                  style={{ animationDelay: `${i * 0.1}s`, animationFillMode: 'forwards' }}
                >
                  {emoji}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-auto text-white/40 text-sm">
            "The puzzles themselves begin to change when you apply the 5 Elements."
            <br />
            <span className="text-white/60">— Edward Burger</span>
          </div>
        </div>

        {/* Decorative elements */}
        <div className="absolute bottom-0 right-0 w-96 h-96 bg-gradient-to-tl from-change/30 to-transparent rounded-full blur-3xl" />
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-bl from-fire/20 to-transparent rounded-full blur-2xl" />
      </div>

      {/* Right Panel - Clerk Auth */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 tb:px-8 py-16 bg-white">
        <div className="w-full max-w-[640px]">
          {/* Mobile logo */}
          <div className="lp:hidden flex items-center gap-3 mb-12">
            <Image
              src="/images/icons8-drama-96.png"
              width={40}
              height={40}
              alt="DramaRama"
            />
            <span className="font-display text-black text-xl">DramaRama</span>
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
                forceRedirectUrl="/dashboard"
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
                forceRedirectUrl="/dashboard"
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
