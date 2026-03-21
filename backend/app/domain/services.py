"""
Domain Services - Business logic
"""
from typing import List, Dict
import re
from app.domain.entities import Response, Element, PROMPTS


def _tokenize(text: str) -> list[str]:
    return [t for t in re.split(r"\s+", (text or "").strip()) if t]


def assess_response_quality(text: str) -> Dict:
    """
    Heuristic quality check to prevent the LLM from "hallucinating" strengths
    from placeholder / nonsense responses.

    This is intentionally conservative: it only flags obviously low-signal content.
    """
    raw = (text or "").strip()
    tokens = _tokenize(raw)
    wc = len(tokens)
    if wc == 0:
        return {"word_count": 0, "low_signal": True, "reasons": ["empty"]}

    normalized = [re.sub(r"[^\w]", "", t.lower()) for t in tokens]
    normalized = [t for t in normalized if t]
    if not normalized:
        return {"word_count": wc, "low_signal": True, "reasons": ["no_words"]}

    unique_ratio = len(set(normalized)) / max(1, len(normalized))
    longest_run = 1
    run = 1
    for i in range(1, len(normalized)):
        if normalized[i] == normalized[i - 1]:
            run += 1
            longest_run = max(longest_run, run)
        else:
            run = 1
    repetition_run_ratio = longest_run / max(1, len(normalized))

    # Character-level alpha ratio: "aaaa !!!" tends to be mostly non-word or very repetitive.
    letters = sum(1 for c in raw if c.isalpha())
    alnum = sum(1 for c in raw if c.isalnum())
    alpha_ratio = letters / max(1, alnum)

    reasons: list[str] = []

    # Too little information (even if non-empty)
    if wc < 10:
        reasons.append("too_short")

    # Extremely repetitive content (e.g., "a a a a a ..." or same word pasted)
    if unique_ratio < 0.25 or repetition_run_ratio > 0.4:
        reasons.append("repetitive")

    # Looks like non-language / placeholder noise (very low alpha ratio)
    if alpha_ratio < 0.35:
        reasons.append("non_language")

    low_signal = len(reasons) > 0
    return {
        "word_count": wc,
        "unique_ratio": round(unique_ratio, 3),
        "repetition_run_ratio": round(repetition_run_ratio, 3),
        "alpha_ratio": round(alpha_ratio, 3),
        "low_signal": low_signal,
        "reasons": reasons,
    }

# ============================================================================
# RUBRIC: Quality criteria for each of the 12 prompts
# Based on Edward Burger's "The 5 Elements of Effective Thinking" — AI-utilization
# ============================================================================

ELEMENT_DEFINITIONS = {
    Element.EARTH: {
        "name": "Deep Understanding",
        "emoji": "🌳",
        "core_principle": "Understanding is a spectrum—wherever you are, you can always go deeper. Ground yourself before using AI.",
        "philosophy": "Before engaging AI, master the basics. Start simple, spotlight specifics, add descriptors to sharpen your understanding.",
    },
    Element.FIRE: {
        "name": "Embrace Failure", 
        "emoji": "🔥",
        "core_principle": "We may not know how to do something right, but we always know how to do it wrong. Each failure is a precious joule of insight.",
        "philosophy": "Try an AI approach quickly and lousily. Analyze the failure. Then intentionally push to extremes to learn boundaries.",
    },
    Element.AIR: {
        "name": "Create Questions",
        "emoji": "💨", 
        "core_principle": "The art of continuously creating questions, not just asking them. Be innately curious about the problem and the AI tools.",
        "philosophy": "The right question reframes the problem. Are you even approaching the right problem with AI? What fundamentals are you missing?",
    },
    Element.WATER: {
        "name": "Flow of Ideas",
        "emoji": "🌊",
        "core_principle": "Every idea flows from a prior idea and transcends into the next. Nothing stands alone.",
        "philosophy": "Map out every AI approach. Embrace doubt and alternative perspectives. Follow the best path to its conclusion and beyond.",
    },
}

