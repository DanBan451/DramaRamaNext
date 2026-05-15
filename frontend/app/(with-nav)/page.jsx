"use client";

import React, { useState, useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import Footer from "@/components/Footer";
import SandboxIntroSection from "@/components/SandboxIntroSection";
import ThinkIntroSection from "@/components/ThinkIntroSection";
import HomeModeSequence from "@/components/HomeModeSequence";
import { PUZZLES } from "@/lib/puzzles";

/** Hero right column — Burger trumpet story; half-width block, right-flush to nav CTA edge. */
const heroEyebrow =
  "font-mono text-[12px] font-medium uppercase leading-normal tracking-[0.15em] text-accent-blue lp:text-[13px]";
const heroBody =
  "w-full font-sans text-[clamp(1.0625rem,1.15vw,1.25rem)] font-medium leading-[1.58] text-[#2a2a2a]";
const heroHeadlineBlack =
  "font-display text-[clamp(2.25rem,4.5vw,2.75rem)] font-normal italic leading-[1.08] tracking-[-0.02em] text-[#111111]";
const heroHeadlineRed =
  "font-display text-[clamp(2.25rem,4.5vw,2.75rem)] font-normal italic leading-[1.08] tracking-[-0.02em] text-primary";

function HeroRightStoryContent({ ctaClassName }) {
  return (
    <>
      <span className={`${heroEyebrow} mb-10 block`}>A story from Edward Burger</span>
      <p className={`${heroBody} mb-7`}>
        A trumpet master sat in on his students. One by one, they played their hardest pieces — fast,
        intricate, dazzling. They all sounded roughly the same.
      </p>
      <p className={`${heroBody} mb-7`}>
        Then he asked them to play a children&apos;s tune. Three notes. The kind of thing you&apos;d hum to a
        baby.
      </p>
      <p className={`${heroBody} mb-11`}>
        The students played it. They sounded fine. Then the master played the same tune — and suddenly everyone
        understood who the master was.
      </p>
      <div className="mb-10 flex w-full min-w-0 flex-col gap-2.5">
        <p className={heroHeadlineBlack}>Complexity hides skill.</p>
        <p className={heroHeadlineRed}>Simplicity reveals it.</p>
      </div>
      <p className={`${heroBody} mb-14`}>
        DramaRama is built on that idea. You name something you want to get better at. We build small puzzles for
        it. You play the children&apos;s tune until the muscle is yours — then you bring your real work in, and
        people hear the difference.
      </p>
      <Link href="/login" className={ctaClassName}>
        Forge Your Mind
      </Link>
    </>
  );
}

export default function Home() {
  const [selectedPuzzle, setSelectedPuzzle] = useState(null);
  const heroRef = useRef(null);

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const whiteOverlayOpacity = useTransform(scrollYProgress, [0, 0.6], [0, 1]);
  const contentOpacity = useTransform(scrollYProgress, [0, 0.4], [1, 0]);
  const contentY = useTransform(scrollYProgress, [0, 0.4], [0, -50]);

  return (
    <div id="home-page-scroll" className="min-w-0 overflow-x-hidden bg-white">
      <section
        ref={heroRef}
        className="snap-start relative flex h-[100svh] max-h-[100svh] min-h-0 flex-col overflow-hidden bg-white supports-[height:100dvh]:h-[100dvh] supports-[height:100dvh]:max-h-[100dvh]"
      >
        <div className="relative min-h-0 flex-1 w-full overflow-hidden">
          <div
            className="absolute inset-0 bg-cover bg-no-repeat bg-[center_64%]"
            style={{ backgroundImage: "url('/images/header.png')" }}
          />

          <div className="absolute inset-0 bg-white/90 tb:hidden" />

          <div className="absolute inset-y-0 left-0 hidden w-1/3 backdrop-brightness-100 backdrop-saturate-0 tb:block lp:w-1/4" />

          <div className="absolute inset-y-0 right-0 hidden backdrop-brightness-150 tb:left-1/3 tb:block lp:left-1/4" />

          <div
            className="pointer-events-none absolute inset-y-0 right-0 hidden tb:left-1/3 tb:block lp:left-1/4"
            style={{
              background:
                "linear-gradient(to right, transparent 0%, rgba(255,255,255,0.3) 20%, rgba(255,255,255,0.6) 40%, rgba(255,255,255,0.85) 58%, rgba(255,255,255,1) 72%)",
            }}
          />

          <motion.div
            className="pointer-events-none absolute inset-0 z-10 bg-white"
            style={{ opacity: whiteOverlayOpacity }}
          />

          <motion.div
            className="absolute inset-0 z-20 flex flex-col tb:block"
            style={{ opacity: contentOpacity, y: contentY }}
          >
            {/* Tagline under mask — desktop */}
            <div className="pointer-events-none absolute bottom-0 left-0 z-30 hidden w-1/3 pb-8 pl-6 pr-4 tb:block lp:w-1/4 lp:pb-10 lp:pl-8">
              <p className="pointer-events-auto max-w-[min(100%,14rem)] font-display text-[clamp(0.8125rem,1.05vw,0.9rem)] font-normal italic leading-snug text-[#3d3d42] lp:max-w-[16rem]">
                become a more effective thinker.
              </p>
            </div>

            {/* Mobile: caption + left-aligned riddle column */}
            <div className="relative z-30 flex min-h-0 flex-1 flex-col tb:hidden">
              <div className="flex flex-1 flex-col justify-end nav-shell pb-4">
                <p className="max-w-[16rem] font-display text-sm font-normal italic leading-snug text-[#3d3d42]">
                  become a more effective thinker.
                </p>
              </div>
              <div className="border-t border-black/5 bg-white/95 py-8 nav-shell text-left">
                <div className="ml-auto w-1/2 min-w-0 max-w-full">
                  <HeroRightStoryContent
                    ctaClassName="inline-flex items-center justify-center rounded-sm bg-change px-12 py-4 text-base font-semibold text-white shadow-lg outline-none ring-1 ring-black/5 transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 lp:px-14 lp:py-[1.125rem] lp:text-lg"
                  />
                </div>
              </div>
            </div>

            {/* Tablet+: right edge matches navbar inner content (centered 1536px band + px-6); left at mask split */}
            <div
              className="absolute inset-y-0 left-1/3 z-30 hidden min-h-0 min-w-0 tb:flex tb:flex-col lp:left-1/4"
              style={{
                right: "max(1.5rem, calc((100vw - 1536px) / 2 + 1.5rem))",
              }}
            >
              <div className="box-border flex min-h-0 min-w-0 w-full flex-1 flex-col justify-center overflow-x-hidden pl-6 pb-10 pt-[calc(var(--navbar-height)+0.5rem)] lp:pb-12 lp:pl-8">
                <div className="ml-auto w-1/2 min-w-0 max-w-full">
                  <HeroRightStoryContent
                    ctaClassName="inline-flex items-center justify-center rounded-sm bg-change px-12 py-[1.05rem] text-center text-lg font-semibold text-white shadow-lg outline-none ring-1 ring-black/5 transition-[background-color,box-shadow,transform] duration-200 hover:bg-change/90 hover:shadow-xl hover:-translate-y-0.5 focus-visible:ring-2 focus-visible:ring-change focus-visible:ring-offset-2 lp:px-14 lp:py-5"
                  />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      <HomeModeSequence />

      <SandboxIntroSection />

      <ThinkIntroSection />

      {false && (
      <section id="puzzles" className="py-24 tb:py-32 px-6 bg-white">
        <div className="max-w-[1536px] mx-auto">
          <span className="font-mono text-xs text-smoke tracking-[0.3em] uppercase block mb-12 tb:mb-16">
            The Puzzles
          </span>

          <div className="grid tb:grid-cols-2 lp:grid-cols-3 gap-4 tb:gap-6">
            {PUZZLES.slice(0, 6).map((puzzle, i) => {
              const isActive = puzzle.id === "whos-who" || puzzle.id === "top-10-list" || puzzle.id === "three-switches" || puzzle.id === "star-is-born";
              return (
                <motion.button
                  key={puzzle.id}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, margin: "-30px" }}
                  transition={{ delay: i * 0.08, duration: 0.5 }}
                  onClick={() => isActive && setSelectedPuzzle(puzzle)}
                  disabled={!isActive}
                  className={`group bg-white border p-6 tb:p-8 min-h-[180px] tb:min-h-[200px] flex flex-col justify-between transition-all duration-300 text-left relative ${
                    isActive
                      ? "border-mist hover:border-change/30 hover:shadow-lg hover:-translate-y-1 cursor-pointer"
                      : "border-mist/70 opacity-60 cursor-not-allowed"
                  }`}
                >
                  <div>
                    <span className="font-mono text-[10px] text-change/60 tracking-widest">
                      {puzzle.number}
                    </span>
                    <h4
                      className={`font-display text-xl tb:text-2xl text-black mt-2 mb-3 ${
                        isActive ? "group-hover:text-change transition-colors" : ""
                      }`}
                    >
                      {puzzle.title}
                    </h4>
                    <p className="text-smoke text-base tb:text-lg leading-relaxed line-clamp-2 italic">
                      {puzzle.hook || puzzle.text.split("\n")[0]}
                    </p>
                  </div>
                  <div className="flex items-center justify-between mt-4">
                    <span className="text-[10px] font-mono text-smoke/40 uppercase tracking-wider">
                      {puzzle.category}
                    </span>
                    {!isActive && (
                      <span className="text-[10px] font-mono text-smoke/60 uppercase tracking-[0.25em]">
                        coming soon
                      </span>
                    )}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </section>
      )}

      {/* Attribution — soft lift from Ignite gray into white footer band */}
      <div className="border-t border-mist/60 bg-gradient-to-b from-[#c9ccd2] from-0% via-white via-[min(8vh,3.5rem)] to-white to-100%">
        <div className="nav-shell py-12">
        <p className="mx-auto max-w-lg text-center text-sm leading-relaxed text-smoke">
          DramaRama is built on the 5 Elements of Effective Thinking by Edward B. Burger, with deep gratitude to <em>Making Up Your Own Mind</em>.
        </p>
        </div>
      </div>

      <Footer />
    </div>
  );
}
