"use client";

import React, { useState } from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Footer from "@/components/Footer";

// Each element has both the short summary (always visible in the grid) and
// a `deep` payload (description + principles + questions) revealed when the
// user toggles "Expand in depth". Each entry also carries Tailwind color
// tokens (`accent`/`tint`/`accentText`) so the expanded cards take on the
// element's identity instead of all looking the same.
const elements = [
  {
    name: "Earth",
    emoji: "🌳",
    title: "Understand Deeply",
    description: "Ground your thinking in fundamentals. Most problems come from a shaky base. Fix the base first.",
    principles: [
      "Start with the simple",
      "Spotlight the specific",
      "Add the adjective",
    ],
    accent: "border-earth",
    tint: "bg-earth/5",
    accentText: "text-earth",
    questionsTint: "bg-earth/10",
    deep: {
      tagline: "Ground your thinking in fundamentals",
      description:
        "The Earth element teaches us that deep understanding comes from mastering the basics. Before reaching for complex solutions, we must first establish a solid foundation. Like a tree's roots, our understanding must go deep before we can grow tall.",
      principles: [
        {
          name: "Start with the simple",
          explanation:
            "Complex problems are built from simple components. By breaking things down to their most basic parts, you create a stable foundation for deeper understanding. Never underestimate the power of truly mastering fundamentals.",
        },
        {
          name: "Spotlight the specific",
          explanation:
            "Vague understanding leads to vague solutions. Focus on concrete, specific aspects of your problem. The more precisely you can articulate what you know, the clearer your path forward becomes.",
        },
        {
          name: "Add descriptive detail",
          explanation:
            "Details matter. As you examine the basics, notice the subtle nuances that others miss. These details often hold the key to breakthrough insights.",
        },
      ],
      questions: [
        "What do I already know for certain about this?",
        "What's the simplest version of this problem?",
        "Can I explain this to someone with no background?",
      ],
    },
  },
  {
    name: "Fire",
    emoji: "🔥",
    title: "Fail Effectively",
    description: "Try something. Fail at it. Learn from the failure. Repeat. Failure is the fastest path forward.",
    principles: [
      "Fail fast",
      "Fail again",
      "Fail intentionally",
    ],
    accent: "border-fire",
    tint: "bg-fire/5",
    accentText: "text-fire",
    questionsTint: "bg-fire/10",
    deep: {
      tagline: "Embrace failure as fuel for learning",
      description:
        "Fire transforms through destruction and creation. The Fire element teaches us that failure isn't the opposite of success—it's the path to it. Every failed attempt illuminates what doesn't work, narrowing the field of possibilities and bringing you closer to what does.",
      principles: [
        {
          name: "Fail fast",
          explanation:
            "Don't wait for the perfect plan. Take action quickly, even if you're uncertain. Quick failures provide quick feedback, accelerating your learning cycle.",
        },
        {
          name: "Fail again",
          explanation:
            "One failure is just the beginning. Each subsequent attempt builds on previous lessons. The goal isn't to avoid failure but to extract maximum learning from each one.",
        },
        {
          name: "Fail intentionally",
          explanation:
            "Sometimes the best way to test an idea is to deliberately find its breaking point. Push boundaries, challenge assumptions, and discover limits through intentional experimentation.",
        },
      ],
      questions: [
        "What's the quickest way to test this idea?",
        "What would prove me wrong?",
        "What am I afraid to try?",
      ],
    },
  },
  {
    name: "Air",
    emoji: "💨",
    title: "Create Questions",
    description: "The right question opens doors no answer ever could. Be your own Socrates — never stop asking.",
    principles: [
      "Be your own Socrates",
      "Ask basic questions",
      "Ask something else",
    ],
    accent: "border-air",
    tint: "bg-air/5",
    accentText: "text-air",
    questionsTint: "bg-air/10",
    deep: {
      tagline: "Question everything relentlessly",
      description:
        "Air is invisible yet essential. The Air element reminds us that questions are more powerful than answers. The right question can unlock doors that no amount of existing knowledge can open. Cultivate a beginner's mind—one that isn't afraid to ask 'obvious' questions.",
      principles: [
        {
          name: "Be your own Socrates",
          explanation:
            "Challenge your own assumptions through systematic questioning. Don't accept your first answer. Keep asking 'why' and 'how' until you reach bedrock truth.",
        },
        {
          name: "Ask basic questions",
          explanation:
            "The most profound insights often come from the simplest questions. 'What is this really?' 'Why does this matter?' Basic questions cut through complexity.",
        },
        {
          name: "Ask something else",
          explanation:
            "When stuck, change your questions. Different questions open different doors. If your current line of inquiry isn't yielding results, pivot to a new angle entirely.",
        },
      ],
      questions: [
        "What question am I not asking?",
        "What would a child ask about this?",
        "If I knew nothing about this, where would I start?",
      ],
    },
  },
  {
    name: "Water",
    emoji: "🌊",
    title: "Flow with Ideas",
    description: "Follow ideas wherever they go. Connect what’s connected. Doubt what feels certain. Don’t stop.",
    principles: [
      "Run down all paths",
      "Embrace doubt",
      "Never stop",
    ],
    accent: "border-water",
    tint: "bg-water/5",
    accentText: "text-water",
    questionsTint: "bg-water/10",
    deep: {
      tagline: "Let ideas connect and evolve",
      description:
        "Water finds its way around obstacles, always moving toward its destination. The Water element teaches us to follow the flow of ideas wherever they lead. Don't force solutions—let them emerge naturally as you explore the landscape of possibilities.",
      principles: [
        {
          name: "Run down all paths",
          explanation:
            "Don't prematurely commit to one direction. Explore multiple possibilities simultaneously. Some paths will dead-end, but others will lead to unexpected discoveries.",
        },
        {
          name: "Embrace doubt",
          explanation:
            "Certainty can be a trap. Doubt keeps your mind open to new information and alternative interpretations. Learn to be comfortable with uncertainty.",
        },
        {
          name: "Never stop",
          explanation:
            "Understanding is a continuous process, not a destination. Even after finding a solution, keep flowing. There may be better solutions downstream.",
        },
      ],
      questions: [
        "What other ways could I look at this?",
        "What am I certain about that might be wrong?",
        "Where else might this idea lead?",
      ],
    },
  },
  {
    name: "Change",
    emoji: "🪨",
    title: "Transform",
    description: "When you apply the other four elements consistently, you change. Not just your answer — you. The way you think becomes who you are.",
    principles: [
      "Reflect on transformation",
      "See the new structure",
      "Become a better thinker",
    ],
    accent: "border-change",
    tint: "bg-change/5",
    accentText: "text-change",
    questionsTint: "bg-change/10",
    deep: {
      tagline: "Become a better thinker through practice",
      description:
        "Change is the quintessence—the element that emerges when all others combine. It represents not just solving problems, but transforming yourself in the process. Every thinking session is an opportunity to evolve how you think, not just what you think about.",
      principles: [
        {
          name: "Reflect on transformation",
          explanation:
            "After working through a problem, examine how your thinking changed. What did you believe before? What do you understand now? This meta-awareness accelerates growth.",
        },
        {
          name: "See the new structure",
          explanation:
            "As understanding deepens, new patterns emerge. Pay attention to the mental models you're building. They'll serve you in future challenges.",
        },
        {
          name: "Become a better thinker",
          explanation:
            "The ultimate goal isn't just to solve this problem but to become someone who solves problems better. Each session builds your capacity for deeper thought.",
        },
      ],
      questions: [
        "How has my understanding changed?",
        "What can I do now that I couldn't before?",
        "What patterns am I starting to see?",
      ],
    },
  },
];

