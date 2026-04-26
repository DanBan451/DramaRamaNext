"use client";

import React from "react";
import { Button } from "@nextui-org/button";
import Link from "next/link";
import Footer from "@/components/Footer";

// Detailed element data for deep dive
const elements = [
  {
    id: "earth",
    name: "Earth",
    emoji: "🌳",
    title: "Understand Deeply",
    tagline: "Ground your thinking in fundamentals",
    description: "The Earth element teaches us that deep understanding comes from mastering the basics. Before reaching for complex solutions, we must first establish a solid foundation. Like a tree's roots, our understanding must go deep before we can grow tall.",
    principles: [
      {
        name: "Start with the simple",
        explanation: "Complex problems are built from simple components. By breaking things down to their most basic parts, you create a stable foundation for deeper understanding. Never underestimate the power of truly mastering fundamentals."
      },
      {
        name: "Spotlight the specific",
        explanation: "Vague understanding leads to vague solutions. Focus on concrete, specific aspects of your problem. The more precisely you can articulate what you know, the clearer your path forward becomes."
      },
      {
        name: "Add descriptive detail",
        explanation: "Details matter. As you examine the basics, notice the subtle nuances that others miss. These details often hold the key to breakthrough insights."
      }
    ],
    questions: [
      "What do I already know for certain about this?",
      "What's the simplest version of this problem?",
      "Can I explain this to someone with no background?"
    ]
  },
  {
    id: "fire",
    name: "Fire",
    emoji: "🔥",
    title: "Fail Effectively",
    tagline: "Embrace failure as fuel for learning",
    description: "Fire transforms through destruction and creation. The Fire element teaches us that failure isn't the opposite of success—it's the path to it. Every failed attempt illuminates what doesn't work, narrowing the field of possibilities and bringing you closer to what does.",
    principles: [
      {
        name: "Fail fast",
        explanation: "Don't wait for the perfect plan. Take action quickly, even if you're uncertain. Quick failures provide quick feedback, accelerating your learning cycle."
      },
      {
        name: "Fail again",
        explanation: "One failure is just the beginning. Each subsequent attempt builds on previous lessons. The goal isn't to avoid failure but to extract maximum learning from each one."
      },
      {
        name: "Fail intentionally",
        explanation: "Sometimes the best way to test an idea is to deliberately find its breaking point. Push boundaries, challenge assumptions, and discover limits through intentional experimentation."
      }
    ],
    questions: [
      "What's the quickest way to test this idea?",
      "What would prove me wrong?",
      "What am I afraid to try?"
    ]
  },
  {
    id: "air",
    name: "Air",
    emoji: "💨",
    title: "Create Questions",
    tagline: "Question everything relentlessly",
    description: "Air is invisible yet essential. The Air element reminds us that questions are more powerful than answers. The right question can unlock doors that no amount of existing knowledge can open. Cultivate a beginner's mind—one that isn't afraid to ask 'obvious' questions.",
    principles: [
      {
        name: "Be your own Socrates",
        explanation: "Challenge your own assumptions through systematic questioning. Don't accept your first answer. Keep asking 'why' and 'how' until you reach bedrock truth."
      },
      {
        name: "Ask basic questions",
        explanation: "The most profound insights often come from the simplest questions. 'What is this really?' 'Why does this matter?' Basic questions cut through complexity."
      },
      {
        name: "Ask something else",
        explanation: "When stuck, change your questions. Different questions open different doors. If your current line of inquiry isn't yielding results, pivot to a new angle entirely."
      }
    ],
    questions: [
      "What question am I not asking?",
      "What would a child ask about this?",
      "If I knew nothing about this, where would I start?"
    ]
  },
  {
    id: "water",
    name: "Water",
    emoji: "🌊",
    title: "Flow with Ideas",
    tagline: "Let ideas connect and evolve",
    description: "Water finds its way around obstacles, always moving toward its destination. The Water element teaches us to follow the flow of ideas wherever they lead. Don't force solutions—let them emerge naturally as you explore the landscape of possibilities.",
    principles: [
      {
        name: "Run down all paths",
        explanation: "Don't prematurely commit to one direction. Explore multiple possibilities simultaneously. Some paths will dead-end, but others will lead to unexpected discoveries."
      },
      {
        name: "Embrace doubt",
        explanation: "Certainty can be a trap. Doubt keeps your mind open to new information and alternative interpretations. Learn to be comfortable with uncertainty."
      },
      {
        name: "Never stop",
        explanation: "Understanding is a continuous process, not a destination. Even after finding a solution, keep flowing. There may be better solutions downstream."
      }
    ],
    questions: [
      "What other ways could I look at this?",
      "What am I certain about that might be wrong?",
      "Where else might this idea lead?"
    ]
  },
  {
    id: "change",
    name: "Change",
    emoji: "🪨",
    title: "Transform",
    tagline: "Become a better thinker through practice",
    description: "Change is the quintessence—the element that emerges when all others combine. It represents not just solving problems, but transforming yourself in the process. Every thinking session is an opportunity to evolve how you think, not just what you think about.",
    principles: [
      {
        name: "Reflect on transformation",
        explanation: "After working through a problem, examine how your thinking changed. What did you believe before? What do you understand now? This meta-awareness accelerates growth."
      },
      {
        name: "See the new structure",
        explanation: "As understanding deepens, new patterns emerge. Pay attention to the mental models you're building. They'll serve you in future challenges."
      },
      {
        name: "Become a better thinker",
        explanation: "The ultimate goal isn't just to solve this problem but to become someone who solves problems better. Each session builds your capacity for deeper thought."
      }
    ],
    questions: [
      "How has my understanding changed?",
      "What can I do now that I couldn't before?",
      "What patterns am I starting to see?"
    ]
  }
];

