"""
Domain Services - Business logic
"""
from typing import List, Dict
from app.domain.entities import Response, Element, PROMPTS

# ============================================================================
# RUBRIC: Quality criteria for each of the 12 prompts
# Based on Edward Burger's "The 5 Elements of Effective Thinking" and MUYOM
# ============================================================================

ELEMENT_DEFINITIONS = {
    Element.EARTH: {
        "name": "Deep Understanding",
        "emoji": "🌳",
        "core_principle": "Understanding is a spectrum—wherever you are, you can always go deeper. Masters excel at fundamentals.",
        "philosophy": "When the going gets tough, the tough leave. Avoid the hard problem and probe simpler ones where you're grounded.",
    },
    Element.FIRE: {
        "name": "Embrace Failure", 
        "emoji": "🔥",
        "core_principle": "We may not know how to do something right, but we always know how to do it wrong. Each failure is a precious joule of insight.",
        "philosophy": "Never stare at a blank page. Create junk quickly, then find the gems hidden within.",
    },
    Element.AIR: {
        "name": "Create Questions",
        "emoji": "💨", 
        "core_principle": "The art of continuously creating questions, not just asking them. Be innately curious, never a passive observer.",
        "philosophy": "The right question can completely reframe a problem. Socrates asked meta-questions—are we even solving the right problem?",
    },
    Element.WATER: {
        "name": "Flow of Ideas",
        "emoji": "🌊",
        "core_principle": "Every idea flows from a prior idea and transcends into the next. Nothing stands alone.",
        "philosophy": "Run down all paths with determination. Embrace doubt and alternative perspectives. Never stop—ask 'what's next?'",
    },
}

