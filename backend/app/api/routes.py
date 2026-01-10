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
    DemoNudgeRequest, DemoNudgeResponse,
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
    # User is automatically created by get_current_user dependency
    user = current_user["db_user"]
    
    # Check if there's already an active session for this problem
    if request.algorithm_url:
        existing_session = await session_repo.get_active_session_for_problem(
            user_id=user.id,
            algorithm_url=request.algorithm_url
        )
        if existing_session:
            # Return the existing session instead of creating a duplicate
            current_prompt = get_prompt(existing_session.prompts_completed)
            return SessionStartResponse(
                session_id=existing_session.id,
                algorithm_title=existing_session.algorithm_title,
                current_prompt_index=existing_session.prompts_completed,
                current_prompt=current_prompt,
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
    user = current_user["db_user"]
    
    # Get session
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    if session.user_id != user.id:
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
    # Note: We need to manually get_or_create here since we're not using the dependency
    if token:
        jwt_user = await get_user_from_token(token)
    else:
        auth_header = request.headers.get("authorization") or request.headers.get("Authorization")
        if not auth_header or not auth_header.lower().startswith("bearer "):
            raise HTTPException(status_code=401, detail="Missing auth token")
        jwt_user = await get_user_from_token(auth_header.split(" ", 1)[1].strip())
    
    # Ensure user exists in database
    user = await user_repo.get_or_create(
        clerk_id=jwt_user["user_id"],
        email=jwt_user.get("email")
    )

    # Get session
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    if session.user_id != user.id:
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
        """SSE generator for streaming hint from Claude."""
        hint_text = ""
        
        # Stream hint from Claude
        async for chunk in llm_client.generate_stream(prompt):
            hint_text += chunk
            yield f"data: {chunk}\n\n"

        # Save hint to database (best-effort)
        try:
            hint = Hint(
                id="",
                session_id=session_id,
                hint_text=hint_text or "(empty hint)",
                element_focus=Element(analysis["strongest_element"]) if analysis.get("strongest_element") else None,
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
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    if session.user_id != user.id:
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
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.user_id != user.id:
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
    user = current_user["db_user"]
    
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
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    if session.user_id != user.id:
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
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    deleted = await session_repo.delete(session_id)
    return {"success": deleted}

@router.get("/user/stats", response_model=DashboardStatsResponse)
async def get_user_stats(
    current_user: dict = Depends(get_current_user)
):
    """Get dashboard stats for current user"""
    user = current_user["db_user"]
    
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


# ============ Demo Endpoints (no persistence) ============

@router.post("/demo/nudge", response_model=DemoNudgeResponse)
async def demo_nudge(
    request: DemoNudgeRequest,
    http_request: Request,
):
    """
    Generate a "nudge" for the HQ demo without creating sessions/responses/hints in the DB.
    Auth is required (Bearer token), but we do NOT store anything in Supabase.
    """
    auth_header = http_request.headers.get("authorization") or http_request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = auth_header.split(" ", 1)[1].strip()
    # Validate token (no DB writes)
    await get_user_from_token(token)

    MIN_WORDS = 20

    if not request.responses or len(request.responses) < 12:
        raise HTTPException(status_code=400, detail="Demo requires 12 responses.")

    # Build Response entities in-memory (no persistence)
    responses: list[Response] = []
    for r in request.responses[:12]:
        prompt_info = get_prompt(r.prompt_index)
        if not prompt_info:
            raise HTTPException(status_code=400, detail=f"Invalid prompt_index: {r.prompt_index}")

        response_text = (r.response_text or "").strip()
        wc = len(response_text.split())
        if wc < MIN_WORDS:
            raise HTTPException(
                status_code=400,
                detail=f"Response for prompt_index={r.prompt_index} is too short ({wc} words). Minimum is {MIN_WORDS} words.",
            )
        responses.append(
            Response(
                id="",
                session_id="demo",
                prompt_index=r.prompt_index,
                element=Element(prompt_info["element"]),
                sub_element=SubElement(prompt_info["sub_element"]),
                response_text=response_text,
                word_count=wc,
                time_spent_seconds=int(r.time_spent_seconds or 0),
            )
        )

    analysis = analyze_responses(responses)

    # If the user provided placeholder/low-signal responses, do not waste LLM calls
    # and do not fabricate "strengths". Return an honest, grounded coaching message.
    quality_gate = analysis.get("quality_gate") or {}
    if not bool(quality_gate.get("ok_to_praise", True)):
        return DemoNudgeResponse(
            nudge_text=(
                "I can’t accurately assess your strengths from these responses yet—they read like placeholders or very low-signal text.\n\n"
                "Try answering with one concrete example. For Two Sum, for example:\n"
                "“Let me use nums=[2,7,11,15], target=9. I’ll scan left to right and keep track of what I need to reach the target. "
                "When I see 2, I need 7; when I see 7, I’ve found the needed partner.”\n\n"
                "Next step: go back to prompt 1 and write real, specific thinking (examples, assumptions, edge cases, and what you’d try first)."
            ),
            analysis=analysis,
        )

    prompt = build_hint_prompt(
        algorithm_title=request.algorithm_title or "Two Sum",
        algorithm_url=request.algorithm_url or "",
        responses=responses,
        analysis=analysis,
    )

    # Collect the streaming output into one string for the demo
    out = ""
    async for chunk in llm_client.generate_stream(prompt):
        out += chunk

    return DemoNudgeResponse(nudge_text=out.strip() or "(empty nudge)", analysis=analysis)

