"""
API Routes - HTTP endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List
import asyncio

from app.core.security import get_current_user, get_user_from_token
from app.core.config import settings
from app.api.schemas import (
    SessionStartRequest, SessionStartResponse,
    ResponseSubmitRequest, ResponseSubmitResponse,
    SessionCompleteRequest,
    SessionCancelRequest,
    UserSessionsResponse, SessionDetailResponse,
    DashboardStatsResponse, PromptResponse,
)
from app.domain.entities import (
    Response, Hint, Element, SubElement, SessionStatus,
    PROMPTS, get_prompt,
)
from app.domain.services import analyze_responses, build_hint_prompt
from app.adapters.supabase_adapter import (
    SupabaseUserRepository,
    SupabaseSessionRepository,
    SupabaseResponseRepository,
    SupabaseHintRepository,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter

router = APIRouter()

# Initialize repositories
user_repo = SupabaseUserRepository()
session_repo = SupabaseSessionRepository()
response_repo = SupabaseResponseRepository()
hint_repo = SupabaseHintRepository()
llm_client = ClaudeStreamingAdapter()

# ============ Session Endpoints ============

@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new MUYOM session"""
    # Get or create user in our database
    user = await user_repo.get_or_create(
        clerk_id=current_user["user_id"],
        email=current_user.get("email")
    )
    
    # Create new session
    session = await session_repo.create(
        user_id=user.id,
        algorithm_title=request.algorithm_title,
        algorithm_url=request.algorithm_url,
    )
    
    # Get first prompt
    first_prompt = get_prompt(0)
    
    return SessionStartResponse(
        session_id=session.id,
        algorithm_title=session.algorithm_title,
        current_prompt_index=0,
        current_prompt=first_prompt,
    )

@router.post("/session/respond", response_model=ResponseSubmitResponse)
async def submit_response(
    request: ResponseSubmitRequest,
    current_user: dict = Depends(get_current_user)
):
    """Submit a response to the current prompt"""
    # Get session
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get prompt info
    prompt_info = get_prompt(request.prompt_index)
    if not prompt_info:
        raise HTTPException(status_code=400, detail="Invalid prompt index")
    
    # Calculate word count
    word_count = len(request.response_text.split())
    
    # Create response
    response = Response(
        id="",  # Will be set by database
        session_id=request.session_id,
        prompt_index=request.prompt_index,
        element=Element(prompt_info["element"]),
        sub_element=SubElement(prompt_info["sub_element"]),
        response_text=request.response_text,
        word_count=word_count,
        time_spent_seconds=request.time_spent_seconds,
    )
    
    await response_repo.create(response)
    
    # Update session
    prompts_completed = request.prompt_index + 1
    await session_repo.update(session.id, prompts_completed=prompts_completed)
    
    # Check if session is complete
    session_complete = prompts_completed >= 12
    next_prompt = None if session_complete else get_prompt(prompts_completed)
    
    return ResponseSubmitResponse(
        success=True,
        prompts_completed=prompts_completed,
        next_prompt=next_prompt,
        session_complete=session_complete,
    )

@router.get("/session/{session_id}/analyze")
async def analyze_session(
    session_id: str,
    request: Request,
    token: str | None = None,
):
    """
    Analyze session responses and stream a personalized hint.
    Returns SSE stream.
    """
    # Auth: EventSource can't send Authorization headers reliably, so allow ?token=... for SSE.
    if token:
        current_user = await get_user_from_token(token)
    else:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing auth token")
        current_user = await get_user_from_token(auth_header.split(" ", 1)[1].strip())

    # Get session
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get all responses
    responses = await response_repo.get_session_responses(session_id)
    
    if len(responses) < 12:
        raise HTTPException(status_code=400, detail="Session not complete. Need 12 responses.")
    
    # Analyze responses
    analysis = analyze_responses(responses)
    
    # Build prompt for Claude
    prompt = build_hint_prompt(
        algorithm_title=session.algorithm_title,
        algorithm_url=session.algorithm_url or "",
        responses=responses,
        analysis=analysis,
    )
    
    async def generate():
        """
        SSE generator. If Anthropic isn't configured, fall back to a deterministic hint so the
        full extension flow can be tested locally.
        """
        hint_text = ""
        try:
            if not settings.ANTHROPIC_API_KEY:
                hint_text = (
                    "Dev mode hint (no Anthropic key configured).\n\n"
                    "Review your shortest responses and pick ONE element to go deeper on.\n"
                    "Try rewriting your Earth 1.0 answer with a concrete example and explicit constraints."
                )
                yield f"data: {hint_text}\n\n"
            else:
                async for chunk in llm_client.generate_stream(prompt):
                    hint_text += chunk
                    yield f"data: {chunk}\n\n"
        except Exception:
            if not hint_text:
                hint_text = (
                    "Hint generation failed (stream error). "
                    "Still, your session is saved—review your Earth responses and ground them with a specific example."
                )
                yield f"data: {hint_text}\n\n"

        # Save hint to database (best-effort)
        try:
            hint = Hint(
                id="",
                session_id=session_id,
                hint_text=hint_text or "(empty hint)",
                element_focus=Element(analysis["weakest_element"]) if analysis.get("weakest_element") else None,
                patterns_detected=analysis,
            )
            await hint_repo.create(hint)
        except Exception:
            # Don't fail the stream if saving hint fails
            pass

        # Mark session as completed (best-effort)
        try:
            await session_repo.update(session_id, status=SessionStatus.COMPLETED)
        except Exception:
            pass

        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )

