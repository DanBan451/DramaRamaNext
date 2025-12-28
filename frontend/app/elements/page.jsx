"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { motion } from "framer-motion";

const elements = [
  {
    id: "earth",
    emoji: "🌳",
    name: "Earth",
    title: "Deep Understanding",
    color: "earth",
    description:
      "Understanding is not a binary proposition but a spectrum. Wherever you are, you can always push yourself to understand deeper. Earth is about getting grounded in the fundamentals before tackling complexity.",
    quote: "True masters in any craft are those that have mastered the fundamentals.",
    subElements: [
      {
        version: "1.0",
        name: "Start with Simple",
        description:
          "By mastering the basics, you will naturally begin to understand the complexities. When facing a challenge, avoid it and probe a simpler problem in which you are grounded.",
        prompt: "What are the absolute basics of this problem? Break it down to its simplest form.",
        example:
          "Instead of solving the full Rubik's cube, first master getting one side complete. Time yourself. Beat your record. The rest will follow.",
      },
      {
        version: "2.0",
        name: "Spotlight the Specific",
        description:
          "Create a special case or specific example, probe it, and then recast whatever findings to the larger problem. The example needs to be simpler than the original problem.",
        prompt:
          "Create a specific, simple example. What does the problem look like with concrete numbers?",
        example:
          "For Two Sum, use [2, 7, 11, 15] with target 9. Trace through it by hand. See the pattern emerge.",
      },
      {
        version: "3.0",
        name: "Add the Adjective",
        description:
          "If you want to understand anything more deeply, add an adjective (or descriptor). Don't leave for another descriptor until an insight is revealed.",
        prompt:
          "Add an adjective. How would you describe this problem to a colleague? What makes it unique?",
        example:
          'This is a "complementary pair" problem. I\'m not just searching, I\'m searching for a VALUE\'S COMPLEMENT.',
      },
    ],
  },
  {
    id: "fire",
    emoji: "🔥",
    name: "Fire",
    title: "Embrace Failure",
    color: "fire",
    description:
      "While we may not always know how to do something right, we certainly know how to do it wrong. Failing is the best teacher where we must hold onto each failed attempt as a precious joule until some new insight is realized.",
    quote: "When we care about failing we actually hinder our minds from being creative.",
    subElements: [
      {
        version: "1.0",
        name: "Fail Fast",
        description:
          "Never stare at a blank screen. Write a rough draft—now you have something to respond to. There is a flow that happens when we don't worry about failure which produces both junk & gems.",
        prompt: "Fail fast. Write a rough solution even if it's wrong. What's your first instinct?",
        example:
          "Brute force it. Two nested loops. O(n²). It's ugly but it works. Now you have something to improve.",
      },
      {
        version: "2.0",
        name: "Fail Again",
        description:
          "Imagine you're told you MUST fail 10 times to succeed. Now failure is progress! Be persistent and appreciative of failure. Actively pursue it rather than waiting for it to occur.",
        prompt: "Fail again. What went wrong with your first approach? How can you improve it?",
        example:
          "The nested loop checks pairs multiple times. What if I remembered what I've seen? Hash map turns O(n²) into O(n).",
      },
      {
        version: "3.0",
        name: "Fail Intentionally",
        description:
          "Create completely unrealistic scenarios. This allows thinking outside the box. Then try taming it by analyzing the exact break-point and what may have promise.",
        prompt:
          "Fail intentionally. What's an extreme or impossible scenario? What breaks your solution?",
        example:
          "What if every number is the same? What if the array is empty? What if there's no solution? Find the edge cases.",
      },
    ],
  },
  {
    id: "air",
    emoji: "💨",
    name: "Air",
    title: "Create Questions",
    color: "air",
    description:
      "The most straightforward approach into probing a puzzle. This is NOT the act of asking a question but rather the art of continuously creating them. Force yourself to NOT be a passive observer.",
    quote: "None of the elements are valuable without Air—if there is no internal curiosity then no insights are created.",
    subElements: [
      {
        version: "1.0",
        name: "Be Your Own Socrates",
        description:
          "Ask the meta-questions, like WHY. A meta-question asks about the big picture structure or objective. It pushes us to ask, 'Are we considering the right question?'",
        prompt:
          "Be your own Socrates. What is the REAL question here? Are you solving the right problem?",
        example:
          "The real question isn't 'find two numbers'—it's 'given a number, can I instantly know if its complement exists?'",
      },
      {
        version: "2.0",
        name: "Ask Basic Questions",
        description:
          "If the puzzle requires fundamental knowledge you lack, ask fundamental questions for fundamental breakthroughs.",
        prompt:
          "Ask a basic question. What fundamental concept are you missing or taking for granted?",
        example:
          "Why does hash map give O(1) lookup? How does hashing work? What are the tradeoffs of space vs time?",
      },
      {
        version: "3.0",
        name: "Ask Another Question",
        description:
          "To refresh your thinking, ask a related question. It may direct your mind to provoke an insight around the original question.",
        prompt: "Ask another question. What related question might give you insight into this one?",
        example:
          "What if I needed THREE numbers that sum to target? How does 3Sum build on Two Sum?",
      },
    ],
  },
  {
    id: "water",
    emoji: "🌊",
    name: "Water",
    title: "Flow of Ideas",
    color: "water",
    description:
      "Each idea was derived from a prior idea and will transcend into a new idea. We must approach learning knowing that topics are deeply interconnected, not standalone and unrelated.",
    quote: "The birth of a new idea is just the beginning—the real heavy-lifting comes from asking 'What's next?'",
    subElements: [
      {
        version: "1.0",
        name: "Run Down All Paths",
        description:
          "Stick with one idea until it becomes obvious that it is a dead-end. Then go down another path. At each dead-end, ask WHY it is a dead-end.",
        prompt: "Run down all paths. What are ALL the possible approaches? Don't dismiss any yet.",
        example:
          "Brute force, sort + two pointers, hash map, binary search on sorted. List them all, then compare.",
      },
      {
        version: "2.0",
        name: "Embrace Doubt",
        description:
          "Empathy and sympathy are not the same. Consider alternative perspectives. Never be 100% sure about anything. Be open to being wrong.",
        prompt: "Embrace doubt. What are you uncertain about? Where might you be wrong?",
        example:
          "I'm uncertain about edge cases: empty array? Single element? Negative numbers? What am I missing?",
      },
      {
        version: "3.0",
        name: "Never Stop",
        description:
          "Always strive to see an idea flow to the very end. When you get a new idea, don't just celebrate—ask 'What's next?'",
        prompt: "Never stop. Where does this idea lead? What's the next step after solving this?",
        example:
          "After Two Sum: 3Sum, 4Sum, kSum. Two Sum variations: sorted array, BST, data structure design. This is a foundation.",
      },
    ],
  },
  {
    id: "change",
    emoji: "🪨",
    name: "Change",
    title: "The Quintessential",
    color: "change",
    description:
      "When we challenge ourselves to apply the first four elements, the puzzles themselves begin to change! This is the element that each element points to—the cornerstone of Education.",
    quote: "Life is a series of puzzles that we mistakenly try to solve. We should not try to solve them but rather think through them.",
    subElements: [
      {
        version: "∞",
        name: "Transform",
        description:
          "By applying ourselves to the struggle of smaller puzzles—practicing the four elements through them—we start to notice that our brain itself begins to change.",
        prompt: "How has this problem changed your understanding? What do you see now that you didn't before?",
        example:
          "I now see that Two Sum isn't about finding pairs—it's about instant lookup. This insight applies to countless other problems.",
      },
    ],
  },
];

