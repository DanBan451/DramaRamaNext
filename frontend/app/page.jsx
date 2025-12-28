"use client";

import React, { useRef } from "react";
import Image from "next/image";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { SignedIn, SignedOut } from "@clerk/nextjs";

// Element data
const elements = [
  {
    id: "earth",
    emoji: "🌳",
    name: "Earth",
    title: "Deep Understanding",
    description: "Master the basics. Start with the simple. Spotlight the specific. Add the adjective.",
    color: "earth",
    subElements: ["Start with Simple", "Spotlight Specific", "Add the Adjective"],
  },
  {
    id: "fire",
    emoji: "🔥",
    name: "Fire",
    title: "Embrace Failure",
    description: "Fail fast, fail again, fail intentionally. Each failed attempt is a precious joule of insight.",
    color: "fire",
    subElements: ["Fail Fast", "Fail Again", "Fail Intentionally"],
  },
  {
    id: "air",
    emoji: "💨",
    name: "Air",
    title: "Create Questions",
    description: "Be your own Socrates. Ask basic questions. Ask another question. Never stop questioning.",
    color: "air",
    subElements: ["Be Your Own Socrates", "Ask Basic Questions", "Ask Another Question"],
  },
  {
    id: "water",
    emoji: "🌊",
    name: "Water",
    title: "Flow of Ideas",
    description: "Run down all paths. Embrace doubt. Never stop. See how ideas connect and evolve.",
    color: "water",
    subElements: ["Run Down All Paths", "Embrace Doubt", "Never Stop"],
  },
  {
    id: "change",
    emoji: "🪨",
    name: "Change",
    title: "The Quintessential",
    description: "When you apply all elements, change becomes inevitable. You transform.",
    color: "change",
    subElements: ["Transform Thinking", "See Structure", "Become Better"],
  },
];

// Mock session data for preview
const recentSessions = [
  { id: 1, title: "Two Sum", element: "earth", progress: 100, date: "Today" },
  { id: 2, title: "Valid Parentheses", element: "fire", progress: 75, date: "Yesterday" },
  { id: 3, title: "Merge Intervals", element: "air", progress: 50, date: "2 days ago" },
];

