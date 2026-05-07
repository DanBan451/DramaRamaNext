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


class CourseIntakeFinalizeRequest(BaseModel):
    crisp_statement: str


class CourseIntakeFinalizeResponse(BaseModel):
    success: bool
    course_id: str


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
    course_id: Optional[str] = None
    position: int
    title: str
    puzzle_text: str
    primary_element: str
    why_this_trains_the_element: str
    domain_connection: str
    bridge_back: str
    status: str
    completed_at: Optional[datetime] = None
    # Persisted stage (1..3). Lets the frontend show "Resume" vs "Begin"
    # on the puzzle list and restore the user back to their stage when
    # they re-open the canvas.
    current_stage: int = 1
    stage3_phase: Optional[str] = None  # 'reflect' | 'bridge' | None
    synthesis: Optional[str] = None


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
    is_nudge: bool = False
    kind: str = "thought"  # 'thought' | 'nudge' | 'reflection'
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


class CanvasChatMessage(BaseModel):
    """One turn in a canvas stage-chat history.

    Kept intentionally minimal. The frontend owns the conversation state;
    we only need enough to assemble a prompt for the LLM."""

    role: str  # "user" | "assistant"
    content: str


class CanvasChatRequest(BaseModel):
    stage: int  # 1, 2, or 3
    history: List[CanvasChatMessage] = []
    user_message: str


class CanvasStageUpdateRequest(BaseModel):
    """PATCH body for /canvas/{cp_id}/stage. Server-side validation also
    clamps to 1..3 (matches the DB CHECK constraint)."""

    current_stage: int


class CanvasNudgesRequest(BaseModel):
    """Inputs to the Stage 2 nudge seeder.

    - `existing_thoughts` is a snapshot of the user's current thoughts at
      the Stage 1 → Stage 2 boundary so the LLM can EXTEND their flow
      rather than start cold.
    - `positions` is a precomputed list of (x, y) where the frontend
      wants each nudge dropped. The frontend knows the canvas geometry
      better than we do (block dimensions, current viewport, etc.) so we
      let it pick. If empty, the server falls back to a 2x2 grid offset
      from origin (used in tests / older clients).
    """

    existing_thoughts: List[str] = []
    positions: List[List[float]] = []  # list of [x, y] pairs


class CanvasNudgesResponse(BaseModel):
    """Response from the Stage 2 fan-shape diagnostic engine.

    `nudges` contains all newly-created nudge thoughts in canvas order:
    - shape='fan': anchor first, then children (anchor + N children)
    - shape='single': one node only
    `connections` contains all newly-created edges:
    - branch_source -> anchor (only if branch_source_thought_id is set on a fan)
    - anchor -> child (one per child, fan only)
    - branch_source -> single (only if branch_source_thought_id is set on a single)
    """
    nudges: List[ThoughtResponse]
    connections: List[ConnectionResponse] = []
    chat_message: Optional[str] = None
    move: Optional[str] = None  # one of MOVES (simplify, push_extreme, ...)
    shape: Optional[str] = None  # "fan" | "single"
    branch_source_thought_id: Optional[str] = None
    already_seeded: bool = False


# ============ Stage 3: Reflection + Bridge + Synthesis ============

class CreateReflectionRequest(BaseModel):
    content: str
    element: Optional[str] = None
    sub_element: Optional[str] = None
    pos_x: float = 0
    pos_y: float = 0


class Stage3ChatRequest(BaseModel):
    history: List[CanvasChatMessage] = []
    user_message: str


class CompletePuzzleResponse(BaseModel):
    status: str  # "completed"
    completed_at: Optional[datetime] = None
    synthesis: Optional[str] = None