@router.post("/session/complete")
async def complete_session(
    request: SessionCompleteRequest,
    current_user: dict = Depends(get_current_user)
):
    """Complete a session after receiving hint"""
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Update hint with final response if provided
    if request.final_response:
        hint = await hint_repo.get_by_session_id(request.session_id)
        if hint:
            await hint_repo.update(hint.id, user_final_response=request.final_response)
    
    # Mark session complete
    from datetime import datetime
    await session_repo.update(
        request.session_id,
        status=SessionStatus.COMPLETED,
        ended_at=datetime.now()
    )
    
    return {"success": True}


@router.post("/session/cancel")
async def cancel_session(
    request: SessionCancelRequest,
    current_user: dict = Depends(get_current_user)
):
    """Cancel (abandon) a session."""
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    from datetime import datetime
    await session_repo.update(
        request.session_id,
        status=SessionStatus.ABANDONED,
        ended_at=datetime.now(),
    )
    return {"success": True}

# ============ User Endpoints ============

@router.get("/user/sessions", response_model=UserSessionsResponse)
async def get_user_sessions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user)
):
    """Get all sessions for the current user"""
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user:
        return UserSessionsResponse(sessions=[], total_count=0)
    
    sessions = await session_repo.get_user_sessions(user.id, limit)
    
    sessions_data = []
    for s in sessions:
        sessions_data.append({
            "id": s.id,
            "algorithm_title": s.algorithm_title,
            "algorithm_url": s.algorithm_url,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "status": s.status.value,
            "prompts_completed": s.prompts_completed,
        })
    
    return UserSessionsResponse(
        sessions=sessions_data,
        total_count=len(sessions_data)
    )

@router.get("/user/sessions/{session_id}", response_model=SessionDetailResponse)
async def get_session_detail(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Get detailed session with responses and hint"""
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Get responses
    responses = await response_repo.get_session_responses(session_id)
    
    # Get hint
    hint = await hint_repo.get_by_session_id(session_id)
    
    return SessionDetailResponse(
        session={
            "id": session.id,
            "algorithm_title": session.algorithm_title,
            "algorithm_url": session.algorithm_url,
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "status": session.status.value,
            "prompts_completed": session.prompts_completed,
        },
        responses=[{
            "id": r.id,
            "prompt_index": r.prompt_index,
            "element": r.element.value,
            "sub_element": r.sub_element.value,
            "response_text": r.response_text,
            "word_count": r.word_count,
            "time_spent_seconds": r.time_spent_seconds,
            "prompt": get_prompt(r.prompt_index),
        } for r in responses],
        hint={
            "id": hint.id,
            "hint_text": hint.hint_text,
            "element_focus": hint.element_focus.value if hint.element_focus else None,
            "patterns_detected": hint.patterns_detected,
            "user_final_response": hint.user_final_response,
        } if hint else None,
    )


@router.delete("/user/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a session (and its responses/hints via cascade)."""
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user or session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    deleted = await session_repo.delete(session_id)
    return {"success": deleted}

@router.get("/user/stats", response_model=DashboardStatsResponse)
async def get_user_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard stats for current user"""
    user = await user_repo.get_by_clerk_id(current_user["user_id"])
    if not user:
        return DashboardStatsResponse(
            total_sessions=0,
            completed_sessions=0,
            total_joules=0,
            current_streak=0,
            element_breakdown={"earth": 0, "fire": 0, "air": 0, "water": 0},
        )
    
    sessions = await session_repo.get_user_sessions(user.id, limit=100)
    
    completed = [s for s in sessions if s.status == SessionStatus.COMPLETED]
    
    # Calculate joules (simplified: 10 joules per completed prompt)
    total_joules = sum(s.prompts_completed * 10 for s in sessions)
    
    # Calculate streak (simplified: consecutive days with sessions)
    streak = 0
    if sessions:
        from datetime import date, timedelta
        today = date.today()
        current_date = today
        session_dates = set(s.started_at.date() for s in sessions if s.started_at)
        
        while current_date in session_dates or (current_date == today and sessions):
            streak += 1
            current_date -= timedelta(days=1)
        
        # If no session today, start checking from yesterday
        if today not in session_dates:
            streak = 0
            current_date = today - timedelta(days=1)
            while current_date in session_dates:
                streak += 1
                current_date -= timedelta(days=1)
    
    # Element breakdown (count responses per element)
    element_counts = {"earth": 0, "fire": 0, "air": 0, "water": 0}
    for s in sessions:
        responses = await response_repo.get_session_responses(s.id)
        for r in responses:
            if r.element.value in element_counts:
                element_counts[r.element.value] += r.word_count
    
    return DashboardStatsResponse(
        total_sessions=len(sessions),
        completed_sessions=len(completed),
        total_joules=total_joules,
        current_streak=streak,
        element_breakdown=element_counts,
    )

# ============ Prompts Endpoint ============

@router.get("/prompts", response_model=List[PromptResponse])
async def get_all_prompts():
    """Get all 12 prompts"""
    return [
        PromptResponse(
            index=p["index"],
            element=p["element"].value,
            sub_element=p["sub_element"].value,
            name=p["name"],
            prompt=p["prompt"],
        )
        for p in PROMPTS
    ]

