"""
Domain Services - Business logic
"""
from typing import List, Dict
import re
from app.domain.entities import Response, Element, SubElement, ElementMessage, PROMPTS


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

def build_select_element_prompt(
    problem_description: str,
    conversation_history: list,
    user_message: str,
) -> str:
    """
    Build the prompt for Claude to select which element to invisibly apply.
    Returns a prompt that asks for ONLY the element name.
    """
    # Format conversation history
    history_text = ""
    if conversation_history:
        for msg in conversation_history:
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role_label}: {msg.get('message_text', '')}\n"
    else:
        history_text = "(No prior conversation yet)"

    return f"""You are an expert in the 5 Elements of Effective Thinking. Given a user's problem and their conversation so far, determine which element would best serve the user's thinking RIGHT NOW.

The elements are:
- earth: The user needs to ground their understanding. They're missing fundamentals, haven't simplified the problem, or need to add specificity.
- fire: The user needs to try something and fail. They're stuck, overthinking, or afraid to attempt an approach.
- air: The user needs to question their assumptions. They may be solving the wrong problem or missing a fundamental question.
- water: The user needs to see connections and flow. They should map out all approaches, embrace doubt, or follow their best idea further.
- change: The user has gone through significant thinking and needs to reflect on how their understanding has shifted.

The user's problem: {problem_description}
Conversation so far: {history_text}
User's latest message: {user_message}

Respond with ONLY the element name in lowercase (earth, fire, air, water, or change). Nothing else."""


def build_chatbot_prompt(
    problem_description: str,
    element: str,
    conversation_history: list,
    user_message: str,
) -> str:
    """
    Build the chatbot prompt using the selected element's definition invisibly.
    The chatbot NEVER mentions elements by name.
    """
    from app.domain.entities import Element
    
    # Get element definition
    element_enum = Element(element) if element in [e.value for e in Element] else Element.EARTH
    element_def = ELEMENT_DEFINITIONS.get(element_enum, ELEMENT_DEFINITIONS[Element.EARTH])
    
    # Build element guidance from definition
    element_guidance = f"{element_def.get('core_principle', '')}\n\nSub-elements:\n"
    for sub_key, sub_def in element_def.get('sub_elements', {}).items():
        element_guidance += f"- {sub_def.get('name', '')}: {sub_def.get('description', '')}\n"
        element_guidance += f"  Coaching: {sub_def.get('coaching_guidance', '')}\n"

    # Format conversation history
    history_text = ""
    if conversation_history:
        for msg in conversation_history:
            role_label = "User" if msg.get("role") == "user" else "Assistant"
            history_text += f"{role_label}: {msg.get('message_text', '')}\n"
    else:
        history_text = "(This is the start of the conversation)"

    return f"""You are a thinking guide helping someone develop deeper understanding of a problem they're facing. You ask smart, probing questions and make observations that help them see their problem from new angles. You never give them the answer — you help them discover it.

You are invisibly applying the element of {element.upper()}: {element_guidance}

But you NEVER mention this element by name. You never say "let's think about the fundamentals" if that sounds like you're following a script. Instead, naturally ask questions or make observations that embody this element's thinking lens.

The user's problem: {problem_description}
Conversation so far: {history_text}
User's latest message: {user_message}

Rules:
1. NEVER mention the 5 Elements, element names, or any framework terminology. The user should not know you're using a framework.
2. Ask ONE focused question or make ONE sharp observation. Not both. Not multiple.
3. Only reference information the user has provided. Never invent details.
4. Keep your response to 40-60 words. Two sentences maximum. Be direct.
5. Sound like a smart colleague thinking alongside them, not a coach or teacher.
6. Do not use markdown formatting."""


