# Expert Prompt: Redesigning the Nudge System

## Context for the Expert

We're building DramaRama — a web app where users solve classic thinking puzzles (logic, lateral, geometry) through conversation with an AI. The user types their thoughts, the AI responds with a short coaching question, and a "scratch paper" document captures the user's evolving understanding in real time.

The thinking framework is based on Edward B. Burger's *The 5 Elements of Effective Thinking*:
- **Earth** — understand deeply, ground in fundamentals
- **Fire** — fail effectively, try things and learn from mistakes
- **Air** — create questions, challenge assumptions
- **Water** — flow with ideas, follow threads, see connections
- **Change** — reflect on how thinking has shifted

The AI invisibly picks which element to apply at each moment. The user never sees or thinks about elements.

---

## The Feature: "Nudge"

During a puzzle session, the user can request a **nudge** (previously called "hint"). This is a separate button from the main "Deepen Understanding" flow.

### Current Implementation (the problem)

Right now, when the user clicks "Nudge," the frontend sends the literal text `"(Please give me a hint)"` to the same chat endpoint that handles the user's regular thoughts. The backend prompt is:

```
You are helping someone think through a puzzle...
USER'S LATEST MESSAGE: (Please give me a hint)
```

This means:
1. The AI treats it like any other user message
2. It often gives a hint **toward the puzzle answer** — which is NOT what we want
3. It doesn't look at *where the user currently is in their thinking*
4. It doesn't build on the understanding document

### What the Nudge Should Be

The nudge is **not a hint toward the answer**. It's a push to help the user **continue their current train of thought** and develop deeper understanding.

**Core principles:**
- The nudge should be based on the **understanding document** (the user's scratch paper)
- It should help the user keep going in the **direction they're already exploring**
- If they're on an Earth-oriented track (exploring fundamentals), nudge them deeper into that
- If they're following a Water-like flow (connecting ideas), help them keep connecting
- The goal is **deeper understanding of the puzzle's structure**, not getting to the answer
- The answer will come naturally as understanding deepens — we don't need to point toward it

**Example scenario:**
- Puzzle: "Who's Who?" (two students, one math major, one philosophy major, at least one is lying)
- User's scratch paper says: "At least one is lying.\nIf black-hair tells truth → he's math major."
- User clicks Nudge
- **BAD nudge:** "What happens if black-hair is lying?" ← This points toward the answer
- **GOOD nudge:** "You started a chain of reasoning from black-hair telling the truth. What would the full chain look like if you followed it to the end?" ← This encourages them to keep going down their own path

**Another example:**
- Puzzle: "A Top 10 List" (10 self-referential statements about how many are false)
- Scratch paper says: "Statement 1 says exactly one is false.\nIf statement 1 is true, then only statement 1's claim holds.\nBut that means 9 are true... and only 1 is false."
- **BAD nudge:** "Try thinking about statement 9 instead" ← redirecting toward answer
- **GOOD nudge:** "You're testing what happens when statement 1 is true. Does the conclusion hold up? What breaks?" ← pushing them to finish their own thread

---

## Current System Architecture

### The Understanding Document (scratch paper)

This is a plain-text document that gets updated with every interaction. It captures the user's current reasoning in short, direct notes — like jotting on a napkin. Example:

```
At least one student is lying.
If black-hair is telling truth → he's the math major.
Then red-hair saying 'I'm philosophy' would also be true → nobody is lying → contradicts the premise.
So black-hair must be lying about being a math major.
Math major has red hair.
```

Rules: no person references, no evaluation, no advice. Just raw reasoning the user has expressed.

### The Chat Prompt

The main chat endpoint uses a batched prompt that returns `{element, response, understanding}`. The "element" field tells which thinking lens to apply. The "response" is a short coaching question (10-25 words). The "understanding" is the updated scratch paper.

### The Element System

Each response is tagged with one of 5 elements. The element is chosen based on what the user needs:
- **Earth:** they're missing fundamentals, need to simplify
- **Fire:** they're stuck, need to try something
- **Air:** they need to question assumptions
- **Water:** they need to follow an idea further, see connections
- **Change:** their thinking has shifted, time to reflect

---

## Questions for the Expert

1. **Prompt design:** How should we structure the nudge prompt so the AI uses the understanding document as its primary input (not just the last user message)? Should the nudge prompt be a completely separate prompt from the main chat prompt, or a variation of it?

2. **Element awareness:** Should the nudge be explicitly tied to the element the user is currently working in (e.g., if their recent thinking has been Earth-oriented, nudge them deeper into Earth)? Or should the nudge be element-agnostic?

3. **Nudge tone and format:** The main chat response is "a curious friend asking the next question" (10-25 words). Should the nudge be similar, or should it feel different? Longer? More specific? A statement instead of a question?

4. **Anti-patterns:** What specific instructions should we include to prevent the AI from:
   - Pointing toward the puzzle answer
   - Introducing new information the user hasn't discovered
   - Redirecting the user away from a productive path
   - Being too vague to be useful

5. **Edge cases:**
   - What if the understanding document is empty (user hasn't typed anything meaningful yet)?
   - What if the user is genuinely stuck and their scratch paper hasn't changed in several exchanges?
   - What if the user's current path is a dead end — should the nudge still encourage them down that path, or gently suggest re-examining?

6. **Understanding document interaction:** Should the nudge also update the understanding document, or should it be a read-only operation that just uses the document as context?

7. **Separation from main flow:** Currently the nudge goes through the same `/chat` endpoint as the user's "Deepen Understanding" submissions. Should we create a dedicated `/nudge` endpoint with its own prompt, or keep it unified?

8. **Success criteria:** How do we know a nudge is good? What would a rubric look like for evaluating nudge quality?
