"""
API Routes - HTTP endpoints
"""
from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from typing import List
import asyncio
import re

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
    PuzzleGenerateResponse, PuzzleListResponse, PuzzleOut,
    NudgeLimitResponse,
)
from app.domain.entities import (
    Response, Hint, Element, SubElement, SessionStatus,
    PROMPTS, get_prompt, Puzzle, TeacherFlow, TeacherFlowStep,
)
from app.domain.services import analyze_responses, build_hint_prompt, build_puzzle_prompt
from app.adapters.supabase_adapter import (
    SupabaseUserRepository,
    SupabaseSessionRepository,
    SupabaseResponseRepository,
    SupabaseHintRepository,
    SupabasePuzzleRepository,
    SupabaseTeacherFlowRepository,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize repositories
user_repo = SupabaseUserRepository()
session_repo = SupabaseSessionRepository()
response_repo = SupabaseResponseRepository()
hint_repo = SupabaseHintRepository()
puzzle_repo = SupabasePuzzleRepository()
teacher_flow_repo = SupabaseTeacherFlowRepository()
llm_client = ClaudeStreamingAdapter()

NUDGE_LIMIT_PER_PUZZLE = 5

# ============ Session Endpoints ============

@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new session for a puzzle"""
    user = current_user["db_user"]
    
    # Verify puzzle exists
    puzzle = await puzzle_repo.get_by_id(request.puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    
    # Check if there's already an active session for this puzzle
    existing_session = await session_repo.get_active_session_for_puzzle(
        user_id=user.id,
        puzzle_id=request.puzzle_id,
    )
    if existing_session:
        current_prompt = get_prompt(existing_session.prompts_completed)
        return SessionStartResponse(
            session_id=existing_session.id,
            puzzle_id=existing_session.puzzle_id,
            current_prompt_index=existing_session.prompts_completed,
            current_prompt=current_prompt,
        )
    
    # Create new session
    session = await session_repo.create(
        user_id=user.id,
        puzzle_id=request.puzzle_id,
    )
    
    first_prompt = get_prompt(0)
    
    return SessionStartResponse(
        session_id=session.id,
        puzzle_id=session.puzzle_id,
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
    
    # Check if session is complete (13 prompts: 12 + Change/Transform)
    session_complete = prompts_completed >= 13
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
    Analyze session responses and stream a personalized nudge.
    Returns SSE stream.
    Matches user responses to teacher flows for targeted coaching.
    """
    # Auth: EventSource can't send Authorization headers reliably, so allow ?token=... for SSE.
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
    
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Enforce nudge limits (unless dev email)
    is_dev = (user.email or "").lower() == (settings.DEV_EMAIL or "").lower() and settings.DEV_EMAIL
    if not is_dev and session.puzzle_id:
        used = await hint_repo.count_hints_for_puzzle_user(user.id, session.puzzle_id)
        if used >= NUDGE_LIMIT_PER_PUZZLE:
            raise HTTPException(status_code=429, detail=f"Nudge limit reached ({NUDGE_LIMIT_PER_PUZZLE} per puzzle)")
    
    # Get all responses
    responses = await response_repo.get_session_responses(session_id)
    
    if len(responses) < 1:
        raise HTTPException(status_code=400, detail="At least one response is required before requesting a nudge.")
    
    # Analyze responses
    analysis = analyze_responses(responses)
    
    # Get puzzle for context
    puzzle = await puzzle_repo.get_by_id(session.puzzle_id) if session.puzzle_id else None
    puzzle_scenario = puzzle.scenario if puzzle else "Unknown puzzle"
    puzzle_constraints = puzzle.constraints if puzzle else []
    
    # Match teacher flows
    matched_flow_steps = None
    matched_flow_id = None
    if session.puzzle_id:
        flows = await teacher_flow_repo.get_flows_for_puzzle(session.puzzle_id)
        if flows:
            matched_flow = _match_best_flow(responses, flows)
            if matched_flow:
                matched_flow_id = matched_flow.id
                matched_flow_steps = [s.model_dump() for s in matched_flow.steps]
    
    # Build prompt for Claude
    prompt = build_hint_prompt(
        puzzle_scenario=puzzle_scenario,
        puzzle_constraints=puzzle_constraints,
        responses=responses,
        analysis=analysis,
        matched_flow_steps=matched_flow_steps,
    )
    
    async def generate():
        """SSE generator for streaming nudge from Claude."""
        hint_text = ""
        
        async for chunk in llm_client.generate_stream(prompt, max_tokens=500):
            hint_text += chunk
            yield f"data: {chunk}\n\n"

        # Save hint to database (best-effort)
        try:
            hint = Hint(
                id="",
                session_id=session_id,
                hint_text=hint_text or "(empty nudge)",
                element_focus=Element(analysis["strongest_element"]) if analysis.get("strongest_element") else None,
                patterns_detected=analysis,
                matched_flow_id=matched_flow_id,
            )
            await hint_repo.create(hint)
        except Exception as e:
            logger.warning(f"Failed to save hint: {e}")

        yield "data: [DONE]\n\n"
    
    return StreamingResponse(
        generate(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
        }
    )


def _match_best_flow(responses: list, flows: list) -> TeacherFlow | None:
    """
    Match user responses to the closest teacher flow using keyword overlap.
    Returns the best-matching flow or None.
    """
    if not flows or not responses:
        return None
    
    import re
    
    def tokenize(text: str) -> set:
        return set(re.findall(r'\w{3,}', (text or '').lower()))
    
    # Build user token set from all responses
    user_tokens = set()
    for r in responses:
        user_tokens |= tokenize(r.response_text)
    
    best_flow = None
    best_score = -1
    
    for flow in flows:
        flow_tokens = set()
        for step in flow.steps:
            flow_tokens |= tokenize(step.response)
            flow_tokens |= tokenize(step.insight)
        
        if not flow_tokens:
            continue
        
        overlap = len(user_tokens & flow_tokens)
        # Normalize by flow size to avoid bias toward longer flows
        score = overlap / len(flow_tokens)
        
        if score > best_score:
            best_score = score
            best_flow = flow
    
    return best_flow

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
        # Fetch puzzle title for display
        puzzle_title = "Unknown Puzzle"
        if s.puzzle_id:
            puzzle = await puzzle_repo.get_by_id(s.puzzle_id)
            if puzzle:
                puzzle_title = puzzle.title
        sessions_data.append({
            "id": s.id,
            "puzzle_id": s.puzzle_id,
            "puzzle_title": puzzle_title,
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
    
    # Get puzzle info
    puzzle = await puzzle_repo.get_by_id(session.puzzle_id) if session.puzzle_id else None
    
    return SessionDetailResponse(
        session={
            "id": session.id,
            "puzzle_id": session.puzzle_id,
            "puzzle_title": puzzle.title if puzzle else "Unknown Puzzle",
            "puzzle_scenario": puzzle.scenario if puzzle else "",
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


# ============ Puzzle Endpoints ============

@router.get("/puzzles", response_model=PuzzleListResponse)
async def list_puzzles():
    """List all available puzzles (solution field excluded)."""
    puzzles = await puzzle_repo.get_all()
    return PuzzleListResponse(
        puzzles=[
            PuzzleOut(
                id=p.id,
                title=p.title,
                scenario=p.scenario,
                constraints=p.constraints,
                example=p.example,
                created_at=p.created_at.isoformat() if p.created_at else None,
            )
            for p in puzzles
        ]
    )


@router.get("/puzzles/{puzzle_id}")
async def get_puzzle(puzzle_id: str):
    """Get a single puzzle by ID (solution excluded)."""
    puzzle = await puzzle_repo.get_by_id(puzzle_id)
    if not puzzle:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    return PuzzleOut(
        id=puzzle.id,
        title=puzzle.title,
        scenario=puzzle.scenario,
        constraints=puzzle.constraints,
        example=puzzle.example,
        created_at=puzzle.created_at.isoformat() if puzzle.created_at else None,
    )


@router.post("/puzzle/generate", response_model=PuzzleGenerateResponse)
async def generate_puzzle(
    topic: str,
    current_user: dict = Depends(get_current_user),
):
    """
    Generate an AI-utilization puzzle. Dev-only endpoint (gated by DEV_EMAIL).
    Also triggers Teacher Agent flow generation in the background.
    """
    user = current_user["db_user"]
    
    # Gate: dev email only
    print(f"[DEBUG] user.email={user.email!r}, DEV_EMAIL={settings.DEV_EMAIL!r}")
    if not settings.DEV_EMAIL or (user.email or "").lower() != settings.DEV_EMAIL.lower():
        raise HTTPException(status_code=403, detail="Puzzle generation is restricted to developer accounts")
    
    # Generate puzzle via LLM
    prompt = build_puzzle_prompt(topic)
    raw = await llm_client.generate_text(prompt, max_tokens=1500)
    
    # Parse JSON response
    try:
        # Strip markdown fences if present
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            cleaned = cleaned.strip()
        puzzle_data = json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=500, detail=f"Failed to parse puzzle JSON from LLM: {raw[:200]}")
    
    # Save puzzle
    puzzle = Puzzle(
        id="",
        title=puzzle_data.get("title", topic),
        scenario=puzzle_data.get("scenario", ""),
        constraints=puzzle_data.get("constraints", []),
        example=puzzle_data.get("example", ""),
        solution=puzzle_data.get("solution", ""),
    )
    saved_puzzle = await puzzle_repo.create(puzzle)
    
    # Trigger Teacher Agent in background
    asyncio.create_task(_generate_teacher_flows(saved_puzzle))
    
    return PuzzleGenerateResponse(
        puzzle_id=saved_puzzle.id,
        title=saved_puzzle.title,
        status="generating_flows",
    )


async def _generate_teacher_flows(puzzle: Puzzle, num_flows: int = 10):
    """
    Background task: Generate N teacher flows for a puzzle.
    Each flow is 13 steps (12 prompts + Change) of elemental thinking.
    """
    for flow_idx in range(num_flows):
        try:
            flow_prompt = _build_teacher_flow_prompt(puzzle, flow_idx)
            raw = await llm_client.generate_text(flow_prompt, max_tokens=4000)
            
            # Parse JSON - with robust cleaning
            cleaned = raw.strip()
            if cleaned.startswith("```"):
                cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
                if cleaned.endswith("```"):
                    cleaned = cleaned[:-3]
                cleaned = cleaned.strip()
            
            # Try to extract JSON object if there's extra text
            json_match = re.search(r'\{[\s\S]*\}', cleaned)
            if json_match:
                cleaned = json_match.group(0)
            
            # Use strict=False to tolerate control chars inside strings
            try:
                flow_data = json.loads(cleaned, strict=False)
            except json.JSONDecodeError:
                # Last resort: escape unescaped newlines inside string values
                cleaned = re.sub(r'(?<=": ")(.*?)(?="[,\s}])', 
                    lambda m: m.group(0).replace('\n', '\\n').replace('\r', '\\r').replace('\t', '\\t'),
                    cleaned, flags=re.DOTALL)
                flow_data = json.loads(cleaned, strict=False)
            
            steps = []
            for step_data in flow_data.get("steps", []):
                steps.append(TeacherFlowStep(
                    element=step_data.get("element", ""),
                    sub_element=step_data.get("sub_element", ""),
                    prompt_name=step_data.get("prompt_name", ""),
                    response=step_data.get("response", ""),
                    insight=step_data.get("insight", ""),
                ))
            
            flow = TeacherFlow(
                id="",
                puzzle_id=puzzle.id,
                flow_index=flow_idx,
                steps=steps,
                solution_reached=flow_data.get("solution_reached", ""),
            )
            await teacher_flow_repo.create(flow)
            logger.info(f"Teacher flow {flow_idx + 1}/{num_flows} generated for puzzle {puzzle.id}")
        except Exception as e:
            logger.error(f"Failed to generate teacher flow {flow_idx} for puzzle {puzzle.id}: {e}")
            continue


def _build_teacher_flow_prompt(puzzle: Puzzle, flow_index: int) -> str:
    """Build the prompt for generating one teacher flow."""
    prompts_list = "\n".join(
        f"{i+1}. [{p['element'].value.upper()} {p['sub_element'].value}] {p['name']}: {p['prompt']}"
        for i, p in enumerate(PROMPTS)
    )
    
    return f"""You are an expert thinker applying the 5 Elements of Effective Thinking to solve an AI-utilization puzzle.

## The Puzzle
**Title:** {puzzle.title}
**Scenario:** {puzzle.scenario}
**Constraints:** {json.dumps(puzzle.constraints)}
**Example:** {puzzle.example}

## The Hidden Solution (for your reference)
{puzzle.solution}

## The 13 Prompts (in order)
{prompts_list}

## Your Task
Generate thinking flow #{flow_index + 1}. Walk through all 13 prompts as if you were a thoughtful student working through this puzzle. Each flow should take a DIFFERENT path through the thinking — different initial approaches, different failures, different questions — but all should eventually converge on the solution.

Output a JSON object:
{{
  "steps": [
    {{
      "element": "earth",
      "sub_element": "1.0",
      "prompt_name": "Start with Simple",
      "response": "A realistic 2-3 sentence response a student might write",
      "insight": "The key insight this step provides toward the solution"
    }}
    // ... 13 steps total (one per prompt, in order)
  ],
  "solution_reached": "1-2 sentence summary of how this flow reaches the solution"
}}

Rules:
- Each flow must be COHERENT — later steps should build on earlier ones.
- Flow #{flow_index + 1} should explore a DIFFERENT initial approach than other flows.
- Responses should sound like real student thinking, not perfect answers.
- Insights should capture the genuine learning at each step.
- Output ONLY the JSON object."""


@router.get("/session/{session_id}/nudge-limit", response_model=NudgeLimitResponse)
async def get_nudge_limit(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Check how many nudges the user has used for this puzzle."""
    user = current_user["db_user"]
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    is_dev = (user.email or "").lower() == (settings.DEV_EMAIL or "").lower() and settings.DEV_EMAIL
    
    if is_dev:
        return NudgeLimitResponse(used=0, limit=0, unlimited=True)
    
    used = 0
    if session.puzzle_id:
        used = await hint_repo.count_hints_for_puzzle_user(user.id, session.puzzle_id)
    
    return NudgeLimitResponse(used=used, limit=NUDGE_LIMIT_PER_PUZZLE, unlimited=False)


# ============ Demo Endpoints (no persistence) ============

@router.post("/demo/nudge", response_model=DemoNudgeResponse)
async def demo_nudge(
    request: DemoNudgeRequest,
    http_request: Request,
):
    """
    Generate a nudge for demo without creating sessions/responses/hints in the DB.
    Auth is required (Bearer token), but we do NOT store anything in Supabase.
    """
    auth_header = http_request.headers.get("authorization") or http_request.headers.get("Authorization")
    if not auth_header or not auth_header.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Missing auth token")

    token = auth_header.split(" ", 1)[1].strip()
    await get_user_from_token(token)

    MIN_WORDS = 20

    if not request.responses or len(request.responses) < 12:
        raise HTTPException(status_code=400, detail="Demo requires 12 responses.")

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

    quality_gate = analysis.get("quality_gate") or {}
    if not bool(quality_gate.get("ok_to_praise", True)):
        return DemoNudgeResponse(
            nudge_text=(
                "I can't accurately assess your strengths from these responses yet — they look like placeholders.\n\n"
                "Try answering with one concrete AI approach. For example:\n"
                "\"I'd start by feeding the raw data into a summarization model, then use the output as context for a second pass...\"\n\n"
                "Next step: go back to prompt 1 and write real, specific thinking."
            ),
            analysis=analysis,
        )

    puzzle_scenario = "Demo puzzle"
    puzzle_constraints = []
    if request.puzzle_id:
        puzzle = await puzzle_repo.get_by_id(request.puzzle_id)
        if puzzle:
            puzzle_scenario = puzzle.scenario
            puzzle_constraints = puzzle.constraints

    prompt = build_hint_prompt(
        puzzle_scenario=puzzle_scenario,
        puzzle_constraints=puzzle_constraints,
        responses=responses,
        analysis=analysis,
    )

    out = ""
    async for chunk in llm_client.generate_stream(prompt, max_tokens=500):
        out += chunk

    return DemoNudgeResponse(nudge_text=out.strip() or "(empty nudge)", analysis=analysis)
