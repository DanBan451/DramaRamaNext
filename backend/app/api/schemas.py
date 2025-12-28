"""
API Schemas - Request and Response models
"""
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

# Session schemas
class SessionStartRequest(BaseModel):
    algorithm_title: str
    algorithm_url: Optional[str] = None

class SessionStartResponse(BaseModel):
    session_id: str
    algorithm_title: str
    current_prompt_index: int
    current_prompt: dict

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

