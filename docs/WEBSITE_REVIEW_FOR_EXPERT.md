# DramaRama Website Review — Current State & Request for Expert Feedback

## What DramaRama Is

DramaRama is a web application where users solve classic thinking puzzles through conversation with an AI. The AI doesn't give answers — it asks questions that push the user to think deeper. As users chat, a "scratch paper" document captures their evolving understanding of the puzzle.

The thinking framework is based on Edward B. Burger's *The 5 Elements of Effective Thinking* (Earth, Fire, Air, Water, Change). The AI invisibly applies these thinking lenses during conversation — the user never sees or needs to know about them.

**Target audience:** Curious people, students, lifelong learners. The puzzles are logic/lateral thinking puzzles (not trivia).

**Core value prop:** You don't just solve a puzzle — you watch your own thinking evolve in real time. The scratch paper shows you what you actually understand, not what you said.

---

## Page-by-Page Review

### 1. Homepage (`/`)

**Hero section:**
- Background image with text overlay
- Headline: *"Try a puzzle."* (italic, large display font)
- Subheadline: *"Think out loud. A conversation builds your understanding in real time."*
- CTA button: "Pick a Puzzle"

**"The Process" section (How it works):**
Three steps in a grid:
1. **"Pick a puzzle"** — "Classic thinking puzzles. Each one is trickier than it looks."
2. **"Think out loud"** — "Talk through it in a conversation. You'll be asked questions that push your thinking further."
3. **"See what you know"** — "A document captures your understanding as it builds. You might surprise yourself."

**Puzzle Preview section:**
- Shows 6 puzzle cards in a 3-column grid (2 active, 4 "coming soon")
- Clicking an active puzzle opens a modal with the full puzzle text and a "Start This Puzzle" button

**CTA section (dark background):**
- Headline: *"Pick a puzzle."*
- Subtext: *"It's free. It takes 15 minutes. You'll think differently after."*
- Button: "Start a Puzzle"

**Attribution:**
- *"The puzzles and thinking framework behind DramaRama are inspired by Edward B. Burger's The 5 Elements of Effective Thinking and Making Up Your Own Mind."*

**Issues with current verbiage:**
- "Try a puzzle. Think out loud." feels like instructions, not an invitation. There's no emotional hook or sense of fun/intrigue.
- "A conversation builds your understanding in real time" is descriptive but not compelling. It reads like a feature spec, not a reason to engage.
- The three-step process ("Pick a puzzle, Think out loud, See what you know") is clear but dry. It sounds like homework, not a game or experience.
- "See what you know" is vague. What does that even mean to a new visitor?
- Repeated "Pick a puzzle" across hero + CTA feels redundant.
- No sense of challenge, mystery, or delight. The landing page doesn't make anyone *want* to try it.

---

### 2. Puzzles Page (`/puzzles`)

**Header:**
- Mono label: "The Puzzles"
- Headline: *"Pick a puzzle."*
- Subtext: *"Classic thinking puzzles. Each one is trickier than it looks."*

**Content:**
- 6 puzzle cards in a 3-column grid (same as homepage)
- Active puzzles: "Who's Who?" (logic), "A Top 10 List" (logic)
- Inactive puzzles: "When Six Equals Eight" (geometry), "Three Switches, Two Rooms, and One Bulb" (lateral), plus 2 more — all show "coming soon"
- Clicking opens modal with full puzzle text + Start button

**Issues:**
- "Pick a puzzle." is repeated yet again. Same headline as homepage.
- "Classic thinking puzzles. Each one is trickier than it looks." — same text as step 01 on homepage. Feels recycled.
- No personality or intrigue. The page is functional but bland.
- No indication of difficulty, time required, or what makes each puzzle interesting.

---

### 3. Framework / About Page (`/framework`)

**Hero:**
- Mono label: "How It Works"
- Headline: *"The thinking behind DramaRama"*
- Subtext: *"DramaRama uses five ways of thinking to guide your conversation. You don't need to know any of this to use it — but if you're curious, here's how it works under the hood."*
- Attribution: *"Based on the work of Edward B. Burger — The 5 Elements of Effective Thinking and Making Up Your Own Mind."*

