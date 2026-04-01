"use client";

import React, { useRef } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Image from "next/image";
import { SignedIn, SignedOut } from "@clerk/nextjs";
import { motion, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";

// Element data for framework preview
const elements = [
  { name: "Earth", emoji: "🌳", desc: "Ground your understanding" },
  { name: "Fire", emoji: "🔥", desc: "Try and fail forward" },
  { name: "Air", emoji: "💨", desc: "Question assumptions" },
  { name: "Water", emoji: "🌊", desc: "See connections flow" },
  { name: "Change", emoji: "🪨", desc: "Reflect on transformation" },
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
      {/* Hero Section with Original Design */}
      <section ref={heroRef} className="relative h-screen overflow-hidden">
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/images/header.png')" }}
        />

        {/* LEFT: B&W Mask */}
        <div className="absolute inset-0 w-1/3 lp:w-1/4 h-full backdrop-brightness-100 backdrop-saturate-0" />

        {/* RIGHT: Bright Mask */}
        <div className="absolute inset-y-0 right-0 w-2/3 lp:w-3/4 h-full backdrop-brightness-150" />

        {/* White overlay that fades in as you scroll */}
        <motion.div
          className="absolute inset-0 bg-white pointer-events-none z-10"
          style={{ opacity: whiteOverlayOpacity }}
        />

        {/* Hero Content */}
        <motion.div
          className="relative z-20 h-full flex flex-col justify-end pb-16 lp:pb-20"
          style={{ opacity: contentOpacity, y: contentY }}
        >
          <div className="container mx-auto px-4 sm:px-6 lg:px-8">
            <div className="lp:absolute lp:bottom-20 lp:left-1/4 lp:ml-10 mr-3 max-w-none">
              <h1 className="font-display text-3xl tb:text-5xl lp:text-6xl text-black mb-4 lp:mb-6 lp:max-w-[1000px] drop-shadow-sm">
                Understand Deeply.
              </h1>
              <p className="text-lg tb:text-xl lp:text-2xl text-black/80 lp:max-w-[800px] mb-6 lp:mb-8">
                Describe any problem you're facing. Our AI guides you to deeper 
                understanding through proven thinking frameworks.
              </p>
              <div className="flex flex-col tb:flex-row gap-4">
                <SignedIn>
                  <Link href="/workspace">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Exploring
                    </Button>
                  </Link>
                </SignedIn>
                <SignedOut>
                  <Link href="/login">
                    <Button 
                      className="bg-primary hover:bg-primary/90 text-white w-full tb:w-[220px] h-[64px] text-lg font-semibold shadow-lg hover:shadow-xl hover:scale-105 transition-all"
                      radius="none"
                    >
                      Start Exploring
                    </Button>
                  </Link>
                </SignedOut>
                <Link href="/framework">
                  <Button 
                    className="bg-transparent border border-smoke text-black hover:bg-mist w-full tb:w-[220px] h-[64px] text-lg font-semibold hover:scale-105 transition-all"
                    radius="none"
                  >
                    Learn the Framework
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

      {/* How It Works Section */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-[1536px] mx-auto">
          <div className="text-center mb-16">
            <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
              How It Works
            </span>
            <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
              A conversation that builds understanding
            </h2>
          </div>

          <div className="grid lp:grid-cols-3 gap-12">
            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-mist flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-display text-change">1</span>
              </div>
              <h3 className="font-display text-2xl text-black mb-4">Describe your problem</h3>
              <p className="text-smoke">
                Bring a real challenge you're facing. Something you're stuck on 
                or want to think through more deeply.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-mist flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-display text-change">2</span>
              </div>
              <h3 className="font-display text-2xl text-black mb-4">Have a conversation</h3>
              <p className="text-smoke">
                Chat naturally. The system asks questions that help you see 
                your problem from new angles.
              </p>
            </div>

            <div className="text-center">
              <div className="w-20 h-20 rounded-full bg-mist flex items-center justify-center mx-auto mb-6">
                <span className="text-2xl font-display text-change">3</span>
              </div>
              <h3 className="font-display text-2xl text-black mb-4">Build understanding</h3>
              <p className="text-smoke">
                As you talk, a Deep Understanding Document builds in real time—
                capturing your insights.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* The Framework Section */}
      <section className="py-24 px-6 bg-mist">
        <div className="max-w-[1536px] mx-auto">
          <div className="grid lp:grid-cols-2 gap-16 items-center">
            <div>
              <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
                The Framework
              </span>
              <h2 className="font-display text-4xl lp:text-5xl text-black mb-6">
                Invisible scaffolding for better thinking
              </h2>
              <p className="text-lg text-ash mb-6">
                Behind every conversation is the 5 Elements of Effective Thinking—a proven 
                framework for developing deep understanding. But you'll never see it.
              </p>
              <p className="text-lg text-ash mb-8">
                The system invisibly applies the right thinking lens at the right moment, 
                so you can focus on your problem, not on methodology.
              </p>
              <Link href="/framework">
                <Button 
                  className="bg-primary text-white hover:bg-primary/90 px-8 py-6 text-lg font-semibold"
                  radius="none"
                >
                  Explore the Framework
                </Button>
              </Link>
            </div>

            <div className="bg-white border border-mist rounded-xl p-8 shadow-lg">
              <div className="space-y-4">
                {elements.map((element) => (
                  <div 
                    key={element.name}
                    className="flex items-center gap-4 p-4 rounded-lg bg-gray-100/80 border border-gray-200 element-shimmer"
                  >
                    <div className="text-3xl grayscale opacity-70">{element.emoji}</div>
                    <div>
                      <div className="font-semibold text-black">{element.name}</div>
                      <div className="text-sm text-smoke">{element.desc}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-24 px-6 bg-black text-white">
        <div className="max-w-[1536px] mx-auto text-center">
          <h2 className="font-display text-4xl lp:text-5xl mb-6">
            Ready to think deeper?
          </h2>
          <p className="text-xl text-smoke mb-10 max-w-xl mx-auto">
            Bring a real problem. Have a real conversation. Build real understanding.
          </p>
          <SignedIn>
            <Link href="/workspace">
              <Button className="bg-white text-black hover:bg-mist px-8 py-6 text-lg rounded-none font-semibold">
                Open Workspace
              </Button>
            </Link>
          </SignedIn>
          <SignedOut>
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-mist px-8 py-6 text-lg rounded-none font-semibold">
                Get Started Free
              </Button>
            </Link>
          </SignedOut>
        </div>
      </section>

      <Footer />
    </div>
  );
}