export default function FrameworkPage() {
  // Single toggle reveals/hides the in-depth section for ALL five elements at
  // once. The user explicitly asked for one button rather than per-card
  // expanders. The deep section uses the same black/white styling the user
  // liked from the old /elements page (no purple accents).
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-24 px-6 pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl text-black mb-6">
            The 5 Elements of Effective Thinking
          </h1>
          <p className="text-xl text-smoke max-w-2xl mx-auto leading-relaxed">
            Five ways of thinking that turn problems into puzzles. From Edward B. Burger&apos;s framework. Come back to this page often — these are the muscles you&apos;re training.
          </p>
          <p className="text-smoke text-sm mb-8 mt-6">
            Based on the work of Edward B. Burger — <em>The 5 Elements of Effective Thinking</em> and <em>Making Up Your Own Mind</em>. With deep gratitude.
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
          </div>

          <div className="space-y-8">
            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                1
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">You tell us what you want to master</h3>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                2
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">We build a course around the muscles you need</h3>
              </div>
            </div>

            <div className="flex gap-6 items-start">
              <div className="w-8 h-8 rounded-full bg-mist flex items-center justify-center text-change font-mono text-sm flex-shrink-0">
                3
              </div>
              <div>
                <h3 className="text-lg font-semibold text-black mb-2">You apply all five elements as you think through each puzzle</h3>
              </div>
            </div>
          </div>

          <p className="text-smoke text-center mt-12 text-base">
            The elements are tools. The puzzles are the gym. Your goal is what gets stronger.
          </p>
        </div>
      </section>

      {/* Deep Dive — inline expand. No navigation away from this page. */}
      <section className="py-16 px-6 bg-mist">
        <div className="max-w-[1536px] mx-auto text-center">
          <h2 className="font-display text-2xl text-black mb-4">
            Each element, in depth
          </h2>
          <p className="text-smoke mb-6">
            When you&apos;re ready to go deeper into any one element, expand the
            long version below. Same page, more detail.
          </p>
          <Button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="bg-change text-white font-medium px-8 hover:bg-change/90"
            radius="none"
          >
            {expanded ? "Collapse in depth ↑" : "Expand in depth ↓"}
          </Button>
        </div>
      </section>

      {/* Expanded deep-dive — full nav-bar width (max-w-[1536px]). Each
          element card is tinted with its own element color (earth = green,
          fire = orange, air = slate-blue, water = deep-blue, change = purple)
          so the section feels alive instead of monochrome. */}
      {expanded && (
        <section className="pb-24 px-6 bg-white">
          <div className="max-w-[1536px] mx-auto pt-16 space-y-12">
            {elements.map((element) => (
              <div
                key={element.name}
                id={element.name.toLowerCase()}
                className={`scroll-mt-32 border-l-4 ${element.accent} ${element.tint} p-8 lp:p-12 rounded-r-lg shadow-sm`}
              >
                {/* Element Header */}
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl">{element.emoji}</span>
                  <div>
                    <h2 className="font-display text-4xl text-black">
                      {element.name}
                    </h2>
                    <p
                      className={`text-lg font-medium ${element.accentText}`}
                    >
                      {element.title}
                    </p>
                  </div>
                </div>

                {/* Tagline */}
                <p className="text-2xl text-ash mb-6 font-light italic">
                  &ldquo;{element.deep.tagline}&rdquo;
                </p>

                {/* Description */}
                <p className="text-lg text-smoke mb-10 leading-relaxed max-w-3xl">
                  {element.deep.description}
                </p>

                {/* Principles + Questions side-by-side at large widths so
                    the section uses the full navbar width without feeling
                    sparse. Stacks on smaller screens. */}
                <div className="grid lp:grid-cols-3 gap-8">
                  <div className="lp:col-span-2">
                    <h3
                      className={`text-xs uppercase tracking-widest mb-6 ${element.accentText}`}
                    >
                      Core Principles
                    </h3>
                    <div className="space-y-6">
                      {element.deep.principles.map((principle, i) => (
                        <div
                          key={i}
                          className={`border-l-2 pl-6 ${element.accent}`}
                        >
                          <h4 className="font-semibold text-black mb-2">
                            {principle.name}
                          </h4>
                          <p className="text-smoke leading-relaxed">
                            {principle.explanation}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div
                      className={`${element.questionsTint} rounded-lg p-6 h-full`}
                    >
                      <h3
                        className={`text-xs uppercase tracking-widest mb-4 ${element.accentText}`}
                      >
                        Questions to Ask Yourself
                      </h3>
                      <ul className="space-y-3">
                        {element.deep.questions.map((question, i) => (
                          <li key={i} className="flex items-start gap-3">
                            <span className={`mt-1 ${element.accentText}`}>
                              ?
                            </span>
                            <span className="text-ash">{question}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            <div className="text-center pt-4">
              <Button
                onClick={() => setExpanded(false)}
                className="bg-change text-white font-medium px-8 hover:bg-change/90"
                radius="none"
              >
                Collapse in depth ↑
              </Button>
            </div>
          </div>
        </section>
      )}

      {/* CTA */}
      <section className="py-24 px-6 bg-black text-white">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl mb-6">
            Ready to put them to work?
          </h2>
          <p className="text-lg text-smoke mb-10">
            Tell us what you want to be more effective at. We&apos;ll build the course.
          </p>
          <Link href="/course/new">
            <Button 
              className="bg-white text-black font-semibold px-10 py-6 text-lg hover:bg-mist"
              radius="none"
            >
              Start Your Course
            </Button>
          </Link>
        </div>
      </section>

      <Footer />
    </div>
  );
}
