"""
Domain Entities - Core business objects
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum
import json

class Element(str, Enum):
    EARTH = "earth"
    FIRE = "fire"
    AIR = "air"
    WATER = "water"
    CHANGE = "change"

class SubElement(str, Enum):
    ONE = "1.0"
    TWO = "2.0"
    THREE = "3.0"
    TRANSFORM = "transform"

class SessionStatus(str, Enum):
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    ABANDONED = "abandoned"

class User(BaseModel):
    id: str
    clerk_id: str
    email: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None

class Session(BaseModel):
    id: str
    user_id: str
    puzzle_id: Optional[str] = None
    problem_description: Optional[str] = None
    started_at: datetime
    ended_at: Optional[datetime] = None
    status: SessionStatus = SessionStatus.IN_PROGRESS
    prompts_completed: int = 0
    created_at: Optional[datetime] = None

class Response(BaseModel):
    id: str
    session_id: str
    prompt_index: int
    element: Element
    sub_element: SubElement
    response_text: str
    word_count: int
    time_spent_seconds: int
    created_at: Optional[datetime] = None

class Hint(BaseModel):
    id: str
    session_id: str
    hint_text: str
    element_focus: Optional[Element] = None
    patterns_detected: Optional[dict] = None
    user_final_response: Optional[str] = None
    created_at: Optional[datetime] = None

class Puzzle(BaseModel):
    id: str
    title: str
    scenario: str
    constraints: List[str] = []
    example: str
    solution: str
    created_at: Optional[datetime] = None

class Component(BaseModel):
    id: str
    session_id: str
    puzzle_id: str
    user_id: str
    title: str
    key_insight: str
    input_context: str
    output_capability: str
    created_at: Optional[datetime] = None

class ElementMessage(BaseModel):
    id: str
    session_id: str
    prompt_index: int
    role: str  # "user" or "assistant"
    message_text: str
    created_at: Optional[datetime] = None

class DeepUnderstanding(BaseModel):
    id: str
    session_id: str
    prompt_index: int
    element: str
    insight_text: str
    created_at: Optional[datetime] = None

# The 12 prompts + Change (4 elements × 3 sub-elements + 1)
# MUYAIUM: AI-utilization wording. Original prompt names from the book retained.
PROMPTS = [
    # Earth (Deep Understanding)
    {
        "index": 0,
        "element": Element.EARTH,
        "sub_element": SubElement.ONE,
        "name": "Start with Simple",
        "prompt": "What are the fundamentals of this problem? What do you understand and what don't you? If there are gaps in your understanding, how would you use AI to fill them?",
    },
    {
        "index": 1,
        "element": Element.EARTH,
        "sub_element": SubElement.TWO,
        "name": "Spotlight Specific",
        "prompt": "Create a simpler, concrete version of this scenario. If you were to ask AI about just this simplified version, what would you ask?",
    },
    {
        "index": 2,
        "element": Element.EARTH,
        "sub_element": SubElement.THREE,
        "name": "Add the Adjective",
        "prompt": "Pick a word to describe your approach: iterative, exploratory, defensive, cautious, aggressive. How does that lens change how you'd work with AI on this problem?",
    },
    # Fire (Embrace Failure)
    {
        "index": 3,
        "element": Element.FIRE,
        "sub_element": SubElement.ONE,
        "name": "Fail Fast",
        "prompt": "Try something with AI — even if it's wrong. What would you ask or tell the AI right now as a rough first attempt?",
    },
    {
        "index": 4,
        "element": Element.FIRE,
        "sub_element": SubElement.TWO,
        "name": "Fail Again",
        "prompt": "What would go wrong with that approach? Where would the AI misunderstand you or give you something useless? What did you learn from that failure?",
    },
    {
        "index": 5,
        "element": Element.FIRE,
        "sub_element": SubElement.THREE,
        "name": "Fail Intentionally",
        "prompt": "What is the worst possible way to use AI on this problem? What would a completely wrong approach look like? What does imagining that failure teach you about the right approach?",
    },
    # Air (Create Questions)
    {
        "index": 6,
        "element": Element.AIR,
        "sub_element": SubElement.ONE,
        "name": "Be Your Own Socrates",
        "prompt": "Step back. What is the REAL question here? Are you even asking AI the right thing? Is there a bigger or different question you should be exploring?",
    },
    {
        "index": 7,
        "element": Element.AIR,
        "sub_element": SubElement.TWO,
        "name": "Ask Basic Questions",
        "prompt": "What fundamental concept about this problem or these AI tools do you not understand? What basic question would you ask AI that might unlock your understanding?",
    },
    {
        "index": 8,
        "element": Element.AIR,
        "sub_element": SubElement.THREE,
        "name": "Ask Another Question",
        "prompt": "What related problem might give you insight into this one? Is there a simpler or adjacent question you could explore with AI first?",
    },
    # Water (Flow of Ideas)
    {
        "index": 9,
        "element": Element.WATER,
        "sub_element": SubElement.ONE,
        "name": "Run Down All Paths",
        "prompt": "What are ALL the possible ways you could use AI to tackle this? List every approach you can think of — tools, prompts, strategies, workflows.",
    },
    {
        "index": 10,
        "element": Element.WATER,
        "sub_element": SubElement.TWO,
        "name": "Embrace Doubt",
        "prompt": "What are you uncertain about in your approach? Where might you be wrong? What would someone who disagrees with your approach say?",
    },
    {
        "index": 11,
        "element": Element.WATER,
        "sub_element": SubElement.THREE,
        "name": "Never Stop",
        "prompt": "Take your best approach and follow it to the end. What happens next? And after that? Where does this chain of thinking lead?",
    },
    # Change (Be Open to Change)
    {
        "index": 12,
        "element": Element.CHANGE,
        "sub_element": SubElement.TRANSFORM,
        "name": "Transform",
        "prompt": "How has thinking through this puzzle changed your understanding? What do you see differently now about how to use AI for this kind of problem?",
    },
]

def get_prompt(index: int) -> dict:
    """Get prompt by index (0-12)"""
    if 0 <= index < len(PROMPTS):
        return PROMPTS[index]
    return None