def build_opening_question_prompt(problem_description: str) -> str:
    """
    Build the prompt for generating the first chatbot message (opening question).
    Uses Earth 1.0 invisibly: grounding the user in what they understand.
    """
    return f"""You are a thinking guide helping someone develop deeper understanding of a problem they're facing. They just described their problem to you. Your job is to ask the first question that begins their exploration.

The user's problem: {problem_description}

You are invisibly applying Earth (grounding/fundamentals): Help them articulate what they currently understand about this problem and where they feel stuck.

Rules:
1. NEVER mention frameworks, elements, or methodology. Just ask a natural question.
2. Ask ONE focused question that helps them articulate their current understanding.
3. Keep it to 20-40 words. One or two sentences maximum.
4. Sound like a smart colleague, not a coach or teacher.
5. Do not use markdown formatting.
6. Do not say "I see" or "That's interesting" — just ask the question."""


def build_extract_insight_prompt(
    problem_description: str,
    element: str,
    user_message: str,
    assistant_message: str,
) -> str:
    """
    Build the prompt for extracting a single insight from a chat exchange.
    Returns a concise insight for the Deep Understanding Document.
    """
    return f"""Extract the key insight from this exchange about the user's problem.

Problem: {problem_description}
Element applied (invisibly): {element}
User said: {user_message}
Assistant responded: {assistant_message}

Write ONE concise insight (1-2 sentences, under 30 words) that captures what the user now understands or should understand about their problem. Focus on the substance, not the process.

If no meaningful insight emerged, respond with: NO_INSIGHT

Rules:
- Be specific to their actual problem
- Don't mention the element or framework
- Write in third person ("The core issue is..." not "You realized...")
- Plain text, no formatting"""


def build_thinker_description_prompt(conversation_history: list) -> str:
    """
    Build the prompt for generating a thinker_description after first completed session.
    Returns a one-sentence professional observation about how the user thinks.
    """
    # Format conversation
    convo_text = ""
    for msg in conversation_history:
        role = "User" if msg.get("role") == "user" else "Guide"
        convo_text += f"{role}: {msg.get('message_text', '')}\n"

    return f"""Based on this user's conversation about their problem, write a one-sentence professional observation about how they think. Not a gaming archetype. A genuine insight.

Conversation:
{convo_text}

Examples of good thinker descriptions:
- "You lead with fundamentals and rarely move forward without solid footing."
- "You think by trying — your instinct is to test ideas before analyzing them."
- "You naturally question assumptions before accepting any framing."
- "You see connections others miss, linking ideas across domains."

Rules:
- One sentence only
- Under 15 words
- Professional tone, not playful
- Based on actual patterns in their responses
- No element names or framework terminology

Write ONLY the one-sentence description, nothing else."""


