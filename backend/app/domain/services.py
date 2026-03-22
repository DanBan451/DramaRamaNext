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
    Build a prompt for Claude to generate a simple AI-utilization puzzle.
    Assumes the user knows basics but nothing advanced.
    Returns JSON with scenario, constraints, example, solution, premise, and title.
    No markdown formatting in output.
    """
    return f"""You are an expert educator designing AI-utilization puzzles for people who know the basics of their field but nothing advanced about AI. These puzzles present realistic scenarios where a person must figure out how to effectively use AI tools to solve a problem.

Topic/domain: {topic}

Design principles:
- The puzzle should be understandable in under 5 minutes and fit on one page.
- Keep it simple and concrete. Think of a real person in a real situation.
- Assume the user knows the basics of {topic} but has no advanced AI knowledge.
- The scenario should be grounded and vivid, not abstract or technical.
- Do NOT use any markdown formatting in the output (no bold, no headers, no bullet markers).

Generate an AI-utilization puzzle as a JSON object with these fields:

{{
  "title": "Short, memorable puzzle title (3-6 words)",
  "scenario": "A realistic 2-3 sentence scenario. Simple, concrete, grounded in a real profession. Understandable by anyone. No jargon.",
  "constraints": ["Constraint 1 that limits naive approaches", "Constraint 2 that adds realism"],
  "example": "A concrete, minimal example with specific details that help understand the problem. Plain text, no formatting.",
  "solution": "A clear explanation (3-5 sentences) of the best approach using AI tools. Be specific about which tools and workflow. Plain text, no formatting."
}}

Rules:
- The puzzle should require genuine thinking about HOW to use AI, not just WHETHER to use it.
- Constraints should make the naive approach (just paste it into ChatGPT) insufficient.
- Keep scenario under 80 words. Keep solution under 120 words.
- Output ONLY the JSON object. No markdown fences. No extra text. No formatting."""


def build_nudge_prompt(
    puzzle,
    current_prompt_index: int,
    current_response_text: str,
    all_responses: List[Response],
) -> str:
    """
    Build the Stockfish nudge prompt for Claude.
    Provides full puzzle context (including solution), the current element definition,
    the user's current response, all prior responses, and all 5 Element definitions.
    The nudge is specific to the element the user is currently on.
    """
    # Current prompt info
    current_prompt_info = PROMPTS[current_prompt_index] if current_prompt_index < len(PROMPTS) else {}
    current_element = current_prompt_info.get('element', Element.EARTH)
    current_element_def = ELEMENT_DEFINITIONS.get(current_element, {})
    current_rubric = RUBRIC.get(current_prompt_index, {})
    
    # Build all element definitions
    elements_context = ""
    for elem, defn in ELEMENT_DEFINITIONS.items():
        elements_context += f"{defn['emoji']} {elem.value.upper()} - {defn['name']}\n"
        elements_context += f"Core: {defn['core_principle']}\n"
        elements_context += f"Philosophy: {defn['philosophy']}\n\n"

    # Build prior responses context
    prior_responses_text = ""
    for resp in all_responses:
        p_info = PROMPTS[resp.prompt_index] if resp.prompt_index < len(PROMPTS) else {}
        p_element = p_info.get('element', Element.EARTH)
        p_def = ELEMENT_DEFINITIONS.get(p_element, {})
        prior_responses_text += f"- {p_def.get('emoji', '')} {p_element.value.upper() if hasattr(p_element, 'value') else ''} {p_info.get('sub_element', '')} ({p_info.get('name', '')}): {resp.response_text}\n"

    constraints_text = "\n".join(f"- {c}" for c in (puzzle.constraints or []))

    return f"""You are a thinking coach trained in Edward Burger's "5 Elements of Effective Thinking." You are coaching a user through an AI-utilization puzzle in real time.

## The 5 Elements of Effective Thinking
{elements_context}

## The Puzzle
Title: {puzzle.title}
Scenario: {puzzle.scenario}
Constraints:
{constraints_text}
Example: {puzzle.example}

## The Solution (HIDDEN — you know this but NEVER reveal it directly)
{puzzle.solution}

## Current Element: {current_element_def.get('emoji', '')} {current_element.value.upper() if hasattr(current_element, 'value') else ''} {current_prompt_info.get('sub_element', '')} — {current_prompt_info.get('name', '')}
Definition: {current_element_def.get('core_principle', '')}
Philosophy: {current_element_def.get('philosophy', '')}
Prompt: {current_prompt_info.get('prompt', '')}
What good looks like: {current_rubric.get('what_good_looks_like', 'N/A')}

## The User's Current Response (for this element)
{current_response_text if current_response_text else "(No response yet for this element)"}

## All Prior Responses in This Session
{prior_responses_text if prior_responses_text else "(No prior responses yet)"}

## Your Task: Nudge Within This Element

Provide a nudge that helps the user think more deeply WITHIN the element they are currently on ({current_element.value.upper() if hasattr(current_element, 'value') else ''}).

Rules:
1. Stay within the current element. Do NOT tell them to switch to a different element.
2. Read what they actually wrote. Respond to their specific thinking, not generic advice.
3. If their response is empty or placeholder, ground them in the basics of this element and give a concrete starting point.
4. If their response shows real thinking, push them deeper within this element.
5. Guide toward the solution without giving it away. You know the answer — use that knowledge to ask the right questions.
6. Be warm, specific, and concise.
7. Keep your response under 150 words.
8. Do not use markdown formatting."""


def build_session_completion_prompt(
    puzzle,
    responses: List[Response],
) -> str:
    """
    Build the prompt for Claude to analyze a completed session.
    Returns structured analysis: strongest element, thinking evolution, key knowledge gained.
    """
    # Build responses summary
    responses_text = ""
    for resp in responses:
        p_info = PROMPTS[resp.prompt_index] if resp.prompt_index < len(PROMPTS) else {}
        p_element = p_info.get('element', Element.EARTH)
        p_def = ELEMENT_DEFINITIONS.get(p_element, {})
        responses_text += f"{p_def.get('emoji', '')} {p_element.value.upper() if hasattr(p_element, 'value') else ''} {p_info.get('sub_element', '')} ({p_info.get('name', '')}): {resp.response_text}\n\n"

    puzzle_context = ""
    if puzzle:
        puzzle_context = f"""Title: {puzzle.title}
Scenario: {puzzle.scenario}
Solution: {puzzle.solution}"""

    return f"""You are analyzing a completed thinking session where a user worked through an AI-utilization puzzle using the 5 Elements of Effective Thinking.

## The Puzzle
{puzzle_context}

## The User's Responses (in order)
{responses_text}

## Your Task
Analyze this session and return a JSON object with these fields:

{{
  "title": "A short title summarizing the key insight from this session (under 10 words)",
  "key_insight": "What was the most important thing the user learned or discovered? What was their strongest element and why? How did their thinking evolve across the session? (3-5 sentences, plain text)",
  "input_context": "What was the problem context they were working with? (1-2 sentences summarizing the puzzle scenario)",
  "output_capability": "What new thinking capability did they develop? What can they now do that they couldn't before? (2-3 sentences, plain text)"
}}

Rules:
- Be specific. Reference their actual words and ideas.
- Identify their strongest element based on depth and engagement of responses.
- Show how their thinking evolved from early responses to later ones.
- Be encouraging but honest. If responses were shallow, note that kindly.
- Output ONLY the JSON object. No markdown fences. No extra text."""