RUBRIC = {
    # ==================== EARTH (Deep Understanding) ====================
    0: {  # Earth 1.0 - Start with Simple
        "element": Element.EARTH,
        "sub_element": "1.0",
        "name": "Start with Simple",
        "what_good_looks_like": "The user identifies the fundamental context and knowledge needed before engaging AI. They strip away complexity to find the essential ground truth.",
        "must_haves": [
            "Identifies what context is absolutely essential before using AI",
            "Strips away distracting details to find the core of the problem",
            "Grounds themselves in the domain before reaching for tools",
        ],
        "failure_modes": [
            "Restates the problem without simplifying",
            "Jumps straight to AI tools without understanding the domain",
            "Skips foundational understanding in favor of tool-first thinking",
        ],
    },
    1: {  # Earth 2.0 - Spotlight Specific
        "element": Element.EARTH,
        "sub_element": "2.0", 
        "name": "Spotlight Specific",
        "what_good_looks_like": "The user creates a simpler, concrete version of the scenario to reveal its structure and test their understanding.",
        "must_haves": [
            "Provides a concrete, minimal example of the scenario",
            "Traces through the example to expose hidden structure",
            "Uses the simple case to build intuition for the full problem",
        ],
        "failure_modes": [
            "Stays abstract instead of getting concrete",
            "Creates an example but doesn't trace through it",
            "Picks an example too complex to be illuminating",
        ],
    },
    2: {  # Earth 3.0 - Add the Adjective
        "element": Element.EARTH,
        "sub_element": "3.0",
        "name": "Add the Adjective", 
        "what_good_looks_like": "The user adds a descriptor to their approach that changes how they'd tackle the problem with AI—iterative, exploratory, defensive, etc.",
        "must_haves": [
            "Uses a meaningful descriptor that reframes their approach",
            "The adjective changes how they think about using AI",
            "Shows deeper understanding of the problem's character",
        ],
        "failure_modes": [
            "Uses generic adjectives that don't reveal anything",
            "Describes surface features instead of essential character",
            "Skips reflection and jumps to categorization",
        ],
    },
    # ==================== FIRE (Embrace Failure) ====================
    3: {  # Fire 1.0 - Fail Fast
        "element": Element.FIRE,
        "sub_element": "1.0",
        "name": "Fail Fast",
        "what_good_looks_like": "The user produces a rough first attempt at solving with AI—even if wrong—giving themselves something to respond to and learn from.",
        "must_haves": [
            "Produces an actual attempt (prompt idea, workflow sketch, approach)",
            "Doesn't self-censor or aim for perfection",
            "Creates something to critique and improve upon",
        ],
        "failure_modes": [
            "Hesitates and produces nothing concrete",
            "Over-engineers the first attempt trying to be 'right'",
            "Describes what they 'would do' without committing to specifics",
        ],
    },
    4: {  # Fire 2.0 - Fail Again
        "element": Element.FIRE,
        "sub_element": "2.0",
        "name": "Fail Again",
        "what_good_looks_like": "The user analyzes what went wrong with their AI approach and extracts specific lessons to inform a better attempt.",
        "must_haves": [
            "Identifies specific flaws in the previous AI approach",
            "Extracts a lesson or insight from the failure",
            "Uses the failure to inform an improved approach",
        ],
        "failure_modes": [
            "Abandons the first approach without learning from it",
            "Vaguely says 'it didn't work' without specifics",
            "Treats failure as defeat rather than data",
        ],
    },
    5: {  # Fire 3.0 - Fail Intentionally
        "element": Element.FIRE,
        "sub_element": "3.0",
        "name": "Fail Intentionally",
        "what_good_looks_like": "The user deliberately constructs extreme or impossible AI approaches to stress-test their thinking and find the breaking points.",
        "must_haves": [
            "Creates an extreme or absurd AI approach on purpose",
            "Identifies exactly what breaks and why",
            "Gains insight into the boundaries of viable approaches",
        ],
        "failure_modes": [
            "Only considers 'normal' approaches",
            "Fears extremes instead of embracing them as tools",
            "Creates an extreme case but doesn't analyze the break point",
        ],
    },
    # ==================== AIR (Create Questions) ====================
    6: {  # Air 1.0 - Be Your Own Socrates
        "element": Element.AIR,
        "sub_element": "1.0",
        "name": "Be Your Own Socrates",
        "what_good_looks_like": "The user asks meta-questions that challenge whether they're approaching the right problem with AI. They question assumptions at the deepest level.",
        "must_haves": [
            "Asks 'what is the REAL question here?'",
            "Challenges the framing of the problem itself",
            "Considers if they might be approaching the wrong problem with AI",
        ],
        "failure_modes": [
            "Asks surface-level questions about implementation",
            "Accepts the problem framing without questioning it",
            "Focuses on 'how' before validating 'what' and 'why'",
        ],
    },
    7: {  # Air 2.0 - Ask Basic Questions
        "element": Element.AIR,
        "sub_element": "2.0",
        "name": "Ask Basic Questions",
        "what_good_looks_like": "The user identifies fundamental concepts about the domain or AI tools they might be missing, and asks questions to fill those gaps.",
        "must_haves": [
            "Admits what they don't know about the domain or AI tools",
            "Asks questions about foundational concepts",
            "Seeks fundamental understanding before advanced techniques",
        ],
        "failure_modes": [
            "Pretends to understand everything already",
            "Skips fundamentals to appear sophisticated",
            "Asks complex questions while missing basics",
        ],
    },
    8: {  # Air 3.0 - Ask Another Question
        "element": Element.AIR,
        "sub_element": "3.0",
        "name": "Ask Another Question",
        "what_good_looks_like": "The user asks a related but different question that might provide insight into the original problem from a fresh angle.",
        "must_haves": [
            "Poses a question related to but distinct from the main problem",
            "The new question offers a fresh perspective on AI utilization",
            "Uses the related question to approach the original differently",
        ],
        "failure_modes": [
            "Repeats the same question in different words",
            "Asks an unrelated question that doesn't connect back",
            "Gets stuck in one line of questioning",
        ],
    },
    # ==================== WATER (Flow of Ideas) ====================
    9: {  # Water 1.0 - Run Down All Paths
        "element": Element.WATER,
        "sub_element": "1.0",
        "name": "Run Down All Paths",
        "what_good_looks_like": "The user brainstorms multiple possible AI approaches without prematurely dismissing any, exploring the landscape of solutions.",
        "must_haves": [
            "Lists multiple distinct AI approaches",
            "Doesn't immediately dismiss 'bad' ideas",
            "Explores each path far enough to understand it",
        ],
        "failure_modes": [
            "Fixates on one approach immediately",
            "Lists approaches but dismisses them without exploration",
            "Lacks creativity in generating alternatives",
        ],
    },
    10: {  # Water 2.0 - Embrace Doubt
        "element": Element.WATER,
        "sub_element": "2.0",
        "name": "Embrace Doubt",
        "what_good_looks_like": "The user acknowledges uncertainty about their AI approach and considers where they might be wrong.",
        "must_haves": [
            "Explicitly states what they're uncertain about in their AI approach",
            "Considers where they might be wrong",
            "Remains open to being completely mistaken",
        ],
        "failure_modes": [
            "Expresses false confidence",
            "Refuses to consider being wrong",
            "Treats uncertainty as weakness rather than wisdom",
        ],
    },
    11: {  # Water 3.0 - Never Stop
        "element": Element.WATER,
        "sub_element": "3.0",
        "name": "Never Stop",
        "what_good_looks_like": "The user follows their best approach to its conclusion and beyond, asking 'what's next?' and seeing where the idea leads.",
        "must_haves": [
            "Follows the approach to its logical conclusion",
            "Asks 'what comes after this step?'",
            "Sees the problem as part of a larger flow of AI-assisted work",
        ],
        "failure_modes": [
            "Stops at the first workable answer without extending",
            "Treats the problem as isolated from everything else",
            "Lacks curiosity about where the idea leads",
        ],
    },
}