export default function ElementsDeepDivePage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="py-24 px-6 pt-32">
        <div className="max-w-4xl mx-auto text-center">
          <Link href="/framework" className="text-sm font-mono text-change hover:text-change/80 uppercase tracking-widest mb-4 inline-block">
            ← Back to The Elements
          </Link>
          <h1 className="font-display text-5xl md:text-6xl text-black mb-6 mt-4">
            The Elements in Depth
          </h1>
          <p className="text-xl text-smoke max-w-2xl mx-auto leading-relaxed">
            A deeper exploration of each element and how to apply them 
            to develop mastery in thinking through any problem.
          </p>
        </div>
      </section>

      {/* Elements Deep Dive */}
      <section className="pb-24 px-6">
        <div className="max-w-4xl mx-auto space-y-24">
          {elements.map((element, index) => (
            <div key={element.id} id={element.id} className="scroll-mt-32">
              {/* Element Header */}
              <div className="flex items-center gap-4 mb-8">
                <span className="text-5xl">{element.emoji}</span>
                <div>
                  <h2 className="font-display text-4xl text-black">
                    {element.name}
                  </h2>
                  <p className="text-lg text-change font-medium">
                    {element.title}
                  </p>
                </div>
              </div>

              {/* Tagline */}
              <p className="text-2xl text-ash mb-6 font-light italic">
                "{element.tagline}"
              </p>

              {/* Description */}
              <p className="text-lg text-smoke mb-10 leading-relaxed">
                {element.description}
              </p>

              {/* Principles */}
              <div className="mb-10">
                <h3 className="text-xs uppercase tracking-widest text-smoke mb-6">
                  Core Principles
                </h3>
                <div className="space-y-6">
                  {element.principles.map((principle, i) => (
                    <div key={i} className="border-l-2 border-change/30 pl-6">
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

              {/* Questions */}
              <div className="bg-mist/50 rounded-lg p-6">
                <h3 className="text-xs uppercase tracking-widest text-smoke mb-4">
                  Questions to Ask Yourself
                </h3>
                <ul className="space-y-3">
                  {element.questions.map((question, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <span className="text-change mt-1">?</span>
                      <span className="text-ash">{question}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Divider (except for last) */}
              {index < elements.length - 1 && (
                <div className="border-b border-mist mt-24" />
              )}
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 px-6 bg-mist">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="font-display text-3xl text-black mb-4">
            Ready to put them to work?
          </h2>
          <p className="text-smoke mb-8 max-w-lg mx-auto">
            Tell us what you want to be more effective at. We&apos;ll build the course.
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              as={Link}
              href="/workspace"
              className="bg-primary text-white font-medium px-8 hover:bg-primary/90"
              radius="none"
            >
              Start Your Course
            </Button>
            <Button
              as={Link}
              href="/framework"
              className="bg-transparent border border-smoke text-black px-8 hover:bg-white"
              radius="none"
            >
              Back to The Elements
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