**Elements Grid:**
- 5 cards (Earth, Fire, Air, Water, Change) with emoji icons, titles, descriptions, and principles

**How It Works section:**
Three numbered steps:
1. "You describe your problem" — "Start with any challenge you're facing. No special format required—just explain what you're thinking about."
2. "The system selects the right element" — "Based on your conversation, DramaRama invisibly applies the most useful thinking lens at each moment."
3. "Understanding builds naturally" — "As you chat, insights are extracted and organized into your Deep Understanding Document—a living record of your thinking."

**Issues:**
- Step 1 says "You describe your problem" but users pick puzzles, not describe problems. This is inconsistent.
- "Deep Understanding Document" is jargon. Users see it as "scratch paper" now.
- The page is informative but reads like documentation, not like something that would excite a visitor.

---

### 4. My Sessions / Workspace Page (`/workspace`)

**Header:**
- Mono label: "My Sessions"
- Headline: *"Pick up where you left off."*
- Subtext: *"Resume an active session or start a new puzzle."*

**Content:**
- 3-column grid of session cards (matching puzzles page style)
- Each card shows: puzzle number, category, title, start date, "Resume" badge
- Empty state: "No active sessions." + "Pick a Puzzle" button

**Issues:**
- Minimal — this page is functional and clean. No major copy problems.

---

### 5. Profile Page (`/profile`)

**Content:**
- Left panel: user info, thinker archetype, element strength breakdown (bar chart), session stats (total sessions, completed, total prompts)
- Right panel: AI-generated avatar image with "Regenerate" option

**Issues:**
- "Thinker archetype" might be confusing for new users.
- The element breakdown (Earth/Fire/Air/Water bars) is meaningless to users who don't know the framework.
- Stats section is generic.

---

### 6. Elements Deep Dive Page (`/elements`)

Detailed breakdown of each of the 5 elements with principles, descriptions, and guiding questions. Linked from the Framework page.

**Issues:**
- Useful reference page but unlikely to attract casual visitors.
- Very text-heavy with no interactive elements.

---

## The Active Session Experience (not a separate page)

When a user starts a puzzle, they enter a full-screen "cinematic" experience:
- The puzzle text is displayed
- A text area lets them type thoughts
- "Deepen Understanding" submits their thoughts
- A "scratch paper" panel shows their evolving notes
- Hints can be requested (1 per deepen)
- Leave/End Session buttons in the top corners

This is the core product experience and is separate from the marketing pages above.

---

## Request for Expert Feedback

We need help making this website feel **fun, intriguing, and worth trying** — not like a homework assignment. Specific questions:

1. **Hero messaging:** The current "Try a puzzle. Think out loud." feels flat and instructional. How should we frame this to create intrigue and pull people in? What emotional hook would make a visitor think "I want to try this"?

2. **The three-step process:** "Pick a puzzle → Think out loud → See what you know" is accurate but boring. How can we reframe these steps to feel like an adventure or game rather than a workflow?

3. **Repeated copy:** "Pick a puzzle" appears as a headline on the hero, the CTA, AND the puzzles page. What alternatives would feel fresh while maintaining clarity?

4. **Value proposition:** We say "A conversation builds your understanding in real time" but that's a description of the mechanism, not a benefit. What would make someone care? What's the emotional payoff?

5. **Puzzle cards:** Currently just show title + first line of text + category. How could we make each puzzle feel more enticing? Should we add difficulty indicators, estimated time, a teaser/hook line?

6. **Overall tone:** The site currently feels academic and sterile. How do we make it feel like a place where smart people come to have fun — more "escape room" energy than "online course" energy?

7. **The "scratch paper" concept:** This is our most distinctive feature — you watch your own thinking crystallize in real time. How should we talk about this to non-users? It's hard to explain without experiencing it.

8. **Missing elements:** What's missing from the site that would help convert visitors into users? Social proof? A demo video? A sample puzzle interaction? Something else?

9. **The framework page:** Should we lead with the academic framework, or hide it? Does knowing about "5 Elements of Effective Thinking" help or hurt the casual visitor's first impression?

10. **Name and branding:** The name "DramaRama" doesn't immediately communicate what the product does. Is that a problem, or does the mystery work in our favor?