def analyze_responses(responses: List[Response]) -> Dict:
    """
    Analyze user responses for patterns.
    Returns insights about which element the user is STRONGEST at (strength-leveraging approach).
    """
    if not responses:
        return {"patterns": [], "strongest_element": None}
    
    patterns = []
    element_stats = {
        Element.EARTH: {"word_count": 0, "responses": 0, "questions": 0, "time_spent": 0},
        Element.FIRE: {"word_count": 0, "responses": 0, "questions": 0, "time_spent": 0},
        Element.AIR: {"word_count": 0, "responses": 0, "questions": 0, "time_spent": 0},
        Element.WATER: {"word_count": 0, "responses": 0, "questions": 0, "time_spent": 0},
    }
    
    total_word_count = 0
    total_time = 0
    quality_by_prompt: dict[int, dict] = {}
    low_signal_prompt_indices: list[int] = []
    
    for response in responses:
        q = assess_response_quality(response.response_text)
        quality_by_prompt[response.prompt_index] = q
        if q.get("low_signal"):
            low_signal_prompt_indices.append(response.prompt_index)

        element = response.element
        if element in element_stats:
            element_stats[element]["word_count"] += response.word_count
            element_stats[element]["responses"] += 1
            element_stats[element]["questions"] += response.response_text.count("?")
            element_stats[element]["time_spent"] += response.time_spent_seconds
        total_word_count += response.word_count
        total_time += response.time_spent_seconds
    
    avg_word_count = total_word_count / len(responses) if responses else 0

    low_signal_count = len(low_signal_prompt_indices)
    quality_gate = {
        "low_signal_count": low_signal_count,
        "total_responses": len(responses),
        "low_signal_prompt_indices": sorted(low_signal_prompt_indices),
        # If too many responses are low-signal, the model MUST NOT "celebrate strengths".
        "ok_to_praise": low_signal_count <= 2 and avg_word_count >= 15,
    }
    
    # Detect positive patterns (what user is doing well)
    if quality_gate["ok_to_praise"]:
        for element, stats in element_stats.items():
            if stats["responses"] > 0:
                avg_element_words = stats["word_count"] / stats["responses"]
                avg_element_time = stats["time_spent"] / stats["responses"]
                
                # Pattern: Deep engagement (above average words AND time)
                if avg_element_words > avg_word_count * 1.2:
                    patterns.append({
                        "type": "deep_engagement",
                        "element": element.value,
                        "message": f"You showed strong engagement with {ELEMENT_DEFINITIONS[element]['emoji']} {element.value.capitalize()}. This is a strength to leverage!"
                    })
                
                # Pattern: Rich questioning (for Air especially)
                if element == Element.AIR and stats["questions"] >= stats["responses"] * 1.5:
                    patterns.append({
                        "type": "rich_questioning",
                        "element": element.value,
                        "message": "Your Air responses are full of genuine curiosity and questions. This is powerful!"
                    })
    else:
        patterns.append(
            {
                "type": "insufficient_signal",
                "element": None,
                "message": "Your responses don’t contain enough concrete thinking to accurately assess strengths yet. Let’s get a bit more specific.",
            }
        )
    
    # Find STRONGEST element (highest average word count + time as engagement proxy)
    strongest = None
    highest_score = 0
    
    for element, stats in element_stats.items():
        if stats["responses"] > 0:
            # Composite score: word count weighted + time spent
            avg_words = stats["word_count"] / stats["responses"]
            avg_time = stats["time_spent"] / stats["responses"]
            # Normalize and combine (words are more indicative of depth)
            score = (avg_words * 0.7) + (avg_time * 0.3)
            if score > highest_score:
                highest_score = score
                strongest = element
    
    return {
        "patterns": patterns,
        "strongest_element": strongest.value if strongest else None,
        "element_stats": {e.value: s for e, s in element_stats.items()},
        "total_word_count": total_word_count,
        "avg_word_count": avg_word_count,
        "quality_gate": quality_gate,
        "quality_by_prompt": quality_by_prompt,
    }


