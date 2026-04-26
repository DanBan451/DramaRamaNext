"""
API Schemas - Request and Response models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Session schemas
class SessionStartRequest(BaseModel):
    problem_description: str
    puzzle_id: Optional[str] = None

class SessionStartResponse(BaseModel):
    session_id: str
    problem_description: str
    first_message: Optional[str] = None  # Opening question from chatbot
    cube_primary_color: Optional[str] = None
    cube_secondary_color: Optional[str] = None
    cube_complexity: Optional[int] = None
    cube_label: Optional[str] = None
    cube_image_url: Optional[str] = None

class ResponseSubmitRequest(BaseModel):
    session_id: str
    prompt_index: int
    response_text: str
    time_spent_seconds: int

class ResponseSubmitResponse(BaseModel):
    success: bool
    prompts_completed: int
    next_prompt: Optional[dict] = None
    session_complete: bool = False

class SessionCompleteRequest(BaseModel):
    session_id: str
    final_response: Optional[str] = None

class SessionCancelRequest(BaseModel):
    session_id: str
    reason: Optional[str] = None

# User schemas
class UserSessionsResponse(BaseModel):
    sessions: List[dict]
    total_count: int

class SessionDetailResponse(BaseModel):
    session: dict
    responses: List[dict]
    hint: Optional[dict] = None

# Dashboard schemas
class DashboardStatsResponse(BaseModel):
    total_sessions: int
    completed_sessions: int
    total_joules: int
    current_streak: int
    element_breakdown: dict
    archetype_name: Optional[str] = None
    archetype_description: Optional[str] = None
    strongest_element: Optional[str] = None
    avatar_image_url: Optional[str] = None

# Prompt schemas
class PromptResponse(BaseModel):
    index: int
    element: str
    sub_element: str
    name: str
    prompt: str


# Puzzle schemas
class PuzzleOut(BaseModel):
    id: str
    title: str
    scenario: str
    constraints: List[str]
    example: str
    created_at: Optional[str] = None

class PuzzleListResponse(BaseModel):
    puzzles: List[PuzzleOut]

class PuzzleGenerateResponse(BaseModel):
    puzzle_id: str
    title: str
    status: str

class NudgeLimitResponse(BaseModel):
    used: int
    limit: int
    unlimited: bool


# Deep Understanding schemas
class ExtractUnderstandingRequest(BaseModel):
    prompt_index: int
    element: str

class ExtractUnderstandingResponse(BaseModel):
    insight_text: str
    element: str
    prompt_index: int

class DeepUnderstandingEntry(BaseModel):
    id: str
    prompt_index: int
    element: str
    insight_text: str
    created_at: Optional[str] = None

class DeepUnderstandingResponse(BaseModel):
    insights: List[DeepUnderstandingEntry]


# Chat schemas (new chatbot architecture)
class ChatRequest(BaseModel):
    user_message: str

class ChatResponse(BaseModel):
    assistant_message: str
    element_applied: str
    insight: Optional[str] = None  # Extracted insight for Deep Understanding Document


# ============ Course schemas (Phase 2) ============

class CourseIntakeStartResponse(BaseModel):
    course_id: str


class CourseIntakeMessageRequest(BaseModel):
    user_message: str


class CourseSummary(BaseModel):
    id: str
    intake_status: str
    course_status: str
    crisp_statement: Optional[str] = None
    domain: Optional[str] = None
    generation_error: Optional[str] = None
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class UserCoursesResponse(BaseModel):
    courses: List[CourseSummary]
    total_count: int


class CourseDetailResponse(BaseModel):
    course: CourseSummary
    intake_messages: List[dict]


# Phase 3 — Course puzzles & retry

class CoursePuzzleResponse(BaseModel):
    id: str
    position: int
    title: str
    puzzle_text: str
    primary_element: str
    why_this_trains_the_element: str
    domain_connection: str
    bridge_back: str
    status: str
    completed_at: Optional[datetime] = None


class CoursePuzzlesResponse(BaseModel):
    puzzles: List[CoursePuzzleResponse]


class RetryGenerationResponse(BaseModel):
    success: bool
    course_id: str


# ============ Canvas schemas (Phase 4b) ============

class ThoughtCreateRequest(BaseModel):
    content: str
    element: Optional[str] = None
    sub_element: Optional[str] = None
    pos_x: float = 0
    pos_y: float = 0
    time_spent_seconds: Optional[int] = None


class ThoughtUpdatePositionRequest(BaseModel):
    pos_x: float
    pos_y: float


class ThoughtUpdateContentRequest(BaseModel):
    content: str


class ThoughtUpdateTaggingRequest(BaseModel):
    element: Optional[str] = None
    sub_element: Optional[str] = None


class ThoughtResponse(BaseModel):
    id: str
    course_puzzle_id: str
    element: Optional[str] = None
    sub_element: Optional[str] = None
    content: str
    flow_order: int
    time_spent_seconds: Optional[int] = None
    pos_x: float
    pos_y: float
    created_at: Optional[datetime] = None
    updated_at: Optional[datetime] = None


class ConnectionCreateRequest(BaseModel):
    from_thought_id: str
    to_thought_id: str


class ConnectionResponse(BaseModel):
    id: str
    course_puzzle_id: str
    from_thought_id: str
    to_thought_id: str
    created_at: Optional[datetime] = None


class CanvasStateResponse(BaseModel):
    """Single round-trip payload for the canvas page on mount."""
    course_puzzle: CoursePuzzleResponse
    thoughts: List[ThoughtResponse]
    connections: List[ConnectionResponse]


class DevRedirectResponse(BaseModel):
    course_puzzle_id: str