ELEMENT_DEFINITIONS = {
    Element.EARTH: {
        "name": "Deep Understanding",
        "emoji": "🌳",
        "core_principle": "The element of grounding. Understanding is a spectrum — wherever you are, you can always go deeper. The goal is to identify what you know, what you don't know, and how you'd use AI to fill those gaps.",
        "sub_elements": {
            "1.0": {
                "name": "Start with Simple",
                "description": "The idea is that by mastering the basics, you naturally begin to understand the complexities. When facing a challenge, avoid the hard parts and probe a simpler problem where you have solid footing.",
                "muyaium": "What are the fundamentals of this problem? What do you understand and what don't you? If there are gaps, how would you use AI to fill them?",
                "coaching_guidance": "The coach should evaluate whether the user has identified the core fundamentals and whether their plan to use AI to learn more is sound.",
            },
            "2.0": {
                "name": "Spotlight Specific",
                "description": "Create a special case or specific example, probe it, and then recast whatever findings to the larger problem. The example needs to be simpler than the original problem.",
                "muyaium": "Can the user create a simpler, concrete version of the scenario? If they were to ask AI about just this simplified version, what would they ask?",
                "coaching_guidance": "The coach should evaluate whether the user's simplified version captures the essence of the problem and whether their AI query would be productive.",
            },
            "3.0": {
                "name": "Add the Adjective",
                "description": "Add a descriptor to sharpen understanding. If the puzzle is multi-faceted, this approach is ideal — each adjective reveals a different angle.",
                "muyaium": "Pick a word to describe your approach (iterative, exploratory, defensive, etc.) and consider how that lens changes how you'd work with AI.",
                "coaching_guidance": "The coach should evaluate whether the chosen adjective reveals something useful about the problem and whether the user connects it to their AI approach.",
            },
        },
    },
    Element.FIRE: {
        "name": "Embrace Failure",
        "emoji": "🔥",
        "core_principle": "The element of failing forward. We may not always know how to do something right, but we always know how to do it wrong. Each failure is a precious joule of insight. The goal is to try AI approaches quickly, fail, learn, and refine.",
        "sub_elements": {
            "1.0": {
                "name": "Fail Fast",
                "description": "Never stare at a blank screen. Write a rough draft, try something, even if it's wrong. Now you have something to respond to.",
                "muyaium": "Try an AI approach right now, even if it's bad. What would you ask or tell the AI?",
                "coaching_guidance": "The coach should evaluate whether the user actually attempted something (not just described what they might do) and whether they can articulate what they tried.",
            },
            "2.0": {
                "name": "Fail Again",
                "description": "Inspect what went wrong. Where was the lack of understanding? What did the failure reveal?",
                "muyaium": "What would go wrong with that AI approach? Where would the AI misunderstand you or give you something useless?",
                "coaching_guidance": "The coach should evaluate whether the user is genuinely analyzing the failure and extracting insights, not just saying 'it wouldn't work.'",
            },
            "3.0": {
                "name": "Fail Intentionally",
                "description": "Create completely unrealistic scenarios to think outside the box. Then analyze the exact break-point and what may or may not have promise.",
                "muyaium": "What is the worst possible way to use AI on this problem? What does imagining that failure teach you?",
                "coaching_guidance": "The coach should evaluate whether the extreme scenario actually reveals something useful about the boundaries of the problem.",
            },
        },
    },
    Element.AIR: {
        "name": "Create Questions",
        "emoji": "💨",
        "core_principle": "The element of curiosity. The most straightforward approach to probing a puzzle and generating deeper understanding. This is NOT the act of asking a question but rather the art of continuously creating them. It's a state of mind.",
        "sub_elements": {
            "1.0": {
                "name": "Be Your Own Socrates",
                "description": "Ask the meta-questions. Why? Are we even considering the right question? We may be down the wrong route of reasoning entirely.",
                "muyaium": "What is the REAL question here? Are you even asking AI the right thing? Is there a bigger or different question?",
                "coaching_guidance": "The coach should evaluate whether the user is questioning their own assumptions, not just restating the problem.",
            },
            "2.0": {
                "name": "Ask Basic Questions",
                "description": "If the puzzle requires fundamental knowledge you lack, ask fundamental questions for fundamental breakthroughs.",
                "muyaium": "What fundamental concept about this problem or these AI tools do you not understand? What basic question would you ask AI that might unlock your understanding?",
                "coaching_guidance": "The coach should evaluate whether the user has identified genuine knowledge gaps and whether their questions target the right fundamentals.",
            },
            "3.0": {
                "name": "Ask Another Question",
                "description": "If stuck, ask a related but different question to refresh your thinking.",
                "muyaium": "What related problem might give you insight? Is there an adjacent question you could explore with AI first?",
                "coaching_guidance": "The coach should evaluate whether the alternative question is genuinely related and could produce useful insight for the original problem.",
            },
        },
    },
    Element.WATER: {
        "name": "Flow of Ideas",
        "emoji": "🌊",
        "core_principle": "The element of seeing connections. Every idea flows from a prior idea and transcends into the next. Nothing stands alone. The goal is to map out all paths, embrace doubt, and follow ideas to their conclusion.",
        "sub_elements": {
            "1.0": {
                "name": "Run Down All Paths",
                "description": "Stick with one idea until it's a dead end, then go down another. At each dead end, ask why.",
                "muyaium": "What are ALL the possible ways you could use AI to tackle this? List every approach — tools, prompts, strategies, workflows.",
                "coaching_guidance": "The coach should evaluate whether the user has been comprehensive and whether they've considered approaches they might have dismissed too quickly.",
            },
            "2.0": {
                "name": "Embrace Doubt",
                "description": "Empathy and sympathy are not the same. Consider alternative perspectives. Never be 100% sure about anything.",
                "muyaium": "What are you uncertain about? Where might you be wrong? What would someone who disagrees say?",
                "coaching_guidance": "The coach should evaluate whether the user is genuinely questioning their approach or just performing doubt.",
            },
            "3.0": {
                "name": "Never Stop",
                "description": "A new idea is just the beginning. The real work comes from asking 'what's next?'",
                "muyaium": "Take your best approach and follow it to the end. What happens next? And after that?",
                "coaching_guidance": "The coach should evaluate whether the user is pushing their thinking forward or stopping at the first reasonable idea.",
            },
        },
    },
    Element.CHANGE: {
        "name": "The Quintessential Element",
        "emoji": "🔄",
        "core_principle": "Change is what happens when the 5 Elements become part of you. It is seeing the puzzle in a new light after applying the four lenses. Every puzzle has a structure that the 4 elements help uncover. When we see structure, it is a Eureka moment. The most important piece of change is that we start seeing problems as puzzles. Life is a series of puzzles that we mistakenly try to solve. We should not try to solve them but rather think through them, and as a byproduct have them be solved.",
        "sub_elements": {
            "transform": {
                "name": "Transform",
                "description": "The culmination of applying all elements.",
                "muyaium": "How has thinking through this puzzle changed your understanding? What do you see differently now about how to use AI for this kind of problem?",
                "coaching_guidance": "The coach should evaluate whether the user has genuinely experienced a shift in perspective or is just summarizing what they did.",
            },
        },
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
    Puzzles must have concrete bounded solutions, explicit premises, simpler language,
    no markdown, and no invented specifics.
    """
    return f"""You are an expert educator designing AI-utilization puzzles for people who know the basics of their field but nothing advanced about AI. These puzzles present realistic scenarios where a person must figure out how to effectively use AI tools to solve a problem.

Topic/domain: {topic}

Design principles:
- The puzzle MUST have a concrete, bounded solution. Not a vague description of a situation. The solution should be a specific approach, strategy, or answer that the user can arrive at.
- The puzzle MUST be understandable in under 5 minutes. Assume the user knows the basics of {topic} but nothing advanced. No jargon without explanation.
- The scenario should be grounded and vivid. Think of a real person in a real situation.
- Do NOT use any markdown formatting in the output (no bold, no headers, no bullet markers). Plain text only.
- Do NOT invent specific technologies, services, or brand names unless they are essential and widely known. The puzzle states only what is given — no assumptions about specific tools.
- Keep it simple and concrete.

Generate an AI-utilization puzzle as a JSON object with these fields:

{{
  "title": "Short, memorable puzzle title (3-6 words)",
  "scenario": "A realistic 2-3 sentence scenario. Simple, concrete, grounded in a real profession. Understandable by anyone. No jargon. Plain text only.",
  "constraints": ["Constraint 1 that limits naive approaches", "Constraint 2 that adds realism"],
  "example": "A concrete, minimal example with specific details that help understand the problem. Plain text, no formatting.",
  "solution": "A clear, specific explanation (3-5 sentences) of the best approach using AI tools. This must be a concrete answer the user can arrive at — not a vague process description. Plain text, no formatting."
}}

Rules:
- The puzzle should require genuine thinking about HOW to use AI, not just WHETHER to use it.
- Constraints should make the naive approach (just paste it into ChatGPT) insufficient.
- Keep scenario under 80 words. Keep solution under 120 words.
- Output ONLY the JSON object. No markdown fences. No extra text. No formatting."""


def build_nudge_prompt(
    problem_description: str,
    current_prompt_index: int,
    conversation_history: List[ElementMessage],
    other_elements_latest: dict,
) -> str:
    """
    Build the Stockfish v3 nudge prompt for Claude.
    Uses per-element conversation history. Coaches the user through their real problem
    using the current element's lens.
    
    Args:
        problem_description: The user's description of their real problem
        current_prompt_index: Which element prompt (0-12)
        conversation_history: All ElementMessage objects for this element in this session (chronological)
        other_elements_latest: {prompt_index: latest_user_message_text} for all OTHER elements
    """
    current_prompt_info = PROMPTS[current_prompt_index] if current_prompt_index < len(PROMPTS) else {}
    current_element = current_prompt_info.get('element', Element.EARTH)
    current_element_def = ELEMENT_DEFINITIONS.get(current_element, {})
    
    # Get sub-element key
    sub_element_key = current_prompt_info.get('sub_element', SubElement.ONE)
    if hasattr(sub_element_key, 'value'):
        sub_element_key = sub_element_key.value
    
    # Get sub-element definition
    sub_element_def = current_element_def.get('sub_elements', {}).get(sub_element_key, {})

    # Build full definition of current element and sub-element
    current_element_full = f"""{current_element_def.get('emoji', '')} {current_element.value.upper()} — {current_element_def.get('name', '')}
{current_element_def.get('core_principle', '')}

{sub_element_key} — {sub_element_def.get('name', '')}
{sub_element_def.get('description', '')}
In MUYAIUM: {sub_element_def.get('muyaium', '')}
{sub_element_def.get('coaching_guidance', '')}"""

    # Build conversation history for this element
    history_text = ""
    if conversation_history:
        for msg in conversation_history:
            role_label = "User" if msg.role == "user" else "Coach (you)"
            history_text += f"{role_label}: {msg.message_text}\n\n"
    else:
        history_text = "(No prior conversation on this element yet)\n"

    # Build latest responses from other elements
    other_elements_text = ""
    for pi, text in sorted(other_elements_latest.items()):
        if pi == current_prompt_index:
            continue
        p_info = PROMPTS[pi] if pi < len(PROMPTS) else {}
        p_element = p_info.get('element', Element.EARTH)
        p_def = ELEMENT_DEFINITIONS.get(p_element, {})
        p_sub = p_info.get('sub_element', SubElement.ONE)
        if hasattr(p_sub, 'value'):
            p_sub = p_sub.value
        other_elements_text += f"- {p_def.get('emoji', '')} {p_element.value.upper() if hasattr(p_element, 'value') else ''} {p_sub} ({p_info.get('name', '')}): {text}\n"
    if not other_elements_text:
        other_elements_text = "(No other elements worked on yet)\n"

    return f"""You are a thinking coach helping a user apply the 5 Elements of Effective Thinking to a real software engineering problem they are currently facing. Your primary job is to help them develop deeper understanding of their problem by coaching how they apply the current element.

The user is currently working on {current_element.value.upper() if hasattr(current_element, 'value') else ''} {sub_element_key} — {current_prompt_info.get('name', '')}.

The user's problem:
{problem_description}

Full definition of the current element and sub-element, including coaching guidance:
{current_element_full}

Conversation history for this element:
{history_text}

Latest responses from other elements:
{other_elements_text}

Rules:
1. ONLY reference information the user has provided about their problem. Do NOT invent details, technologies, or specifics they haven't mentioned.
2. Evaluate how well the user is thinking about USING AI to approach their problem. If they don't understand something, nudge them to think about how they'd use AI tools to fill that gap. You are coaching AI-utilization thinking, not teaching domain knowledge.
3. If the user's response is very short or shows they haven't engaged, nudge them to think about what questions they'd ask an AI tool to get started. Stay within the current element's lens.
4. If the user demonstrates solid thinking, push them deeper within this element.
5. Coach within the element they are on. Do not tell them to switch elements.
6. There is no single "right answer" to this problem. Guide toward deeper understanding, not toward a specific solution. Multiple approaches may be valid.
7. Prioritize the quality of the thinking process. If they are applying the element well, acknowledge that.
8. Reference the conversation history for this element. Build on what has been discussed. Do not repeat advice.
9. Keep your response to 50-75 words maximum. Two to three sharp sentences.
10. Do not use markdown formatting."""


def build_session_completion_prompt(
    problem_description: str,
    responses: List[Response],
    deep_insights: list = None,
) -> str:
    """
    Build the prompt for Claude to analyze a completed session.
    Returns structured analysis: what the user now understands about their problem,
    which elements contributed most, and what remains unclear.
    """
    # Build responses summary
    responses_text = ""
    for resp in responses:
        p_info = PROMPTS[resp.prompt_index] if resp.prompt_index < len(PROMPTS) else {}
        p_element = p_info.get('element', Element.EARTH)
        p_def = ELEMENT_DEFINITIONS.get(p_element, {})
        responses_text += f"{p_def.get('emoji', '')} {p_element.value.upper() if hasattr(p_element, 'value') else ''} {p_info.get('sub_element', '')} ({p_info.get('name', '')}): {resp.response_text}\n\n"

    # Build deep understanding summary
    insights_text = ""
    if deep_insights:
        for ins in deep_insights:
            element_def = ELEMENT_DEFINITIONS.get(Element(ins.element), {}) if ins.element else {}
            emoji = element_def.get('emoji', '')
            insights_text += f"{emoji} {ins.element.upper()}: {ins.insight_text}\n"
    if not insights_text:
        insights_text = "(No deep understanding entries recorded)\n"

    return f"""You are analyzing a completed thinking session where a user worked through a real software engineering problem using the 5 Elements of Effective Thinking.

## The User's Problem
{problem_description}

## The User's Responses (in order)
{responses_text}

## Deep Understanding Accumulated During Session
{insights_text}

## Your Task
Analyze this session and return a JSON object with these fields:

{{
  "title": "A short title summarizing the key insight from this session (under 10 words)",
  "key_insight": "What does the user now understand about their problem that they didn't before? Which elements contributed most to their understanding? How did their thinking evolve across the session? (3-5 sentences, plain text)",
  "input_context": "What was the problem they were facing? (1-2 sentences summarizing from their description)",
  "output_capability": "What aspects of the problem remain unclear or need further exploration? What should they tackle next? (2-3 sentences, plain text)"
}}

Rules:
- Be specific. Reference their actual words and ideas.
- Identify their strongest element based on depth and engagement of responses.
- Summarize what they now understand about their real problem.
- Note what aspects remain unclear or need more thinking.
- Be encouraging but honest. If responses were shallow, note that kindly.
- Output ONLY the JSON object. No markdown fences. No extra text."""


def build_extract_understanding_prompt(
    problem_description: str,
    element: str,
    prompt_index: int,
    conversation_history: List[ElementMessage],
    existing_document: str = "",
) -> str:
    """
    Build the prompt for Claude to update the unified understanding document based on a nudge exchange.
    """
    element_enum = Element(element) if element in [e.value for e in Element] else Element.EARTH
    element_def = ELEMENT_DEFINITIONS.get(element_enum, {})
    element_name = f"{element_def.get('emoji', '')} {element_def.get('name', '')} ({element.upper()})"

    # Build conversation text
    conversation_text = ""
    for msg in conversation_history:
        role_label = "User" if msg.role == "user" else "Coach"
        conversation_text += f"{role_label}: {msg.message_text}\n\n"

    if existing_document:
        return f"""You are observing a user thinking through a problem. They just had another exchange with a thinking coach. Your job is to UPDATE their understanding document with any new realizations the USER had.

PROBLEM: {problem_description}

CURRENT DOCUMENT:
{existing_document}

LATEST EXCHANGE ({element_name} — {element_def.get('core_principle', '')}):
{conversation_text}

INSTRUCTIONS:
1. The Coach's messages are included for context only. Focus EXCLUSIVELY on what the User said and what the User appears to understand. Do not incorporate the Coach's reasoning or analysis into the document.
2. Read the latest exchange. Look for moments where the USER realized something new, changed their thinking, or figured something out.
3. Update the document to include these new realizations. Write them as the user's understanding — "I now see that..." or "I figured out that..." or "This means that..."
4. Weave new realizations naturally into the existing text. Don't just append at the end.
5. Do NOT add your own analysis. Do NOT solve the problem for them. Only include what the USER has demonstrated they understand.
6. If the user didn't have any new realizations in this exchange, return the existing document unchanged.
7. Do NOT use markdown headers (no # or ## or ###). Do NOT use bullet points with dashes. Write in plain flowing paragraphs with blank lines between them.

Return ONLY the updated document text."""
    else:
        return f"""You are observing a user thinking through a problem. They just had a conversation with a thinking coach. Your job is to write down what the USER now understands — not your own analysis.

PROBLEM: {problem_description}

EXCHANGE ({element_name} — {element_def.get('core_principle', '')}):
{conversation_text}

INSTRUCTIONS:
1. The Coach's messages are included for context only. Focus EXCLUSIVELY on what the User said and what the User appears to understand. Do not incorporate the Coach's reasoning or analysis into the document.
2. Read the exchange carefully. Identify the specific moments where the USER realized something, figured something out, or changed their thinking.
3. Write ONLY what the user now understands, in simple clear language. Use phrases like "I understand that..." or "I figured out that..." or "I realized that..."
4. If the user hasn't had any clear realizations yet, write what they currently know and what they're still working through.
5. Do NOT write your own analysis of the problem. Do NOT solve the problem. Do NOT add information the user hasn't expressed.
6. Keep it short — only include genuine understanding the user has demonstrated.
7. Do NOT use markdown headers (no # or ## or ###). Do NOT use bullet points with dashes. Write in plain flowing paragraphs with blank lines between them.
8. Structure it naturally: start with what the user understands about the setup, then what they've figured out, then what's still unclear to them.

Return ONLY the document text."""


def build_cube_properties_prompt(problem_description: str) -> str:
    """
    Build the prompt for Claude to generate visual cube properties based on the problem description.
    """
    return f"""Analyze this software engineering problem and generate visual properties for a 3D cube that represents it.

Problem: {problem_description}

Generate a JSON object with these properties:
- primary_color: A hex color (e.g., "#4A90D9") that represents the essence of this problem. Choose colors that feel appropriate to the domain (e.g., blue for data/infrastructure, red for urgent/performance, green for growth/scaling, purple for complex/architectural).
- secondary_color: A complementary hex color for accents.
- complexity: An integer 1-5 representing how multifaceted this problem is (1=simple, 5=very complex).
- label: A 2-word label that captures the core challenge (e.g., "Data Flow", "Scale Limit", "Auth Maze", "API Debt").

Output ONLY the JSON object. No markdown fences. No explanation."""


def build_archetype_prompt(element_breakdown: dict) -> str:
    """
    Build the prompt for Claude to generate a user's thinker archetype based on their element usage patterns.
    """
    # Sort elements by usage
    sorted_elements = sorted(element_breakdown.items(), key=lambda x: x[1], reverse=True)
    strongest = sorted_elements[0][0] if sorted_elements else "earth"
    
    breakdown_text = "\n".join([f"- {el.upper()}: {count} words" for el, count in sorted_elements])
    
    return f"""Based on this user's thinking patterns across the 5 Elements of Effective Thinking, generate a thinker archetype for them.

Element usage (words written per element):
{breakdown_text}

Their strongest element is {strongest.upper()}.

Generate a JSON object with:
- archetype_name: A 2-3 word title that captures their thinking style (e.g., "The Groundkeeper" for earth-dominant, "The Questioner" for air-dominant, "The Experimenter" for fire-dominant, "The Explorer" for water-dominant, "The Transformer" for change-dominant). Be creative but meaningful.
- archetype_description: One sentence (max 20 words) describing how this person approaches problems based on their element strengths.

Output ONLY the JSON object. No markdown fences. No explanation."""
