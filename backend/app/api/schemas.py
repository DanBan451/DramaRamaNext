"""
API Schemas - Request and Response models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Session schemas
class SessionStartRequest(BaseModel):
    problem_description: str

class SessionStartResponse(BaseModel):
    session_id: str
    problem_description: str

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

