"""
Domain Services - Business logic
"""
from typing import List, Dict
from app.domain.entities import Response, Element, PROMPTS

def analyze_responses(responses: List[Response]) -> Dict:
    """
    Analyze user responses for patterns.
    Returns insights about which elements need more attention.
    """
    if not responses:
        return {"patterns": [], "weakest_element": None}
    
    patterns = []
    element_stats = {
        Element.EARTH: {"word_count": 0, "responses": 0, "questions": 0},
        Element.FIRE: {"word_count": 0, "responses": 0, "questions": 0},
        Element.AIR: {"word_count": 0, "responses": 0, "questions": 0},
        Element.WATER: {"word_count": 0, "responses": 0, "questions": 0},
    }
    
    total_word_count = 0
    
    for response in responses:
        element = response.element
        if element in element_stats:
            element_stats[element]["word_count"] += response.word_count
            element_stats[element]["responses"] += 1
            element_stats[element]["questions"] += response.response_text.count("?")
        total_word_count += response.word_count
    
    avg_word_count = total_word_count / len(responses) if responses else 0
    
    # Detect patterns
    for element, stats in element_stats.items():
        if stats["responses"] > 0:
            avg_element_words = stats["word_count"] / stats["responses"]
            
            # Pattern: Short responses
            if avg_element_words < avg_word_count * 0.6:
                patterns.append({
                    "type": "short_responses",
                    "element": element.value,
                    "message": f"Your {element.value.capitalize()} responses are shorter than average. Consider going deeper."
                })
            
            # Pattern: Few questions (especially for Air)
            if element == Element.AIR and stats["questions"] < stats["responses"]:
                patterns.append({
                    "type": "few_questions",
                    "element": element.value,
                    "message": "Your Air responses have few question marks. Remember, Air is about creating questions!"
                })
    
    # Find weakest element (lowest average word count)
    weakest = None
    lowest_avg = float('inf')
    
    for element, stats in element_stats.items():
        if stats["responses"] > 0:
            avg = stats["word_count"] / stats["responses"]
            if avg < lowest_avg:
                lowest_avg = avg
                weakest = element
    
    return {
        "patterns": patterns,
        "weakest_element": weakest.value if weakest else None,
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
    Build the prompt for Claude to generate a personalized hint.
    """
    responses_text = ""
    for resp in responses:
        prompt_info = PROMPTS[resp.prompt_index] if resp.prompt_index < len(PROMPTS) else {}
        responses_text += f"""
**{prompt_info.get('element', '').upper()} {prompt_info.get('sub_element', '')} - {prompt_info.get('name', '')}**
Prompt: {prompt_info.get('prompt', '')}
Response: {resp.response_text}
(Words: {resp.word_count}, Time: {resp.time_spent_seconds}s)
"""
    
    patterns_text = ""
    for pattern in analysis.get("patterns", []):
        patterns_text += f"- {pattern['message']}\n"
    
    weakest = analysis.get("weakest_element", "unknown")
    
    return f"""You are a thinking coach helping someone apply the 5 Elements of Effective Thinking to algorithm problems. 

The user is working on: **{algorithm_title}**
URL: {algorithm_url or 'N/A'}

## Their 12 Responses:
{responses_text}

## Analysis of Their Thinking:
- Weakest element: {weakest}
- Average word count: {analysis.get('avg_word_count', 0):.1f}
{patterns_text if patterns_text else '- No major patterns detected'}

## Your Task:
Provide a personalized "nudge" that:
1. Acknowledges what they did well (be specific, cite their words)
2. Identifies which element they should focus on more
3. Gives a concrete suggestion for how to apply that element to THIS problem
4. Does NOT give away the solution - only guide their thinking

Keep your response under 200 words. Be encouraging but honest. Use the element emojis (🌳 Earth, 🔥 Fire, 💨 Air, 🌊 Water) when referring to elements.
"""

