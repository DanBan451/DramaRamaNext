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

# The 12 prompts + Change (4 elements × 3 sub-elements + 1)
# MUYAIUM: AI-utilization wording. Original prompt names from the book retained.
PROMPTS = [
    # Earth (Deep Understanding)
    {
        "index": 0,
        "element": Element.EARTH,
        "sub_element": SubElement.ONE,
        "name": "Start with Simple",
        "prompt": "What are the fundamentals of this problem that you'd need to ground yourself in before using AI? What context is essential?",
    },
    {
        "index": 1,
        "element": Element.EARTH,
        "sub_element": SubElement.TWO,
        "name": "Spotlight Specific",
        "prompt": "Create a simpler, concrete version of this scenario. What would a minimal example look like?",
    },
    {
        "index": 2,
        "element": Element.EARTH,
        "sub_element": SubElement.THREE,
        "name": "Add the Adjective",
        "prompt": "Add a descriptor to your approach. Is it iterative? Exploratory? Defensive? How does that lens change how you'd tackle this with AI?",
    },
    # Fire (Embrace Failure)
    {
        "index": 3,
        "element": Element.FIRE,
        "sub_element": SubElement.ONE,
        "name": "Fail Fast",
        "prompt": "Try something — even if it's wrong. What's your rough first attempt at solving this with AI?",
    },
    {
        "index": 4,
        "element": Element.FIRE,
        "sub_element": SubElement.TWO,
        "name": "Fail Again",
        "prompt": "What went wrong with that attempt? Where did the AI approach break down?",
    },
    {
        "index": 5,
        "element": Element.FIRE,
        "sub_element": SubElement.THREE,
        "name": "Fail Intentionally",
        "prompt": "What's an extreme or impossible AI approach? What does that failure teach you about the right approach?",
    },
    # Air (Create Questions)
    {
        "index": 6,
        "element": Element.AIR,
        "sub_element": SubElement.ONE,
        "name": "Be Your Own Socrates",
        "prompt": "What is the REAL question here? Are you even approaching the right problem with AI?",
    },
    {
        "index": 7,
        "element": Element.AIR,
        "sub_element": SubElement.TWO,
        "name": "Ask Basic Questions",
        "prompt": "What fundamental concept about this domain or these AI tools are you missing?",
    },
    {
        "index": 8,
        "element": Element.AIR,
        "sub_element": SubElement.THREE,
        "name": "Ask Another Question",
        "prompt": "What related problem might give you insight into this one? Is there an adjacent question worth exploring?",
    },
    # Water (Flow of Ideas)
    {
        "index": 9,
        "element": Element.WATER,
        "sub_element": SubElement.ONE,
        "name": "Run Down All Paths",
        "prompt": "What are ALL the possible approaches to solving this with AI? Map out every path.",
    },
    {
        "index": 10,
        "element": Element.WATER,
        "sub_element": SubElement.TWO,
        "name": "Embrace Doubt",
        "prompt": "What are you uncertain about? Where might your AI approach be wrong?",
    },
    {
        "index": 11,
        "element": Element.WATER,
        "sub_element": SubElement.THREE,
        "name": "Never Stop",
        "prompt": "Follow your best approach to its conclusion. Where does it lead? What's the next step after that?",
    },
    # Change (Be Open to Change)
    {
        "index": 12,
        "element": Element.CHANGE,
        "sub_element": SubElement.TRANSFORM,
        "name": "Transform",
        "prompt": "How has thinking through this puzzle changed how you'd approach AI-assisted work?",
    },
]

def get_prompt(index: int) -> dict:
    """Get prompt by index (0-12)"""
    if 0 <= index < len(PROMPTS):
        return PROMPTS[index]
    return None

