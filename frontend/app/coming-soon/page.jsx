"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

export default function ComingSoonPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle"); // idle, loading, success, error
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      setStatus("error");
      setMessage("Please enter a valid email address");
      return;
    }

    setStatus("loading");
    
    try {
      // Store in Supabase waitlist table
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      
      if (res.ok) {
        setStatus("success");
        setMessage("You're on the list! We'll notify you when we launch.");
        setEmail("");
      } else {
        const data = await res.json();
        setStatus("error");
        setMessage(data.error || "Something went wrong. Please try again.");
      }
    } catch (err) {
      setStatus("error");
      setMessage("Network error. Please try again.");
    }
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 py-12 pt-24">
      {/* Background subtle gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-change/5 to-white pointer-events-none" />
      
      <motion.div 
        className="relative z-10 max-w-md w-full text-center"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Logo/Brand */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-black mb-2">
            DramaRama
          </h1>
          <div className="w-12 h-1 bg-change mx-auto rounded-full" />
        </div>

        {/* Main headline */}
        <h2 className="text-2xl md:text-3xl font-semibold text-ash mb-4">
          Think Better. Solve Smarter.
        </h2>
        
        <p className="text-smoke mb-8 leading-relaxed">
          An AI-powered thinking coach that helps you break through mental blocks 
          and develop deeper understanding of complex problems.
        </p>

        {/* Coming Soon Badge */}
        <div className="inline-block bg-change/10 text-change px-4 py-2 rounded-full text-sm font-medium mb-8">
          🚀 Launching Soon
        </div>

        {/* Email signup form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              className="flex-1 px-4 py-3 border border-mist rounded-lg focus:outline-none focus:border-change focus:ring-1 focus:ring-change text-black placeholder:text-smoke"
              disabled={status === "loading" || status === "success"}
            />
            <button
              type="submit"
              disabled={status === "loading" || status === "success"}
              className="px-6 py-3 bg-change text-white font-medium rounded-lg hover:bg-change/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {status === "loading" ? "Joining..." : "Join Waitlist"}
            </button>
          </div>
          
          {/* Status message */}
          {message && (
            <motion.p 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`text-sm ${status === "success" ? "text-green-600" : "text-red-500"}`}
            >
              {message}
            </motion.p>
          )}
        </form>

        {/* Features preview */}
        <div className="mt-12 grid grid-cols-2 gap-4 text-left">
          <div className="p-4 bg-mist/50 rounded-lg">
            <span className="text-2xl mb-2 block grayscale opacity-70">🌳</span>
            <h3 className="font-medium text-black text-sm">Ground Your Thinking</h3>
            <p className="text-xs text-smoke mt-1">Build solid foundations</p>
          </div>
          <div className="p-4 bg-mist/50 rounded-lg">
            <span className="text-2xl mb-2 block grayscale opacity-70">🔥</span>
            <h3 className="font-medium text-black text-sm">Learn by Doing</h3>
            <p className="text-xs text-smoke mt-1">Experiment and iterate</p>
          </div>
          <div className="p-4 bg-mist/50 rounded-lg">
            <span className="text-2xl mb-2 block grayscale opacity-70">💨</span>
            <h3 className="font-medium text-black text-sm">Question Everything</h3>
            <p className="text-xs text-smoke mt-1">Challenge assumptions</p>
          </div>
          <div className="p-4 bg-mist/50 rounded-lg">
            <span className="text-2xl mb-2 block grayscale opacity-70">🌊</span>
            <h3 className="font-medium text-black text-sm">See Connections</h3>
            <p className="text-xs text-smoke mt-1">Find the flow of ideas</p>
          </div>
        </div>

        {/* Footer */}
        <p className="mt-12 text-xs text-smoke">
          Based on "The 5 Elements of Effective Thinking" by Edward Burger
        </p>
      </motion.div>
    </div>
  );
}