def build_puzzle_prompt(topic: str) -> str:
    """
    Build a prompt for Claude to generate an AI-utilization puzzle.
    Returns JSON with scenario, constraints, example, solution, and title.
    """
    return f"""You are an expert educator designing AI-utilization puzzles. These puzzles present realistic scenarios where a person must figure out how to effectively use AI tools (LLMs, code assistants, image generators, data analysis tools, etc.) to solve a problem.

Topic/domain: {topic}

Generate an AI-utilization puzzle as a JSON object with these fields:

{{
  "title": "Short, memorable puzzle title (3-6 words)",
  "scenario": "A realistic 2-4 sentence scenario describing a situation where someone needs to leverage AI tools to accomplish a goal. Make it vivid and grounded in a real profession or context. The scenario should NOT have an obvious solution.",
  "constraints": ["Constraint 1 that limits naive approaches", "Constraint 2 that adds realism", "Constraint 3 (optional)"],
  "example": "A concrete, minimal example of the scenario with specific details that help the solver understand the problem.",
  "solution": "A thorough explanation (3-5 sentences) of the best approach to solving this with AI tools. Be specific about which tools, what prompts, what workflow. This is the HIDDEN solution that users should discover through thinking."
}}

Rules:
- The puzzle should require genuine thinking about HOW to use AI, not just WHETHER to use it.
- Constraints should make the naive approach (e.g., 'just paste it into ChatGPT') insufficient.
- The solution should involve a thoughtful AI workflow or strategy.
- Keep scenario under 100 words. Keep solution under 150 words.
- Output ONLY the JSON object, no markdown fences, no extra text."""