export default function Home() {
  const heroRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  // Scroll animation - white overlay fades in, content fades out
  const whiteOverlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, -50]);

  return (
    <div className="bg-white">
      {/* Hero Section - EXACT ORIGINAL DESIGN with Scroll Animation */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/header.png')" }}
        />

        {/* LEFT: B&W Mask - EXACT ORIGINAL: inset-0 w-1/3 lp:w-1/4 */}
        <div className="absolute inset-0 w-1/3 lp:w-1/4 h-full backdrop-brightness-100 backdrop-saturate-0" />

        {/* RIGHT: Bright Mask - EXACT ORIGINAL: inset-y-0 right-0 w-2/3 lp:w-3/4 */}
        <div className="absolute inset-y-0 right-0 w-2/3 lp:w-3/4 h-full backdrop-brightness-150" />

        {/* White overlay that fades in as you scroll */}
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none z-10"
          style={{ opacity: whiteOverlayOpacity }}
        />

        {/* Hero Content - positioned after the B&W section like original */}
        <motion.div
          className="relative z-20 h-full flex flex-col justify-end pb-16 lp:pb-20"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            {/* Content positioned after the B&W section - matching original lp:left-1/4 lp:ml-10 */}
            <div className="lp:absolute lp:bottom-20 lp:left-1/4 lp:ml-10 mr-3 max-w-none">
              <h1 className="font-display text-3xl tb:text-5xl lp:text-6xl text-black mb-4 lp:mb-6 lp:max-w-[1000px] drop-shadow-sm">
                Train Your Mind.
                <br />
                <span className="italic">Master Algorithms.</span>
              </h1>
              <p className="text-lg tb:text-xl lp:text-2xl text-black/80 lp:max-w-[800px] mb-6 lp:mb-8">
                DramaRama is your mental gym for algorithms. Apply the 5 Elements of
                Effective Thinking to transform how you solve problems.
              </p>
              <div className="flex flex-col tb:flex-row gap-4">
                <SignedIn>
                  <Link href="/dashboard">
                    <Button 
                      className="bg-fire hover:bg-fire/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Training
                    </Button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/login">
                    <Button 
                      className="bg-fire hover:bg-fire/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Training
                    </Button>
                  </Link>
                </SignedOut>
                <Link href="/elements">
                  <Button 
                    className="bg-transparent border-2 border-black text-black hover:bg-black hover:text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold hover:scale-105 transition-all"
                    radius="none"
                  >
                    Learn the Elements
                  </Button>
                </Link>
              </div>
            </div>
          </div>

          {/* Scroll indicator */}
          <div className="hidden lp:block absolute bottom-10 right-10 animate-float">
            <Image
              src="/images/icons8-down-arrow-100.png"
              width={30}
              height={30}
              alt="Scroll down"
              className="opacity-60"
            />
          </div>
        </motion.div>
      </section>

      {/* Section Divider */}
      <div className="section-divider" />

      {/* The Philosophy Section */}
      <section className="py-24 px-6 lp:px-20 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lp:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
                The Philosophy
              </span>
              <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
                Stop solving.
                <br />
                <span className="italic">Start thinking.</span>
              </h2>
              <p className="text-lg text-ash mb-6">
                Most algorithm platforms reward getting the right answer. But that's not
                what matters. What matters is whether you're engaging deeply—applying
                creative thinking, reflecting honestly, and building mental muscles.
              </p>
              <p className="text-lg text-ash mb-8">
                DramaRama tracks how you <em>think</em>, not just what you solve. We guide
                you through 12 prompts across the 5 Elements, training your mind to see
                problems as puzzles to be loved, not obstacles to overcome.
              </p>
              <div className="flex items-center gap-4">
                <div className="text-center">
                  <div className="metric-value text-black">12</div>
                  <div className="metric-label">Prompts</div>
            </div>
                <div className="w-px h-12 bg-mist" />
                <div className="text-center">
                  <div className="metric-value text-black">5</div>
                  <div className="metric-label">Elements</div>
              </div>
                <div className="w-px h-12 bg-mist" />
                <div className="text-center">
                  <div className="metric-value text-black">∞</div>
                  <div className="metric-label">Growth</div>
              </div>
              </div>
            </div>

            <div className="relative">
              <div className="absolute -inset-4 bg-gradient-to-br from-earth/10 via-fire/10 to-water/10 rounded-3xl blur-2xl" />
              <div className="relative bg-white border border-mist rounded-2xl p-8 shadow-xl">
                <div className="font-mono text-sm text-smoke mb-4">// Your journey</div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🌳</span>
                    <div className="flex-1">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-earth" style={{ width: "85%" }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm">85%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🔥</span>
                    <div className="flex-1">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-fire" style={{ width: "72%" }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm">72%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">💨</span>
                    <div className="flex-1">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-air" style={{ width: "90%" }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm">90%</span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">🌊</span>
                    <div className="flex-1">
                      <div className="progress-bar">
                        <div className="progress-bar-fill bg-water" style={{ width: "65%" }} />
                      </div>
                    </div>
                    <span className="font-mono text-sm">65%</span>
                  </div>
                </div>
                <div className="mt-6 pt-6 border-t border-mist flex justify-between items-center">
                  <span className="font-mono text-sm text-smoke">Total Joules</span>
                  <span className="font-display text-3xl text-change">2,847</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* The 5 Elements Section */}
      <section className="py-24 px-6 lp:px-20 bg-gradient-to-b from-white to-mist/30">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
              The Framework
            </span>
            <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
              5 Elements of Effective Thinking
            </h2>
            <p className="text-lg text-ash max-w-[600px] mx-auto">
              Each element provides a different lens to see the structure of any puzzle.
              Together, they create change.
            </p>
          </div>

          <div className="grid mb:grid-cols-2 lp:grid-cols-5 gap-6">
            {elements.map((element, index) => (
              <div
                key={element.id}
                className={`element-card element-${element.color} bg-white rounded-xl p-6 opacity-0 animate-fade-in-up`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <span className="text-4xl mb-4 block">{element.emoji}</span>
                <h3 className={`font-display text-2xl mb-2 text-${element.color}`}>
                  {element.name}
                </h3>
                <p className="text-sm text-smoke mb-4">{element.title}</p>
                <ul className="space-y-1">
                  {element.subElements.map((sub, i) => (
                    <li key={i} className="text-xs font-mono text-ash flex items-center gap-2">
                      <span className="w-1 h-1 rounded-full bg-current opacity-50" />
                      {sub}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section className="py-24 px-6 lp:px-20 bg-black text-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
              The Process
            </span>
            <h2 className="font-display text-4xl lp:text-5xl mb-6">
              How DramaRama Works
            </h2>
          </div>

          <div className="grid lp:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🧩</span>
      </div>
              <h3 className="font-display text-2xl mb-4">1. Open a Problem</h3>
              <p className="text-smoke">
                Visit LeetCode or HackerRank. Our browser extension detects the algorithm
                and starts your session.
      </p>
      </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">🎯</span>
              </div>
              <h3 className="font-display text-2xl mb-4">2. Answer 12 Prompts</h3>
              <p className="text-smoke">
                Apply each of the 5 Elements (3 sub-elements each) to the problem. Think
                deeply. Write honestly.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">✨</span>
              </div>
              <h3 className="font-display text-2xl mb-4">3. Receive Your Nudge</h3>
              <p className="text-smoke">
                Our AI analyzes your engagement and nudges you toward the element you
                need—without spoiling the answer.
              </p>
            </div>
          </div>

          <div className="text-center mt-16">
            {/* Logged in → go to dashboard; logged out → go to login */}
            <SignedIn>
              <Link href="/dashboard">
                <Button className="bg-white text-black hover:bg-mist px-8 py-6 text-lg rounded-none font-semibold">
                  Get the Extension
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/login">
                <Button className="bg-white text-black hover:bg-mist px-8 py-6 text-lg rounded-none font-semibold">
                  Get the Extension
                </Button>
              </Link>
            </SignedOut>
          </div>
        </div>
      </section>

      {/* Dashboard Preview Section */}
      <section className="py-24 px-6 lp:px-20 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid lp:grid-cols-2 gap-16 items-center">
            <div className="order-2 lp:order-1">
              {/* Mock Dashboard */}
              <div className="bg-mist/30 rounded-2xl p-6 border border-mist">
                <div className="flex items-center gap-2 mb-6">
                  <div className="w-3 h-3 rounded-full bg-fire/60" />
                  <div className="w-3 h-3 rounded-full bg-earth/60" />
                  <div className="w-3 h-3 rounded-full bg-air/60" />
                  <span className="ml-2 font-mono text-xs text-smoke">dashboard</span>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-3 gap-4 mb-6">
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-fire flex items-center justify-center gap-1">
                      <span>🔥</span> 7
                    </div>
                    <div className="text-xs text-smoke">Day Streak</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-black">23</div>
                    <div className="text-xs text-smoke">Sessions</div>
                  </div>
                  <div className="bg-white rounded-lg p-4 text-center">
                    <div className="text-2xl font-bold text-change">847</div>
                    <div className="text-xs text-smoke">Joules</div>
                  </div>
                </div>

                {/* Recent Sessions */}
                <div className="bg-white rounded-lg p-4">
                  <div className="text-sm font-semibold mb-3">Recent Sessions</div>
                  <div className="space-y-2">
                    {recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className="flex items-center gap-3 p-2 hover:bg-mist/50 rounded transition-colors"
                      >
                        <span className="text-lg">
                          {session.element === "earth" && "🌳"}
                          {session.element === "fire" && "🔥"}
                          {session.element === "air" && "💨"}
                        </span>
                        <div className="flex-1">
                          <div className="text-sm font-medium">{session.title}</div>
                          <div className="text-xs text-smoke">{session.date}</div>
                        </div>
                        <div className="w-16">
                          <div className="progress-bar h-1">
                            <div
                              className={`progress-bar-fill bg-${session.element}`}
                              style={{ width: `${session.progress}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="order-1 lp:order-2">
              <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
                Your Headquarters
              </span>
              <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
                Track Your
                <br />
                <span className="italic">Transformation</span>
              </h2>
              <p className="text-lg text-ash mb-6">
                Your dashboard is your mental gym log. See which elements you're
                mastering, where you need more practice, and how you've grown over time.
              </p>
              <ul className="space-y-4 mb-8">
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-earth/10 flex items-center justify-center text-earth shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-ash">
                    <strong className="text-black">Session History</strong> — Every algorithm you've
                    thought through, preserved
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-fire/10 flex items-center justify-center text-fire shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-ash">
                    <strong className="text-black">Element Breakdown</strong> — See which lenses you
                    favor and which need work
                  </span>
                </li>
                <li className="flex items-start gap-3">
                  <span className="w-6 h-6 rounded-full bg-change/10 flex items-center justify-center text-change shrink-0 mt-0.5">
                    ✓
                  </span>
                  <span className="text-ash">
                    <strong className="text-black">Growth Metrics</strong> — Joules earned,
                    streaks maintained, progress visualized
                  </span>
                </li>
              </ul>
              {/* Removed "View Dashboard Demo" button as requested */}
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section
        className="py-32 px-6 lp:px-20 relative"
        style={{
          backgroundImage: 'url("/images/background-daniel.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 max-w-[1400px] mx-auto text-center">
          <h2 className="font-display text-4xl lp:text-6xl text-white mb-6">
            Ready to transform how you think?
          </h2>
          <p className="text-xl text-white/70 max-w-[600px] mx-auto mb-10">
            Join the mental gym. Stop memorizing algorithms. Start understanding them.
          </p>
          <div className="flex flex-col tb:flex-row gap-4 justify-center">
            <SignedIn>
              <Link href="/dashboard">
                <Button className="bg-white text-black hover:bg-mist w-full tb:w-[260px] h-[72px] text-lg rounded-none font-semibold">
                  Create Free Account
                </Button>
              </Link>
            </SignedIn>
            <SignedOut>
              <Link href="/login">
                <Button className="bg-white text-black hover:bg-mist w-full tb:w-[260px] h-[72px] text-lg rounded-none font-semibold">
                  Create Free Account
                </Button>
              </Link>
            </SignedOut>
            <Link href="/elements">
              <Button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black w-full tb:w-[260px] h-[72px] text-lg rounded-none font-semibold">
                Explore the Elements
              </Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-white py-12 px-6 lp:px-20">
        <div className="max-w-[1400px] mx-auto">
          <div className="flex flex-col lp:flex-row justify-between items-center gap-8">
            <div className="flex items-center gap-3">
              {/* White logo for dark background */}
              <Image 
                src="/images/icons8-drama-96.png" 
                width={40} 
                height={40} 
                alt="DramaRama" 
                style={{ filter: 'brightness(0) invert(1)' }}
              />
              <span className="font-display text-2xl">DramaRama</span>
            </div>
            <div className="flex gap-8 text-sm text-smoke">
              <Link href="/elements" className="hover:text-white transition-colors">
                Elements
              </Link>
              {/* Dashboard link only visible when logged in */}
              <SignedIn>
                <Link href="/dashboard" className="hover:text-white transition-colors">
                  Dashboard
                </Link>
              </SignedIn>
              <SignedOut>
                <Link href="/login" className="hover:text-white transition-colors">
                  Login
                </Link>
              </SignedOut>
            </div>
            <div className="text-sm text-smoke">
              DramaRama © {new Date().getFullYear()} — Think through it.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
