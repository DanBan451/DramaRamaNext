"""
Domain Entities - Core business objects
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from enum import Enum

class Element(str, Enum):
    EARTH = "earth"
    FIRE = "fire"
    AIR = "air"
    WATER = "water"

class SubElement(str, Enum):
    ONE = "1.0"
    TWO = "2.0"
    THREE = "3.0"

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
    algorithm_title: str
    algorithm_url: Optional[str] = None
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

# The 12 prompts (4 elements × 3 sub-elements)
PROMPTS = [
    # Earth (Deep Understanding)
    {
        "index": 0,
        "element": Element.EARTH,
        "sub_element": SubElement.ONE,
        "name": "Start with Simple",
        "prompt": "What are the absolute basics of this problem? Break it down to its simplest form.",
    },
    {
        "index": 1,
        "element": Element.EARTH,
        "sub_element": SubElement.TWO,
        "name": "Spotlight Specific",
        "prompt": "Create a specific, simple example. What does the problem look like with concrete numbers?",
    },
    {
        "index": 2,
        "element": Element.EARTH,
        "sub_element": SubElement.THREE,
        "name": "Add the Adjective",
        "prompt": "Add an adjective. How would you describe this problem to a colleague? What makes it unique?",
    },
    # Fire (Embrace Failure)
    {
        "index": 3,
        "element": Element.FIRE,
        "sub_element": SubElement.ONE,
        "name": "Fail Fast",
        "prompt": "Fail fast. Write a rough solution even if it's wrong. What's your first instinct?",
    },
    {
        "index": 4,
        "element": Element.FIRE,
        "sub_element": SubElement.TWO,
        "name": "Fail Again",
        "prompt": "Fail again. What went wrong with your first approach? How can you improve it?",
    },
    {
        "index": 5,
        "element": Element.FIRE,
        "sub_element": SubElement.THREE,
        "name": "Fail Intentionally",
        "prompt": "Fail intentionally. What's an extreme or impossible scenario? What breaks your solution?",
    },
    # Air (Create Questions)
    {
        "index": 6,
        "element": Element.AIR,
        "sub_element": SubElement.ONE,
        "name": "Be Your Own Socrates",
        "prompt": "Be your own Socrates. What is the REAL question here? Are you solving the right problem?",
    },
    {
        "index": 7,
        "element": Element.AIR,
        "sub_element": SubElement.TWO,
        "name": "Ask Basic Questions",
        "prompt": "Ask a basic question. What fundamental concept are you missing or taking for granted?",
    },
    {
        "index": 8,
        "element": Element.AIR,
        "sub_element": SubElement.THREE,
        "name": "Ask Another Question",
        "prompt": "Ask another question. What related question might give you insight into this one?",
    },
    # Water (Flow of Ideas)
    {
        "index": 9,
        "element": Element.WATER,
        "sub_element": SubElement.ONE,
        "name": "Run Down All Paths",
        "prompt": "Run down all paths. What are ALL the possible approaches? Don't dismiss any yet.",
    },
    {
        "index": 10,
        "element": Element.WATER,
        "sub_element": SubElement.TWO,
        "name": "Embrace Doubt",
        "prompt": "Embrace doubt. What are you uncertain about? Where might you be wrong?",
    },
    {
        "index": 11,
        "element": Element.WATER,
        "sub_element": SubElement.THREE,
        "name": "Never Stop",
        "prompt": "Never stop. Where does this idea lead? What's the next step after solving this?",
    },
]

def get_prompt(index: int) -> dict:
    """Get prompt by index (0-11)"""
    if 0 <= index < len(PROMPTS):
        return PROMPTS[index]
    return None