const colorClasses = {
  earth: {
    bg: "bg-earth",
    bgLight: "bg-earth/10",
    text: "text-earth",
    border: "border-earth",
    gradient: "from-earth/20 to-earth/5",
  },
  fire: {
    bg: "bg-fire",
    bgLight: "bg-fire/10",
    text: "text-fire",
    border: "border-fire",
    gradient: "from-fire/20 to-fire/5",
  },
  air: {
    bg: "bg-air",
    bgLight: "bg-air/10",
    text: "text-air",
    border: "border-air",
    gradient: "from-air/20 to-air/5",
  },
  water: {
    bg: "bg-water",
    bgLight: "bg-water/10",
    text: "text-water",
    border: "border-water",
    gradient: "from-water/20 to-water/5",
  },
  change: {
    bg: "bg-change",
    bgLight: "bg-change/10",
    text: "text-change",
    border: "border-change",
    gradient: "from-change/20 to-change/5",
  },
};

export default function ElementsPage() {
  const [activeElement, setActiveElement] = useState(null);

  return (
    <div className="min-h-screen bg-white">
      {/* Hero */}
      <section className="pt-32 pb-20 px-6 lp:px-20 bg-gradient-to-b from-mist/30 to-white">
        <div className="max-w-[1000px] mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <span className="text-sm font-mono text-smoke uppercase tracking-widest mb-4 block">
              The Framework
            </span>
            <h1 className="font-display text-5xl lp:text-6xl text-black mb-6">
              5 Elements of
              <br />
              <span className="italic">Effective Thinking</span>
            </h1>
            <p className="text-xl text-ash max-w-[600px] mx-auto mb-12">
              Each element provides a different lens to see the structure of any puzzle.
              Together, they create change.
            </p>

            {/* Element Navigation */}
            <div className="flex justify-center gap-4 flex-wrap">
              {elements.map((element) => (
                <a
                  key={element.id}
                  href={`#${element.id}`}
                  className={`w-16 h-16 rounded-xl flex items-center justify-center text-3xl transition-all hover:scale-110 ${
                    colorClasses[element.color].bgLight
                  }`}
                >
                  {element.emoji}
                </a>
              ))}
            </div>
          </motion.div>
        </div>
      </section>

      {/* Elements Detail */}
      <section className="px-6 lp:px-20 pb-24">
        <div className="max-w-[1000px] mx-auto">
          {elements.map((element, index) => (
            <div
              key={element.id}
              id={element.id}
              className="py-20 border-b border-mist last:border-b-0"
            >
              <motion.div
                initial={{ opacity: 0, y: 40 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                viewport={{ once: true, margin: "-100px" }}
              >
                {/* Element Header */}
                <div className="flex items-start gap-6 mb-12">
                  <div
                    className={`w-24 h-24 rounded-2xl flex items-center justify-center text-5xl ${
                      colorClasses[element.color].bgLight
                    }`}
                  >
                    {element.emoji}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h2 className={`font-display text-4xl ${colorClasses[element.color].text}`}>
                        {element.name}
                      </h2>
                      <span className="text-2xl text-smoke">—</span>
                      <span className="text-2xl text-ash">{element.title}</span>
                    </div>
                    <p className="text-lg text-smoke max-w-[600px]">{element.description}</p>
                  </div>
                </div>

                {/* Quote */}
                <div
                  className={`bg-gradient-to-br ${colorClasses[element.color].gradient} rounded-xl p-6 mb-12 border-l-4 ${colorClasses[element.color].border}`}
                >
                  <p className="text-lg italic text-ash">"{element.quote}"</p>
                </div>

                {/* Sub-elements */}
                <div className="space-y-8">
                  {element.subElements.map((sub, subIndex) => (
                    <div
                      key={subIndex}
                      className="bg-white border border-mist rounded-xl p-6 hover:shadow-lg transition-shadow"
                    >
                      <div className="flex items-center gap-3 mb-4">
                        <span
                          className={`font-mono text-sm px-3 py-1 rounded ${
                            colorClasses[element.color].bgLight
                          } ${colorClasses[element.color].text}`}
                        >
                          {element.id.toUpperCase()} {sub.version}
                        </span>
                        <h3 className="font-display text-xl text-black">{sub.name}</h3>
                      </div>

                      <p className="text-ash mb-6">{sub.description}</p>

                      <div className="grid tb:grid-cols-2 gap-4">
                        <div className="bg-mist/30 rounded-lg p-4">
                          <div className="text-xs font-mono text-smoke uppercase tracking-wider mb-2">
                            Prompt
                          </div>
                          <p className="text-black font-medium">{sub.prompt}</p>
                        </div>
                        <div className={`${colorClasses[element.color].bgLight} rounded-lg p-4`}>
                          <div className="text-xs font-mono text-smoke uppercase tracking-wider mb-2">
                            Example
                          </div>
                          <p className="text-ash">{sub.example}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6 lp:px-20 bg-black text-white">
        <div className="max-w-[800px] mx-auto text-center">
          <h2 className="font-display text-4xl mb-6">Ready to apply the Elements?</h2>
          <p className="text-white/70 text-lg mb-8">
            Install our browser extension and start training your mind on real algorithms.
          </p>
          <div className="flex flex-col tb:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-mist px-8 py-6 text-lg" radius="none">
                Get Started Free
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button
                className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black px-8 py-6 text-lg"
                radius="none"
              >
                View Dashboard Demo
              </Button>
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}