def build_hint_prompt(
    puzzle_scenario: str,
    puzzle_constraints: list,
    responses: List[Response],
    analysis: Dict,
    matched_flow_steps: list = None,
) -> str:
    """
    Build the prompt for Claude to generate a personalized, strength-leveraging nudge.
    Includes the full rubric so the LLM can properly evaluate response quality.
    Uses the matched teacher flow for targeted coaching when available.
    """
    
    # Build responses text with rubric context
    responses_text = ""
    for resp in responses:
        prompt_info = PROMPTS[resp.prompt_index] if resp.prompt_index < len(PROMPTS) else {}
        rubric_info = RUBRIC.get(resp.prompt_index, {})
        element = prompt_info.get('element', Element.EARTH)
        element_def = ELEMENT_DEFINITIONS.get(element, {})
        
        responses_text += f"""
---
**{element_def.get('emoji', '')} {prompt_info.get('element', '').value.upper() if hasattr(prompt_info.get('element', ''), 'value') else ''} {prompt_info.get('sub_element', '')} - {prompt_info.get('name', '')}**
Prompt: {prompt_info.get('prompt', '')}
User's Response: {resp.response_text}
(Words: {resp.word_count}, Time: {resp.time_spent_seconds}s)

Quality Criteria:
- Good looks like: {rubric_info.get('what_good_looks_like', 'N/A')}
- Must-haves: {', '.join(rubric_info.get('must_haves', [])[:2])}
"""
    
    # Build element definitions for context
    elements_context = ""
    for elem, defn in ELEMENT_DEFINITIONS.items():
        elements_context += f"""
**{defn['emoji']} {elem.value.upper()} - {defn['name']}**
Core: {defn['core_principle']}
Philosophy: {defn['philosophy']}
"""

    strongest = analysis.get("strongest_element", "unknown")
    strongest_elem = Element(strongest) if strongest and strongest != "unknown" else None
    strongest_def = ELEMENT_DEFINITIONS.get(strongest_elem, {}) if strongest_elem else {}
    
    patterns_text = ""
    for pattern in analysis.get("patterns", []):
        patterns_text += f"- {pattern['message']}\n"

    quality_gate = analysis.get("quality_gate") or {}
    ok_to_praise = bool(quality_gate.get("ok_to_praise", True))
    low_signal_count = int(quality_gate.get("low_signal_count", 0) or 0)
    total_responses = int(quality_gate.get("total_responses", len(responses)) or len(responses))
    
    constraints_text = "\n".join(f"- {c}" for c in (puzzle_constraints or []))

    # Teacher flow coaching context
    flow_context = ""
    if matched_flow_steps:
        flow_context = "\n## Teacher Flow (expert thinking path — do NOT reveal directly)\n"
        for step in matched_flow_steps:
            flow_context += f"- {step.get('prompt_name', '')}: {step.get('insight', '')}\n"
        flow_context += "\nUse this flow to understand WHERE the user is in the thinking process and what they should explore NEXT. Do NOT copy the flow text verbatim.\n"
    
    return f"""You are a thinking coach trained in Edward Burger's "5 Elements of Effective Thinking" framework.

## The 5 Elements Framework
{elements_context}

## The Puzzle
**Scenario:** {puzzle_scenario}
**Constraints:**
{constraints_text}

## Their Responses (with quality rubric)
{responses_text}
{flow_context}
## Reality / Quality Check (IMPORTANT)
- Low-signal responses count: {low_signal_count}/{total_responses}
- ok_to_praise: {ok_to_praise}

## Analysis of Their Thinking
- **STRONGEST element:** {strongest_def.get('emoji', '')} {strongest.upper() if strongest else 'Unknown'}
- Average word count: {analysis.get('avg_word_count', 0):.1f}
{patterns_text if patterns_text else '- Building their thinking muscles!'}

## Your Task: Strength-Leveraging Nudge

Your job is NOT to point out weaknesses. Instead, **leverage their strength** to help them think through the puzzle.

CRITICAL: Stay grounded in the actual text. Do NOT invent strengths.
If ok_to_praise is false (or if responses look like placeholders), you MUST:
1) Say plainly (but kindly) that you can't assess strengths yet.
2) Ask for more concrete thinking and give ONE example of what a good answer looks like.
3) Give ONE next step.
In that case, do NOT "celebrate their strength" and do NOT quote words as evidence.

1. **Celebrate their strength** - Identify what they did well in their strongest element. Quote their actual words.
2. **Show how to leverage it** - Explain how to USE this thinking style on the puzzle.
3. **Give ONE concrete next step** - Based on their strength. Make it specific to THIS puzzle.
4. **Do NOT give away the solution** - Guide their thinking, don't solve for them.

Keep your response under 200 words. Be warm, specific, and empowering.
"""
