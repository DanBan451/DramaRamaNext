"use client";

import React from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Footer from "@/components/Footer";

// Element data with geometric SVG icons (original brighter colors)
const elements = [
  {
    name: "Earth",
    emoji: "🌳",
    title: "Understand Deeply",
    description: "Ground your thinking in fundamentals. Start with what you know, then build understanding layer by layer.",
    principles: [
      "Start with the simple",
      "Spotlight the specific", 
      "Add descriptive detail"
    ],
  },
  {
    name: "Fire",
    emoji: "🔥",
    title: "Fail Effectively",
    description: "Embrace failure as fuel for learning. Try quickly, fail fast, and extract insight from every attempt.",
    principles: [
      "Fail fast",
      "Fail again",
      "Fail intentionally"
    ],
  },
  {
    name: "Air",
    emoji: "💨",
    title: "Create Questions",
    description: "Question everything. The right question opens more doors than any answer ever could.",
    principles: [
      "Be your own Socrates",
      "Ask basic questions",
      "Ask something else"
    ],
  },
  {
    name: "Water",
    emoji: "🌊",
    title: "Flow with Ideas",
    description: "Let ideas flow and connect. Follow every path, embrace doubt, and see where the current takes you.",
    principles: [
      "Run down all paths",
      "Embrace doubt",
      "Never stop"
    ],
  },
  {
    name: "Change",
    emoji: "🪨",
    title: "Transform",
    description: "When you apply all elements, transformation becomes inevitable. You don't just solve—you evolve.",
    principles: [
      "Reflect on transformation",
      "See the new structure",
      "Become a better thinker"
    ],
  },
];

export default function FrameworkPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-24 px-6 pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-sm font-mono text-smoke uppercase tracking-widest mb-4">
            Under the Hood
          </p>
          <h1 className="font-display text-5xl md:text-6xl text-black mb-6">
            The thinking behind DramaRama
          </h1>
          <p className="text-xl text-smoke max-w-2xl mx-auto leading-relaxed">
            DramaRama uses five ways of thinking to guide your conversation. 
            You don't need to know any of this to use it — but if you're curious, 
            here's how it works under the hood.
          </p>
          <p className="text-smoke text-sm mb-8 mt-6">
            Based on the work of Edward B. Burger — 
            <em>The 5 Elements of Effective Thinking</em> and <em>Making Up Your Own Mind</em>.
          </p>
        </div>
      </section>

      {/* Elements Grid */}
      <section className="py-16 px-6 bg-mist">
        <div className="max-w-[1536px] mx-auto">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6">
            {elements.map((element) => (
              <div
                key={element.name}
                className="bg-white border border-gray-200 rounded-lg p-8 hover:shadow-lg transition-shadow element-shimmer"
              >
                <div className="mb-6 text-5xl grayscale opacity-60">
                  {element.emoji}
                </div>
                <h3 className="text-2xl font-semibold text-black mb-2">
                  {element.name}
                </h3>
                <p className="text-lg text-ash mb-4">
                  {element.title}
                </p>
                <p className="text-smoke mb-6 leading-relaxed">
                  {element.description}
                </p>
                <ul className="space-y-2">
                  {element.principles.map((principle, i) => (
                    <li key={i} className="flex items-center gap-3 text-sm text-smoke">
                      <span className="w-1.5 h-1.5 rounded-full bg-change" />
                      {principle}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-24 px-6 bg-white">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl text-black mb-4">
              How the elements work in DramaRama
            </h2>
            <p className="text-lg text-smoke">
              You don't need to think about which element to apply. The system does it for you.
            </p>
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">You pick a puzzle</h3>
                <p className="text-smoke">
                  Choose a thinking puzzle. No special preparation required—just pick one that catches your eye.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">The system selects the right element</h3>
                <p className="text-smoke">
                  Based on your conversation, DramaRama invisibly applies the most useful thinking lens at each moment.
                </p>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">Understanding builds naturally</h3>
                <p className="text-smoke">
                  As you chat, insights are extracted and organized into your scratch paper—a living record of your thinking.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Deep Dive Link */}
      <section className="py-16 px-6 bg-mist">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-2xl text-black mb-4">
            Want to dig deeper?
          </h2>
          <p className="text-smoke mb-6">
            Each element has its own principles and guiding questions.
          </p>
          <Link href="/elements">
            <Button 
              className="bg-change text-white font-medium px-8 hover:bg-change/90"
              radius="none"
            >
              See All Five Elements →
            </Button>
          </Link>
        </div>
      </section>

      {/* CTA */}
      <section className="py-24 px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl mb-6">
            Ready to try a puzzle?
          </h2>
          <p className="text-lg text-smoke mb-10">
            It takes about 15 minutes. Pick one and see where your thinking goes.
          </p>
          <Link href="/workspace">
            <Button 
              className="bg-white text-black font-semibold px-10 py-6 text-lg hover:bg-mist"
              radius="none"
            >
              Pick a Puzzle
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
