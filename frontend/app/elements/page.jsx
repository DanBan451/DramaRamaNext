"use client";

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@nextui-org/button";
import { motion } from "framer-motion";
import Footer from "@/components/Footer";

const elements = [
  {
    id: "earth",
    emoji: "🌳",
    name: "Earth",
    title: "Understand Deeply",
    color: "earth",
    description: `If you ask someone a "Do you understand?" question, you will most often receive one of two responses: "Yes" or "No," neither of which is correct. Understanding is a spectrum rather than a binary proposition—and wherever you are in your current understanding, you can, with intentionality, understand more deeply. This reality, which offers a fine working definition of formal education, is perhaps one of the greatest triumphs of the human spirit: Intellectually, we can intentionally always delve deeper. Taking the time just to embrace this mindset can be truly transformational.\n\nNo matter the circumstance, assuredly assert to yourself that you do not fully understand the issue at hand. That assertion will automatically place you in a different mindset. If you assume ignorance, you will be open to discovering gaps in your understanding. Motivate yourself by reacting to the declarative prompt, "There are aspects of this issue I don't understand. I now must uncover them and work toward making greater meaning." Intentionally understanding more deeply, and thus seeing an issue in a different way, is a daunting challenge. Here are three practical ways to tickle the mind and provoke effective thought.`,
    quote: "Intellectually, we can intentionally always delve deeper.",
    subElements: [
      {
        version: "1.0",
        name: "Start with the Simple",
        description:
          "Understanding simple things in unusual depth is an oft-overlooked but powerful way to see greater nuance within the complex. When facing a serious challenge, start with a basic or even trivial version of it, in which you have a firm intellectual foothold. Now probe that simple scenario more deeply to see the detail and structure that always lies beneath the surface. Once you expose that complexity in the simple, you will see the original challenging case with greater clarity. But this suggestion is a challenge. It is difficult to stop and focus on that which you already believe is obvious and invest time to see that trivial state in a different way. This prompt generates incremental progress—by starting with the basics and practicing the patience required to probe that easy circumstance with exceptional depth, you take an important, mindful step toward understanding the original, multifaceted issue more deeply.\n\nStart with the simple and use it to divide and conquer the complex.",
        prompt: "What are the fundamentals of this problem that you'd need to ground yourself in before using AI? What context is essential?",
        example:
          "Before building an AI research assistant, understand what 'good research' looks like manually. What sources matter? What counts as evidence?",
      },
      {
        version: "2.0",
        name: "Spotlight the Specific",
        description:
          "Often warming up with a special case or specific example is a strategic way to gain some new insight that can then be extended to the general situation. Look at an issue from the micro-level with the goal of seeing some hidden structure or pattern that persists at the macro-level. When considering a special case, reframe any particular structure discovered in that example to expose some general principle hidden in the original issue. It is only within that recasting that important insights are created.",
        prompt:
          "Create a simpler, concrete version of this scenario. What would a minimal example look like?",
        example:
          "Instead of summarizing 100 legal documents, start with just 3. What does the AI get right? What does it miss?",
      },
      {
        version: "3.0",
        name: "Add the Adjective",
        description:
          "To understand anything in greater detail, challenge yourself to add as many descriptors as possible, and take the time to consider each adjective and draw some new insight into the issue at hand. Do not leave an adjective for another descriptor until some new facet is revealed.\n\nBy adding an ever-growing list of descriptors, you can uncover hidden confusion or misunderstanding, and, if the situation involves multiple perspectives, you can also realize greater empathy.",
        prompt:
          "Add a descriptor to your approach. Is it iterative? Exploratory? Defensive? How does that lens change how you'd tackle this with AI?",
        example:
          'This is an "iterative refinement" problem. I\'m not just prompting once, I\'m building a multi-step pipeline.',

      },
    ],
  },
  {
    id: "fire",
    emoji: "🔥",
    name: "Fire",
    title: "Fail Effectively",
    color: "fire",
    description: `Despite societal pressures and short-sighted norms, failing effectively is one of the most important pathways to deeper understanding as well as discovering new knowledge. Jumping over the cultural hurdle that "failing is bad" empowers you with an easy step forward. You might not always know how to do something correctly, but you can certainly always do it wrong; and in doing so, you can then fail effectively: Focus on that failed attempt and use that small misstep as a giant leap toward a deeper understanding and an inevitable resolution of the original issue.\n\nFailing is not the final destination. Rather, effective failing is an important—often requisite—intermediate (mis-)step. If you consider yourself on a chessboard, then failure is a square you land upon with the sole purpose of moving off in a direction that would not have been possible without that intermediate move.\n\nHowever, failure becomes effective only when that mistake or failed attempt is not dismissed until you gain some new insight into the issue at hand. There is no greater teacher than one's own mistakes. But to learn effectively from that brilliant teacher, one must doggedly stay with that failed attempt until a new lesson is realized.`,
    quote: "There is no greater teacher than one's own mistakes.",
    subElements: [
      {
        version: "1.0",
        name: "Fail Fast",
        description:
          "Free yourself from a focus on perfection and instead focus on process. Thus, fail quickly and cheerfully: Whatever the task at hand, try doing it quickly and lousily. If authoring a document, do not stare at a blank screen; instead, write a miserable draft by letting your stream of consciousness flow. Now, instead of a blank screen, you have something to which to respond: your first, crummy draft. Respond to it: Find the hidden gems as well as uncover ambiguity and lack of clarity in your own mind about the issue. Revision and editing are writers' ways of effectively responding to earlier, requisite failed drafts. So get that first failed effort out of the way as quickly as possible and then start revising, rethinking, and learning from what you first created.\n\nAgain, an epiphany needs to arise from that initial effort for it to be truly effective.",
        prompt: "Try something — even if it's wrong. What's your rough first attempt at solving this with AI?",
        example:
          "Just dump all the data into ChatGPT and ask for an answer. It's crude but now you can see what's missing.",
      },
      {
        version: "2.0",
        name: "Fail Again",
        description: `The comedian Steven Wright once said, "If at first you don't succeed, then skydiving definitely isn't for you." How true; but not succeeding offers a brilliant parachute that safely carries you to new discoveries. Suppose someone gives us a great challenge and we go off and try to resolve it and, it turns out, we fail. Ordinarily we feel discouraged. However, suppose instead that as this someone presents us with that great challenge, she also informs us that to realize success at this enormous task it is required that we first fail ten times. With this new information, our mindset changes when we make that initial failed attempt. We now think, "One down, nine to go; we've made progress." But, as always, the progress comes only after the error: when you take the time to analyze that failed effort and let it carry you to a new insight. So, embrace this need to make ten initial mistakes. With ten failed attempts at your disposal, be open to being wrong and doubt those aspects of which you are certain—see where you are led and what, if anything, breaks down.`,
        prompt: "What went wrong with that attempt? Where did the AI approach break down?",
        example:
          "The AI hallucinated case citations. What if I added a verification step? A retrieval layer could ground the output.",
      },
      {
        version: "3.0",
        name: "Fail Intentionally",
        description:
          "Every failed attempt is an invitation to understand the situation more deeply by exploring why that effort did not work. Following this line of reasoning to its logical extreme, if you want to understand more deeply, you should intentionally fail to generate that epiphany or new perspective. Therefore, consider extreme cases and remove all real constraints to create completely impractical thoughts and solutions. With those wild ideas in mind, now see how they can be tamed or shaped into clever practical solutions that would never have been found without that initial, impractical, failed attempt. Determine the precise breakpoint where things went wrong. Study that breakpoint as well as what around it has promise—they might lead to a novel insight. More generally, start with any wrong approach or answer and then force yourself to delve into that error until you see some aspect of the original challenge amplified in a new light.",
        prompt:
          "What's an extreme or impossible AI approach? What does that failure teach you about the right approach?",
        example:
          "What if the AI had to process 10 million documents? What if there was zero training data? What breaks first?",
      },
    ],
  },
  {
    id: "air",
    emoji: "💨",
    name: "Air",
    title: "Create Questions",
    color: "air",
    description: `The most straightforward way to probe more deeply is to create questions. Creating questions—even if those questions are not asked—moves us from being a passive bystander to an active participant in our life's journey.\n\nEmbracing a dynamic mindset of always generating questions will lead to deeper understanding. And you should demand this point of view from yourself as well as from those with whom you surround yourself. Never ask a group, "Are there any questions?" for you should have the expectation that everyone is truly engaged. Instead, offer the prompt, "What are your questions?" Prompting yourself in this same way will not only amplify your innate curiosity, but will also lead you to new discoveries.`,
    quote: "Creating questions moves us from being a passive bystander to an active participant in our life's journey.",
    subElements: [
      {
        version: "1.0",
        name: "Be Your Own Socrates",
        description: `Asking meta-questions throughout any thoughtful process will always shine a light onto the big picture and often force you to focus on the right challenge. Asking, "What is the real issue here?" opens your mind to the possibility that you are considering the wrong question or problem. For example, instead of trying to fix the frustrating traffic congestion on your commute to work, you might wonder how you could make that lengthy travel time less frustrating or more productive. Asking, "What if…?" can refocus your thinking as you consider alternatives. Be open minded and ask big questions to discover the big picture.`,
        prompt:
          "What is the REAL question here? Are you even approaching the right problem with AI?",
        example:
          "The real question isn't 'how do I summarize this?'—it's 'what does the user actually need to decide?'",
      },
      {
        version: "2.0",
        name: "Create Basic Questions",
        description: `Ask fundamental questions to make fundamental breakthroughs. Even wondering, "What does the simplest case look like?" and "What happens in that trivial situation?" are powerful ways of probing into the original, subtler scenario.`,
        prompt:
          "What fundamental concept about this domain or these AI tools are you missing?",
        example:
          "What does 'accuracy' even mean here? Is 90% good enough? What's the cost of a wrong answer?",
      },
      {
        version: "3.0",
        name: "Ask Something Else",
        description: `Whether you are stuck or not, considering something else not only resets your thinking, but also allows you to refocus on the issue in an entirely original way. Asking, "What's a different but related question?" or "What's the opposite point of view?" will allow you to consider the issue from a diversity of perspectives and can generate a diversity of new insights and ideas.`,
        prompt: "What related problem might give you insight into this one? Is there an adjacent question worth exploring?",
        example:
          "How do medical diagnosis systems handle uncertainty? Could that approach work for legal document review?",
      },
    ],
  },
  {
    id: "water",
    emoji: "🌊",
    name: "Water",
    title: "Go with the Flow of Ideas",
    color: "water",
    description: `When someone has a new idea, it is often cause for celebration. Although any excuse to celebrate should be welcomed, in truth, the birth of an idea is always a beginning and never an ending. It is only after a new insight or idea is realized that the real creative heavy lifting begins by asking: What comes next? By considering how to connect a new idea to something else, by generalizing it to a larger context or by applying it to an unrelated situation, we are engineering our own creativity and not only provoking thought, but also provoking innovation. However, taking a cutting-edge idea and imagining what comes next is never easy.\n\nChallenge yourself to let every new idea you encounter inspire the fresh, childlike response: "What is next? How can I repurpose, extend, or otherwise generalize or reapply this new notion?" Go with the flow.`,
    quote: "The birth of an idea is always a beginning and never an ending.",
    subElements: [
      {
        version: "1.0",
        name: "Run Down All Paths",
        description:
          "Whenever you are able, consider all possible cases, even the obviously impossible ones. Follow the flow of each scenario to its very end. Most, if not all but one, will lead to dead ends. But then learn from those failed attempts and apply that new knowledge as you travel down yet another possibility to its ultimate conclusion.\n\nWhenever there are only a few potential outcomes, considering them all and discovering why most cannot happen will allow you to discover what must, in fact, unfold.",
        prompt: "What are ALL the possible approaches to solving this with AI? Map out every path.",
        example:
          "Fine-tuning, RAG, prompt chaining, agent workflows, human-in-the-loop. List them all, then compare.",
      },
      {
        version: "2.0",
        name: "Embrace Doubt",
        description: `Challenge your own narrow thinking and opinions to see where that flow takes you. Embracing a diversity of points of view empowers you to see the multifaceted nature of complex things. In fact, empathy often allows you to see a situation in a totally different light and offers a perspective you would have never seen otherwise. Thus, consider the opposite side or alternative situation; contemplate the counterintuitive. Look at an issue from all angles. Remember that empathy and sympathy are not the same. You can empathize with another point of view without sympathizing with that side. Embrace doubt as a strength. Wonder, "What if I'm wrong?" and let your mind flow over the reasoned consequences of that supposition and see where you are led. Remember that the opposite of doubt is not certainty, but rather closed-mindedness. Always be open minded.`,
        prompt: "What are you uncertain about? Where might your AI approach be wrong?",
        example:
          "I'm uncertain about bias in the training data. What if the model performs differently across demographics?",
      },
      {
        version: "3.0",
        name: "Never Stop",
        description:
          "As with all of these elements of effective thinking, following the flow of an idea requires persistence and tenacity to see where that flow will carry you. Do not let go of an idea until it takes you somewhere new, unexpected, or to an insight into something otherwise unrelated. Every new idea is a beginning, not an ending.\n\nThus, never stop the flow of your ideas.",
        prompt: "Follow your best approach to its conclusion. Where does it lead? What's the next step after that?",
        example:
          "After building the summarizer: add citation checking, then feedback loops, then user personalization. This is a foundation.",
      },
    ],
  },
  {
    id: "change",
    emoji: "🪨",
    name: "Change",
    title: "Be Open to Change",
    color: "change",
    description:
      "Applying these elements of effective thinking through these suggested prompts is not easy. Only over time will these habits of mind become practices of mind. That transition captures the quintessential element of education as well as thinking: that of change. We look at the world of ideas, nature, each other, and ourselves differently when we look at them through the different lens of effective thinking. Meaningful education is built on the reality that we are truly capable of change—not the change that reprograms us into people we are not, but that rather, over time, steadily makes us into better versions of ourselves.\n\nChange is scary and sometimes threatens us on an existential level. The change encouraged here is ongoing, gradual, and evolutionary rather than sudden or disruptive. Small and incremental changes will transform how we think and engage with the world, but that journey unfolds over time—and although we cannot rush it, we can foster it. In fact, a healthy and natural state of being is one that is in continual flux. We should be ever changing, and our education should promote mindsets that support this dynamic perspective—one that encourages wise and creative thought with the openness to learn, grow, and change so that deeper understanding is realized and new discoveries are made.",
    quote: "Small and incremental changes will transform how we think and engage with the world.",
    subElements: [
      {
        version: "∞",
        name: "Transform",
        description:
          "As you mindfully engage with the puzzles ahead, be conscious of how, through effective thinking practices, the puzzles themselves change: The way you first saw them in your mind will be different from how you will see them after you have challenged yourself to understand them more deeply. The ultimate goal is to change how you think about puzzles, not only those from this book, but those arising throughout your life.",
        prompt: "How has thinking through this puzzle changed how you'd approach AI-assisted work?",
        example:
          "I now see that the real skill isn't prompting—it's designing the right pipeline. This insight applies to every AI project.",
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
      <section className="pt-32 pb-20 px-6 bg-gradient-to-b from-mist/30 to-white">
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
      <section className="px-6 pb-24">
        <div className="max-w-[1536px] mx-auto">
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
                    <div className="text-lg text-smoke space-y-4">
                      {element.description.split("\n\n").map((para, i) => (
                        <p key={i}>{para}</p>
                      ))}
                    </div>
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

                      <div className="text-ash mb-6 space-y-3">
                        {sub.description.split("\n\n").map((para, i) => (
                          <p key={i}>{para}</p>
                        ))}
                      </div>

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

      {/* CTA - Matches homepage "Ready to transform" section */}
      <section
        className="py-32 px-6 relative"
        style={{
          backgroundImage: 'url("/images/background-daniel.png")',
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="absolute inset-0 bg-black/80" />
        <div className="relative z-10 max-w-[1536px] mx-auto text-center">
          <h2 className="font-display text-4xl lp:text-6xl text-white mb-6">
            Ready to transform how you think?
          </h2>
          <p className="text-xl text-white/70 max-w-[600px] mx-auto mb-10">
            Join the mental gym. Stop rushing through AI tasks. Start thinking deeply about them.
          </p>
          <div className="flex flex-col tb:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button className="bg-white text-black hover:bg-mist w-full tb:w-[260px] h-[72px] text-lg rounded-none font-semibold">
                Create Free Account
              </Button>
            </Link>
            <Link href="/">
              <Button className="bg-transparent border-2 border-white text-white hover:bg-white hover:text-black w-full tb:w-[260px] h-[72px] text-lg rounded-none font-semibold">
                Back to Home
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