RUBRIC = {
    # ==================== EARTH (Deep Understanding) ====================
    0: {  # Earth 1.0 - Start with Simple
        "element": Element.EARTH,
        "sub_element": "1.0",
        "name": "Start with Simple",
        "what_good_looks_like": "The user strips away complexity to reveal the core mechanism. They identify the most fundamental operation or pattern the problem requires.",
        "must_haves": [
            "Identifies the single most basic operation (e.g., 'at its core, this is comparing two things')",
            "Removes distracting details to see the skeleton",
            "Grounds themselves before tackling complexity",
        ],
        "failure_modes": [
            "Restates the problem without simplifying",
            "Jumps to solution approaches instead of understanding basics",
            "Gets lost in edge cases before understanding the main case",
        ],
    },
    1: {  # Earth 2.0 - Spotlight Specific
        "element": Element.EARTH,
        "sub_element": "2.0", 
        "name": "Spotlight Specific",
        "what_good_looks_like": "The user creates a small, concrete example with actual numbers/values and traces through it manually to reveal the structure.",
        "must_haves": [
            "Provides specific, concrete values (not abstract 'n' or 'list')",
            "Traces through the example step-by-step",
            "Uses the example to reveal hidden structure or patterns",
        ],
        "failure_modes": [
            "Gives an abstract description instead of concrete example",
            "Creates an example but doesn't trace through it",
            "Picks an example too complex to be illuminating",
        ],
    },
    2: {  # Earth 3.0 - Add the Adjective
        "element": Element.EARTH,
        "sub_element": "3.0",
        "name": "Add the Adjective", 
        "what_good_looks_like": "The user describes the problem with a revealing adjective that captures its essence, helping them see what makes this problem unique.",
        "must_haves": [
            "Uses a descriptive word that reveals the problem's character",
            "The adjective helps distinguish this problem from similar ones",
            "Shows deeper understanding of what makes the problem tick",
        ],
        "failure_modes": [
            "Uses generic adjectives ('hard', 'complex') that don't reveal anything",
            "Describes surface features instead of essential character",
            "Skips reflection and jumps to categorization",
        ],
    },
    # ==================== FIRE (Embrace Failure) ====================
    3: {  # Fire 1.0 - Fail Fast
        "element": Element.FIRE,
        "sub_element": "1.0",
        "name": "Fail Fast",
        "what_good_looks_like": "The user writes a rough first attempt without worrying about correctness, giving themselves something concrete to respond to and learn from.",
        "must_haves": [
            "Produces an actual attempt (code idea, algorithm sketch, approach)",
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
        "what_good_looks_like": "The user analyzes what went wrong with their first approach and extracts specific lessons to inform a better attempt.",
        "must_haves": [
            "Identifies specific flaws in the previous attempt",
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
        "what_good_looks_like": "The user deliberately constructs extreme or impossible scenarios to stress-test their thinking and find the breaking points.",
        "must_haves": [
            "Creates an extreme, edge, or absurd case on purpose",
            "Identifies exactly what breaks and why",
            "Gains insight into the boundaries of their solution",
        ],
        "failure_modes": [
            "Only considers 'normal' cases",
            "Fears extremes instead of embracing them as tools",
            "Creates an extreme case but doesn't analyze the break point",
        ],
    },
    # ==================== AIR (Create Questions) ====================
    6: {  # Air 1.0 - Be Your Own Socrates
        "element": Element.AIR,
        "sub_element": "1.0",
        "name": "Be Your Own Socrates",
        "what_good_looks_like": "The user asks meta-questions that challenge whether they're even solving the right problem. They question assumptions at the deepest level.",
        "must_haves": [
            "Asks 'what is the REAL question here?'",
            "Challenges the framing of the problem itself",
            "Considers if they might be solving the wrong problem entirely",
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
        "what_good_looks_like": "The user identifies fundamental concepts they might be missing or taking for granted, and asks questions to fill those gaps.",
        "must_haves": [
            "Admits what they don't know or might be assuming",
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
            "The new question offers a fresh perspective",
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
        "what_good_looks_like": "The user brainstorms multiple possible approaches without prematurely dismissing any, exploring the landscape of solutions.",
        "must_haves": [
            "Lists multiple distinct approaches",
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
        "what_good_looks_like": "The user acknowledges uncertainty and considers where they might be wrong, staying open-minded about alternative perspectives.",
        "must_haves": [
            "Explicitly states what they're uncertain about",
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
        "what_good_looks_like": "The user extends their thinking beyond the immediate problem, asking 'what's next?' and seeing where the idea leads.",
        "must_haves": [
            "Considers implications beyond the current problem",
            "Asks 'what comes after solving this?'",
            "Sees the problem as part of a larger flow",
        ],
        "failure_modes": [
            "Stops at the solution without extending the idea",
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
    
    for response in responses:
        element = response.element
        if element in element_stats:
            element_stats[element]["word_count"] += response.word_count
            element_stats[element]["responses"] += 1
            element_stats[element]["questions"] += response.response_text.count("?")
            element_stats[element]["time_spent"] += response.time_spent_seconds
        total_word_count += response.word_count
        total_time += response.time_spent_seconds
    
    avg_word_count = total_word_count / len(responses) if responses else 0
    
    # Detect positive patterns (what user is doing well)
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
    }


def build_hint_prompt(
    algorithm_title: str,
    algorithm_url: str,
    responses: List[Response],
    analysis: Dict
) -> str:
    """
    Build the prompt for Claude to generate a personalized, strength-leveraging nudge.
    Includes the full rubric so the LLM can properly evaluate response quality.
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
    
    return f"""You are a thinking coach trained in Edward Burger's "5 Elements of Effective Thinking" framework from the book MUYOM (Making Up Your Own Mind).

## The 5 Elements Framework
{elements_context}

## The User's Problem
**Algorithm:** {algorithm_title}
**URL:** {algorithm_url or 'N/A'}

## Their 12 Responses (with quality rubric)
{responses_text}

## Analysis of Their Thinking
- **STRONGEST element:** {strongest_def.get('emoji', '')} {strongest.upper() if strongest else 'Unknown'} - This is where they shine!
- Average word count: {analysis.get('avg_word_count', 0):.1f}
{patterns_text if patterns_text else '- Building their thinking muscles!'}

## Your Task: Strength-Leveraging Nudge

Your job is NOT to point out weaknesses. Instead, **leverage their strength** to help them think through the problem.

1. **Celebrate their strength** - Identify what they did exceptionally well in their strongest element. Quote their actual words.

2. **Show how to leverage it** - Explain how they can USE this strong thinking style to break through on the problem. For example:
   - If strong in Earth: "Your grounding is excellent. Use this same concrete thinking to..."
   - If strong in Fire: "You embrace failure well. Apply this same courage to..."
   - If strong in Air: "Your questioning is powerful. Turn these questions toward..."
   - If strong in Water: "You see connections beautifully. Follow this flow to..."

3. **Give ONE concrete next step** - Based on their strength, give them exactly one thing to try next. Make it specific to THIS problem.

4. **Do NOT give away the solution** - Guide their thinking, don't solve for them.

Keep your response under 200 words. Be warm, specific, and empowering. Help them feel like the strong thinker they already are.
"""
