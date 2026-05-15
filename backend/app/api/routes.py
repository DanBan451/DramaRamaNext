"""
API Routes - HTTP endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List, Optional
import re

from app.core.security import get_current_user
from app.core.config import settings
from app.core.rate_limiter import rate_limit_user
from app.api.schemas import (
    SessionStartRequest, SessionStartResponse,
    SessionCompleteRequest,
    SessionCancelRequest,
    UserSessionsResponse, SessionDetailResponse,
    DashboardStatsResponse,
    ExtractUnderstandingRequest, ExtractUnderstandingResponse,
    ChatRequest,
    CourseIntakeStartResponse, CourseIntakeMessageRequest,
    CourseIntakeFinalizeRequest, CourseIntakeFinalizeResponse,
    CourseSummary, UserCoursesResponse, CourseDetailResponse,
    CoursePuzzleResponse, CoursePuzzlesResponse, RetryGenerationResponse,
    ThoughtCreateRequest, ThoughtUpdatePositionRequest,
    ThoughtUpdateContentRequest, ThoughtUpdateTaggingRequest,
    ThoughtResponse, ConnectionCreateRequest, ConnectionResponse,
    CanvasStateResponse, DevRedirectResponse,
    CanvasChatRequest,
    CanvasNudgesRequest, CanvasNudgesResponse,
    CanvasStageUpdateRequest,
    CreateReflectionRequest, Stage3ChatRequest, CompletePuzzleResponse,
    ReflectionAnswersSaveRequest,
    ForgeFireStarterDraftResponse,
    FireStarterCreateRequest,
    FireStarterResponse,
)
from app.domain.entities import (
    Response, Hint, Element, SessionStatus,
    Component, ElementMessage, DeepUnderstanding,
    IntakeMessage,
)
from app.domain.services import (
    build_session_completion_prompt, build_extract_understanding_prompt,
    build_extract_insight_prompt, build_batched_chat_prompt,
    build_intake_chatbot_system_prompt,
    build_intake_extraction_prompt,
    build_fire_starter_prompt,
)
from app.adapters.supabase_adapter import (
    SupabaseUserRepository,
    SupabaseSessionRepository,
    SupabaseResponseRepository,
    SupabaseHintRepository,
    SupabaseComponentRepository,
    SupabaseElementMessageRepository,
    SupabaseDeepUnderstandingRepository,
    SupabaseCourseRepository,
    SupabaseCoursePuzzleRepository,
    SupabaseThoughtRepository,
    SupabaseThoughtConnectionRepository,
    SupabaseFireStarterRepository,
    get_supabase_client,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter
from app.adapters.openai_adapter import OpenAIImageAdapter
from app.api.streaming import sse_stream
from app.domain.puzzle_generation import generate_course_puzzles
from fastapi.responses import StreamingResponse
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

router = APIRouter()

# Initialize repositories
user_repo = SupabaseUserRepository()
session_repo = SupabaseSessionRepository()
response_repo = SupabaseResponseRepository()
hint_repo = SupabaseHintRepository()
component_repo = SupabaseComponentRepository()
element_message_repo = SupabaseElementMessageRepository()
deep_understanding_repo = SupabaseDeepUnderstandingRepository()
course_repo = SupabaseCourseRepository()
puzzle_repo = SupabaseCoursePuzzleRepository()
thought_repo = SupabaseThoughtRepository()
connection_repo = SupabaseThoughtConnectionRepository()
fire_starter_repo = SupabaseFireStarterRepository(get_supabase_client())
llm_client = ClaudeStreamingAdapter()
image_client = OpenAIImageAdapter()

# Module-level set to keep references to background tasks so asyncio doesn't
# garbage-collect them mid-execution. Tasks remove themselves via done_callback.
_BACKGROUND_TASKS: set = set()


def _spawn_puzzle_generation(course_id: str) -> None:
    """Fire-and-forget puzzle generation task. Pinned in _BACKGROUND_TASKS."""
    task = asyncio.create_task(
        generate_course_puzzles(
            course_id=course_id,
            course_repo=course_repo,
            puzzle_repo=puzzle_repo,
            llm_client=llm_client,
        )
    )
    _BACKGROUND_TASKS.add(task)
    task.add_done_callback(_BACKGROUND_TASKS.discard)

# ============ Session Endpoints ============

@router.post("/session/start", response_model=SessionStartResponse)
async def start_session(
    request: SessionStartRequest,
    current_user: dict = Depends(get_current_user)
):
    """Start a new session from a problem description and generate opening question"""
    user = current_user["db_user"]
    
    # Rate limit session creation
    if not rate_limit_user(user.id, "session_start"):
        raise HTTPException(
            status_code=429,
            detail="Session creation rate limit exceeded. You can start up to 10 sessions per hour."
        )
    
    if not request.problem_description or not request.problem_description.strip():
        raise HTTPException(status_code=400, detail="Problem description is required")
    
    problem_description = request.problem_description.strip()
    
    # Check for existing active session for the same puzzle (by exact problem_description match).
    # The frontend sends a slug (e.g. "top-10-list") as puzzle_id, but the DB column is a UUID FK,
    # so we match by problem_description instead — single targeted query, no full session list fetch.
    if request.puzzle_id:
        existing = await session_repo.get_active_session_by_description(user.id, problem_description)
        if existing:
            return SessionStartResponse(
                session_id=existing.id,
                problem_description=existing.problem_description,
                first_message=None,
                cube_primary_color=existing.cube_primary_color,
                cube_secondary_color=existing.cube_secondary_color,
                cube_complexity=existing.cube_complexity,
                cube_label=existing.cube_label,
                cube_image_url=existing.cube_image_url,
            )
    
    # Create new session — do NOT pass the frontend slug as puzzle_id (DB expects a UUID)
    session = await session_repo.create(
        user_id=user.id,
        problem_description=problem_description,
    )
    
    return SessionStartResponse(
        session_id=session.id,
        problem_description=session.problem_description,
        first_message=None,
        cube_primary_color=session.cube_primary_color,
        cube_secondary_color=session.cube_secondary_color,
        cube_complexity=session.cube_complexity,
        cube_label=session.cube_label,
        cube_image_url=session.cube_image_url,
    )

@router.post("/session/{session_id}/generate-background")
async def generate_puzzle_background(
    session_id: str,
    current_user: dict = Depends(get_current_user)
):
    """Generate a desaturated background image for the puzzle workspace."""
    user = current_user["db_user"]
    
    # Rate limit image generation
    if not rate_limit_user(user.id, "image_generation"):
        raise HTTPException(
            status_code=429,
            detail="Image generation rate limit exceeded."
        )
    
    session = await session_repo.get_by_id(session_id)
    if not session or session.user_id != user.id:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Extract puzzle title from problem description
    problem_desc = session.problem_description or ""
    puzzle_title = "abstract thinking"
    if "PUZZLE:" in problem_desc:
        lines = problem_desc.split("\n")
        for line in lines:
            if line.startswith("PUZZLE:"):
                puzzle_title = line.replace("PUZZLE:", "").strip()
                break
    
    try:
        # Generate a muted, artistic background - NOT black and white, just desaturated/muted
        image_prompt = f"Minimalist artistic illustration inspired by '{puzzle_title}'. Soft muted tones, very low saturation, gentle grays and subtle warm undertones. Abstract shapes, soft gradients, dreamlike quality. No text, no people, no faces. Suitable as a subtle background texture. Elegant and understated."
        
        background_url = await image_client.generate_image(image_prompt)
        
        return {"success": True, "background_url": background_url}
    except Exception as e:
        logger.error(f"Failed to generate background: {e}")
        return {"success": False, "error": str(e)}

@router.post("/session/{session_id}/chat")
async def chat_with_session(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    Batched chat endpoint: one LLM call returns element + coaching response + updated doc.
    """
    user = current_user["db_user"]
    
    # Rate limit LLM calls
    if not rate_limit_user(user.id, "llm_calls"):
        raise HTTPException(
            status_code=429,
            detail="Rate limit exceeded. Please wait before sending more messages."
        )
    
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    problem_description = session.problem_description or ""
    user_message = request.user_message.strip()
    
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    
    # Save user message
    user_msg = ElementMessage(
        id="",
        session_id=session_id,
        prompt_index=0,
        role="user",
        message_text=user_message,
    )
    await element_message_repo.create(user_msg)
    
    # Get conversation history (including the message just saved)
    all_messages = await element_message_repo.get_all_for_session(session_id)
    conversation_history = [
        {"role": msg.role, "message_text": msg.message_text}
        for msg in all_messages
    ]
    
    # Single batched LLM call: element + coaching response + understanding doc
    prompt = build_batched_chat_prompt(
        problem_description=problem_description,
        conversation_history=conversation_history,
        user_message=user_message,
        existing_document=session.understanding_document or "",
    )
    raw = await llm_client.generate_text(prompt, max_tokens=1800)
    
    # Parse JSON response
    selected_element = "earth"
    assistant_text = ""
    updated_doc = ""
    try:
        cleaned = raw.strip()
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            cleaned = cleaned[:cleaned.rfind("```")] if "```" in cleaned else cleaned
        if cleaned.lower().startswith("json"):
            cleaned = cleaned[4:].strip()
        data = json.loads(cleaned)
        selected_element = data.get("element", "earth").strip().lower()
        assistant_text = data.get("response", "").strip()
        updated_doc = data.get("understanding", "").strip()
    except Exception as e:
        logger.warning(f"Failed to parse batched chat JSON ({e}): {raw[:300]}")
        assistant_text = "What's your gut feeling about this?"
    
    valid_elements = ["earth", "fire", "air", "water", "change"]
    if selected_element not in valid_elements:
        selected_element = "earth"
    
    # Save assistant response
    assistant_msg = ElementMessage(
        id="",
        session_id=session_id,
        prompt_index=0,
        role="assistant",
        message_text=assistant_text,
        element_applied=selected_element,
    )
    await element_message_repo.create(assistant_msg)
    
    # Persist updated understanding doc (skip the no-insights sentinel)
    if updated_doc and updated_doc != "__no_insights__":
        await session_repo.update(session_id, understanding_document=updated_doc)
    
    return {
        "element": selected_element,
        "response": assistant_text,
        "understanding": updated_doc,
    }


@router.post("/session/complete")
async def complete_session(
    request: SessionCompleteRequest,
    current_user: dict = Depends(get_current_user)
):
    """
    Complete a session. Makes a final Claude call to analyze all responses
    and stores the result as a component.
    Returns SSE stream with the analysis.
    """
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(request.session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    # Verify user owns session
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch the actual conversation history
    all_messages = await element_message_repo.get_all_for_session(request.session_id)
    conversation_history = [
        {"role": msg.role, "message_text": msg.message_text, "element_applied": msg.element_applied or ""}
        for msg in all_messages
    ]

    # Get the understanding document from the session
    understanding_doc = session.understanding_document or ""
    
    # Build session completion prompt
    completion_prompt = build_session_completion_prompt(
        problem_description=session.problem_description or "",
        conversation_history=conversation_history,
        understanding_document=understanding_doc,
    )
    
    # Call Claude for session analysis (non-streaming)
    analysis_text = await llm_client.generate_text(completion_prompt, max_tokens=1000)
    
    # Parse JSON analysis from Claude
    component_data = {}
    try:
        cleaned = analysis_text.strip()
        # Strip markdown code fences
        if cleaned.startswith("```"):
            cleaned = cleaned.split("\n", 1)[1] if "\n" in cleaned else cleaned[3:]
            if cleaned.endswith("```"):
                cleaned = cleaned[:-3]
            elif "```" in cleaned:
                cleaned = cleaned[:cleaned.rfind("```")]
            cleaned = cleaned.strip()
        # Remove "json" language tag if present after fence
        if cleaned.startswith("json"):
            cleaned = cleaned[4:].strip()
        # Extract JSON object with regex
        json_match = re.search(r'\{[\s\S]*\}', cleaned)
        if json_match:
            cleaned = json_match.group(0)
        # Remove control characters that break JSON parsing
        cleaned = re.sub(r'[\x00-\x1f\x7f]', ' ', cleaned)
        component_data = json.loads(cleaned, strict=False)
    except (json.JSONDecodeError, Exception) as parse_err:
        logger.warning(f"Failed to parse completion JSON ({parse_err}): {analysis_text[:300]}")
        # Last resort: try to extract fields manually with regex
        title_m = re.search(r'"title"\s*:\s*"([^"]*)"', analysis_text)
        changed_m = re.search(r'"how_you_changed"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        know_m = re.search(r'"what_you_know"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        next_m = re.search(r'"whats_next"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        component_data = {
            "title": title_m.group(1) if title_m else "Session Summary",
            "how_you_changed": changed_m.group(1) if changed_m else analysis_text[:500],
            "what_you_know": know_m.group(1) if know_m else "",
            "whats_next": next_m.group(1) if next_m else "",
        }
    
    # Save component
    try:
        component = Component(
            id="",
            session_id=request.session_id,
            puzzle_id=session.puzzle_id or "",
            user_id=user.id,
            title=component_data.get("title", "Untitled"),
            key_insight=component_data.get("how_you_changed", ""),
            input_context=component_data.get("what_you_know", ""),
            output_capability=component_data.get("whats_next", ""),
        )
        await component_repo.create(component)
    except Exception as e:
        logger.warning(f"Failed to save component: {e}")
    
    # Mark session complete
    from datetime import datetime
    await session_repo.update(
        request.session_id,
        status=SessionStatus.COMPLETED,
        ended_at=datetime.now()
    )
    
    return {
        "success": True,
        "analysis": {
            "title": component_data.get("title", ""),
            "how_you_changed": component_data.get("how_you_changed", ""),
            "what_you_know": component_data.get("what_you_know", ""),
            "whats_next": component_data.get("whats_next", ""),
        },
    }


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
            "puzzle_id": s.puzzle_id,
            "problem_description": s.problem_description or "",
            "component_title": None,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "ended_at": s.ended_at.isoformat() if s.ended_at else None,
            "status": s.status.value,
            "prompts_completed": s.prompts_completed,
            "cube_primary_color": s.cube_primary_color,
            "cube_secondary_color": s.cube_secondary_color,
            "cube_complexity": s.cube_complexity,
            "cube_label": s.cube_label,
            "cube_image_url": s.cube_image_url,
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
            "puzzle_id": session.puzzle_id,
            "problem_description": session.problem_description or "",
            "started_at": session.started_at.isoformat() if session.started_at else None,
            "ended_at": session.ended_at.isoformat() if session.ended_at else None,
            "status": session.status.value,
            "prompts_completed": session.prompts_completed,
            "cube_primary_color": session.cube_primary_color,
            "cube_secondary_color": session.cube_secondary_color,
            "cube_complexity": session.cube_complexity,
            "cube_label": session.cube_label,
            "cube_image_url": session.cube_image_url,
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

@router.post("/user/regenerate-avatar")
async def regenerate_avatar(
    current_user: dict = Depends(get_current_user)
):
    """Manually regenerate the user's avatar image."""
    user = current_user["db_user"]
    
    # Rate limit image generation (expensive operation)
    if not rate_limit_user(user.id, "image_generation"):
        raise HTTPException(
            status_code=429,
            detail="Image generation rate limit exceeded. You can generate up to 5 images per hour."
        )
    
    try:
        # Get element breakdown
        sessions = await session_repo.get_user_sessions(user.id, limit=100)
        element_counts = {"earth": 0, "fire": 0, "air": 0, "water": 0, "change": 0}
        for s in sessions:
            responses = await response_repo.get_session_responses(s.id)
            for r in responses:
                if r.element.value in element_counts:
                    element_counts[r.element.value] += r.word_count
        
        archetype_name = user.archetype_name or "The Thinker"
        sorted_elements = sorted(element_counts.items(), key=lambda x: x[1], reverse=True)
        total_words = sum(element_counts.values()) or 1
        
        # Build brain region emphasis based on element percentages
        region_emphasis = []
        for elem, count in sorted_elements:
            pct = int((count / total_words) * 100)
            if pct >= 15:
                if elem == "earth":
                    region_emphasis.append(f"hippocampus region glowing ({pct}% - memory and foundation)")
                elif elem == "fire":
                    region_emphasis.append(f"prefrontal cortex highlighted ({pct}% - action and experimentation)")
                elif elem == "air":
                    region_emphasis.append(f"temporal lobe illuminated ({pct}% - questioning and language)")
                elif elem == "water":
                    region_emphasis.append(f"corpus callosum bright ({pct}% - connections and flow)")
                elif elem == "change":
                    region_emphasis.append(f"entire neural network pulsing ({pct}% - transformation)")
        
        regions_desc = ", ".join(region_emphasis) if region_emphasis else "balanced neural activity across all regions"
        
        avatar_prompt = f"Minimalist artistic visualization of a human brain, professional scientific illustration style. The brain shows neural pathways and regions with {regions_desc}. COLOR PALETTE: ONLY use white, black, and purple (#9B5DE5). White background, black fine line details, purple for highlights and glowing neural connections. Style: clean, intellectual, modern medical illustration meets abstract art. Subtle geometric patterns in the neural connections. No text, no other colors, elegant and sophisticated. The image should feel professional and cerebral, suitable for a thinking/learning application."
        logger.info(f"Regenerating avatar for user {user.id}")
        avatar_image_url = await image_client.generate_image(avatar_prompt)
        
        if avatar_image_url:
            await user_repo.update_archetype(
                user.id,
                archetype_name=archetype_name,
                archetype_description=user.archetype_description or "A thoughtful problem solver.",
                avatar_image_url=avatar_image_url,
            )
            return {"success": True, "avatar_image_url": avatar_image_url}
        else:
            return {"success": False, "error": "Image generation returned empty URL"}
    except Exception as e:
        logger.error(f"Failed to regenerate avatar: {e}")
        return {"success": False, "error": str(e)}

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
    
    # Determine strongest element
    strongest_element = max(element_counts.items(), key=lambda x: x[1])[0] if any(element_counts.values()) else "earth"
    
    return DashboardStatsResponse(
        total_sessions=len(sessions),
        completed_sessions=len(completed),
        total_joules=total_joules,
        current_streak=streak,
        element_breakdown=element_counts,
        archetype_name=user.archetype_name,
        archetype_description=user.archetype_description,
        strongest_element=strongest_element,
        avatar_image_url=user.avatar_image_url,
    )

@router.get("/session/{session_id}/element-messages")
async def get_element_messages(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get all element_messages for a session, grouped by prompt_index."""
    user = current_user["db_user"]
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    messages = await element_message_repo.get_all_for_session(session_id)
    
    # Group by prompt_index
    by_prompt = {}
    for msg in messages:
        pi = msg.prompt_index
        if pi not in by_prompt:
            by_prompt[pi] = []
        by_prompt[pi].append({
            "id": msg.id,
            "role": msg.role,
            "message_text": msg.message_text,
            "created_at": msg.created_at.isoformat() if msg.created_at else None,
        })
    
    return {"messages": by_prompt}


# ============ Deep Understanding Endpoints ============

@router.post("/session/{session_id}/extract-understanding", response_model=ExtractUnderstandingResponse)
async def extract_understanding(
    session_id: str,
    request: ExtractUnderstandingRequest,
    current_user: dict = Depends(get_current_user),
):
    """Update the unified understanding document based on a nudge exchange."""
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    # Fetch conversation history for this element
    conversation_history = await element_message_repo.get_by_session_and_prompt(session_id, request.prompt_index)
    if not conversation_history:
        raise HTTPException(status_code=400, detail="No conversation history for this element")
    
    # Build extraction prompt with existing document
    prompt = build_extract_understanding_prompt(
        problem_description=session.problem_description or "",
        element=request.element,
        prompt_index=request.prompt_index,
        conversation_history=conversation_history,
        existing_document=session.understanding_document or "",
    )
    
    # Call Claude to update the unified document (non-streaming)
    updated_document = await llm_client.generate_text(prompt, max_tokens=1500)
    updated_document = (updated_document or "").strip()
    
    # Save updated document to session
    try:
        await session_repo.update(session_id, understanding_document=updated_document)
    except Exception as e:
        logger.warning(f"Failed to save understanding document: {e}")
    
    return ExtractUnderstandingResponse(
        insight_text=updated_document,
        element=request.element,
        prompt_index=request.prompt_index,
    )


@router.get("/session/{session_id}/deep-understanding")
async def get_deep_understanding(
    session_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get the unified understanding document for a session."""
    user = current_user["db_user"]
    
    session = await session_repo.get_by_id(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    if session.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not authorized")
    
    return {
        "understanding_document": session.understanding_document or "",
    }


# ============ Course Endpoints (Phase 2) ============

def _intake_preview_snippet(course) -> Optional[str]:
    """Short snippet from the first non-empty user turn — for unfinished intakes."""
    for m in course.intake_messages or []:
        if (getattr(m, "role", None) or "") != "user":
            continue
        t = (getattr(m, "content", None) or "").strip()
        if not t:
            continue
        t = " ".join(t.split())
        if len(t) > 96:
            return f"{t[:96]}…"
        return t
    return None


def _course_to_summary(course) -> CourseSummary:
    return CourseSummary(
        id=course.id,
        intake_status=course.intake_status,
        course_status=course.course_status,
        crisp_statement=course.crisp_statement,
        course_label=getattr(course, "course_label", None),
        intake_preview=_intake_preview_snippet(course),
        domain=course.domain,
        generation_error=getattr(course, "generation_error", None),
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


@router.post("/course/intake/start", response_model=CourseIntakeStartResponse)
async def start_course_intake(
    current_user: dict = Depends(get_current_user),
):
    """Create a new Course in 'draft' intake state.

    We create a row so intake messages can be persisted, but we keep it out
    of the user's Courses list until they actually engage (first message)
    or finalize.
    """
    user = current_user["db_user"]

    if not rate_limit_user(user.id, "course_intake_start"):
        raise HTTPException(
            status_code=429,
            detail="Course creation rate limit exceeded. You can start up to 5 courses per hour.",
        )

    course = await course_repo.create(user_id=user.id)
    return CourseIntakeStartResponse(course_id=course.id)


def _scrub_role_prefixes(text: str) -> str:
    """Belt-and-suspenders scrub of stray "User:" / "Assistant:" prefixes
    Claude sometimes leaks at the start of a line. The proper fix is the
    prompt + structured-message refactor in `course_intake_message`; this
    only runs as a safety net for older sessions or model drift.
    """
    if not text:
        return text
    cleaned_lines = []
    for line in text.splitlines():
        stripped = line.lstrip()
        for prefix in ("User:", "Assistant:", "USER:", "ASSISTANT:"):
            if stripped.startswith(prefix):
                stripped = stripped[len(prefix):].lstrip()
                break
        # Preserve original leading whitespace where we didn't strip a
        # prefix, but emit the cleaned line otherwise.
        cleaned_lines.append(stripped if stripped != line.lstrip() else line)
    return "\n".join(cleaned_lines)


async def _handle_intake_response(course_id: str, full_response: str) -> None:
    """Persist the assistant turn after the SSE stream finishes.

    The model may emit a <<STATEMENT>> marker followed by a one-sentence
    crisp statement. We save the full response as the assistant message
    (the frontend strips the marker for display). Intake stays open —
    the user decides when to finalize by clicking 'Create Course'.
    """
    full_response = _scrub_role_prefixes(full_response)
    assistant_msg = IntakeMessage(role="assistant", content=full_response.strip())
    await course_repo.append_intake_message(course_id, assistant_msg)


@router.post("/course/intake/{course_id}/message")
async def course_intake_message(
    course_id: str,
    request: CourseIntakeMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream the intake chatbot's next reply (SSE).

    The model outputs a <<STATEMENT>> marker followed by a one-sentence
    crisp statement, or a plain text clarification (for gibberish input).
    The buffered response is persisted as-is after the stream finishes.
    Intake stays open — the user finalizes via the /finalize endpoint.
    """
    user = current_user["db_user"]

    if not rate_limit_user(user.id, "course_intake"):
        raise HTTPException(
            status_code=429,
            detail="Intake rate limit exceeded. Please wait before sending more messages.",
        )

    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    # Draft: user clicked "Start course" but hasn't messaged yet.
    # in_progress: at least one message has been saved.
    if course.intake_status not in ("draft", "in_progress"):
        raise HTTPException(status_code=400, detail="Intake already complete")

    user_message = (request.user_message or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    # 1. Save user message and refresh history
    user_msg = IntakeMessage(role="user", content=user_message)
    course = await course_repo.append_intake_message(course_id, user_msg)

    # 2. Build system prompt + structured message history. Inlining the
    # transcript into a single user prompt previously caused Claude to
    # leak "User:" / "Assistant:" prefixes into its replies. Passing the
    # turns as proper messages fixes that and also gives Claude a
    # cleaner sense of where it is in the conversation.
    history = [{"role": m.role, "content": m.content} for m in course.intake_messages]
    system_prompt = build_intake_chatbot_system_prompt()

    # 3. Stream + capture
    buffer: List[str] = []

    async def stream_and_capture():
        async for chunk in llm_client.generate_stream_with_messages(
            messages=history,
            system=system_prompt,
            max_tokens=1500,
        ):
            buffer.append(chunk)
            yield chunk

    async def gen():
        async for ev in sse_stream(stream_and_capture()):
            yield ev
        # After [DONE], persist the buffered assistant turn
        try:
            await _handle_intake_response(course_id, "".join(buffer))
        except Exception as e:
            logger.error("Post-stream intake handling failed for course %s: %s", course_id, e)

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post("/course/intake/{course_id}/finalize", response_model=CourseIntakeFinalizeResponse)
async def finalize_course_intake(
    course_id: str,
    request: CourseIntakeFinalizeRequest,
    current_user: dict = Depends(get_current_user),
):
    """Finalize intake with the user's crisp statement.

    Uses the AI to extract structured fields (domain, what, why, etc.)
    from the conversation history + user-edited statement, then commits
    the course and kicks off puzzle generation.
    """
    user = current_user["db_user"]
    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    if course.intake_status != "in_progress":
        raise HTTPException(status_code=400, detail="Intake already complete")

    crisp = (request.crisp_statement or "").strip()
    if not crisp:
        raise HTTPException(status_code=400, detail="Crisp statement is required")
    course_label = (request.course_label or "").strip() if hasattr(request, "course_label") else ""
    if not course_label:
        raise HTTPException(status_code=400, detail="course_label is required")

    # Build conversation for extraction
    conversation = [{"role": m.role, "content": m.content} for m in course.intake_messages]
    extraction_prompt = build_intake_extraction_prompt(crisp, conversation)

    try:
        raw = await llm_client.generate_text(
            prompt=extraction_prompt,
            system="You extract structured JSON from intake conversations. Output only valid JSON.",
            max_tokens=800,
        )
        data = json.loads(raw.strip())
    except (json.JSONDecodeError, Exception) as e:
        logger.warning("Extraction failed for course %s, using defaults: %s", course_id, e)
        data = {
            "domain": crisp[:50],
            "what": crisp,
            "why": "User wants to improve",
            "blocker": "Not specified",
            "effective_looks_like": "Greater effectiveness in this area",
            "raw_quotes": [],
        }

    await course_repo.complete_intake(
        course_id=course_id,
        crisp_statement=crisp,
        course_label=course_label,
        domain=data.get("domain", "").strip(),
        what=data.get("what", "").strip(),
        why=data.get("why", "").strip(),
        blocker=data.get("blocker", "").strip(),
        effective_looks_like=data.get("effective_looks_like", "").strip(),
        raw_quotes=data.get("raw_quotes", []) or [],
    )

    _spawn_puzzle_generation(course_id)

    return CourseIntakeFinalizeResponse(success=True, course_id=course_id)


@router.get("/user/courses", response_model=UserCoursesResponse)
async def get_user_courses(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    courses = await course_repo.get_user_courses(user.id, limit)
    summaries = [_course_to_summary(c) for c in courses]
    return UserCoursesResponse(courses=summaries, total_count=len(summaries))


@router.get("/course/{course_id}", response_model=CourseDetailResponse)
async def get_course_detail(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    intake_messages = [
        {
            "role": m.role,
            "content": m.content,
            "created_at": m.created_at.isoformat() if m.created_at else None,
        }
        for m in course.intake_messages
    ]
    return CourseDetailResponse(
        course=_course_to_summary(course),
        intake_messages=intake_messages,
    )


# ============ Course Puzzles & Generation (Phase 3) ============

@router.get("/course/{course_id}/puzzles", response_model=CoursePuzzlesResponse)
async def get_course_puzzles(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Return puzzles for a course. The internal `answer` field is NEVER
    serialized — phase 3 only exposes user-visible content."""
    user = current_user["db_user"]
    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    puzzles = await puzzle_repo.get_by_course(course_id)
    return CoursePuzzlesResponse(
        puzzles=[
            CoursePuzzleResponse(
                id=p.id,
                position=p.position,
                title=p.title,
                puzzle_text=p.puzzle_text,
                primary_element=p.primary_element,
                why_this_trains_the_element=p.why_this_trains_the_element,
                domain_connection=p.domain_connection,
                bridge_back=p.bridge_back,
                status=p.status,
                completed_at=p.completed_at,
                current_stage=p.current_stage,
            )
            for p in puzzles
        ]
    )


@router.get("/course/{course_id}/status-stream")
async def course_status_stream(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Stream course_status changes via SSE.

    Polls the DB every second; emits a payload when status changes; ends
    streaming on terminal states (ready, generation_failed, abandoned) or
    after a 2-minute hard cap.
    """
    user = current_user["db_user"]
    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")

    async def gen():
        last_status = None
        for _ in range(120):
            current_course = await course_repo.get_by_id(course_id)
            if not current_course:
                break

            current_status = current_course.course_status
            if current_status != last_status:
                payload = json.dumps({
                    "course_status": current_status,
                    "generation_error": current_course.generation_error,
                })
                yield f"data: {payload}\n\n".encode("utf-8")
                last_status = current_status

            if current_status in ("ready", "generation_failed", "abandoned"):
                break

            await asyncio.sleep(1)

        yield b"data: [DONE]\n\n"

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post(
    "/course/{course_id}/retry-generation",
    response_model=RetryGenerationResponse,
)
async def retry_course_generation(
    course_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Re-fire puzzle generation for a course in 'generation_failed' or
    'awaiting_puzzles' state. Rate-limited to 5/hour per user."""
    user = current_user["db_user"]

    if not rate_limit_user(user.id, "retry_generation"):
        raise HTTPException(
            status_code=429,
            detail="Retry rate limit exceeded. You can retry up to 5 times per hour.",
        )

    course = await course_repo.get_by_id(course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your course")
    if course.course_status not in ("generation_failed", "awaiting_puzzles"):
        raise HTTPException(
            status_code=400,
            detail=f"Cannot retry generation from status '{course.course_status}'",
        )

    _spawn_puzzle_generation(course_id)
    return RetryGenerationResponse(success=True, course_id=course_id)


# ============ Canvas: Thoughts & Connections (Phase 4b) ============

def _cp_to_response(cp) -> CoursePuzzleResponse:
    """Shared CoursePuzzle -> response mapper (answer is never exposed)."""
    return CoursePuzzleResponse(
        id=cp.id,
        course_id=getattr(cp, "course_id", None),
        position=cp.position,
        title=cp.title,
        puzzle_text=cp.puzzle_text,
        primary_element=cp.primary_element,
        why_this_trains_the_element=cp.why_this_trains_the_element,
        domain_connection=cp.domain_connection,
        bridge_back=cp.bridge_back,
        status=cp.status,
        completed_at=cp.completed_at,
        current_stage=getattr(cp, "current_stage", 1) or 1,
        stage3_phase=getattr(cp, "stage3_phase", None),
        synthesis=getattr(cp, "synthesis", None),
        reflection_answers=getattr(cp, "reflection_answers", None),
    )


def _thought_to_response(t) -> ThoughtResponse:
    return ThoughtResponse(
        id=t.id,
        course_puzzle_id=t.course_puzzle_id,
        element=t.element,
        sub_element=t.sub_element,
        content=t.content,
        flow_order=t.flow_order,
        time_spent_seconds=t.time_spent_seconds,
        pos_x=t.pos_x,
        pos_y=t.pos_y,
        is_nudge=getattr(t, "is_nudge", False),
        kind=getattr(t, "kind", "thought"),
        created_at=t.created_at,
        updated_at=t.updated_at,
    )


def _connection_to_response(c) -> ConnectionResponse:
    return ConnectionResponse(
        id=c.id,
        course_puzzle_id=c.course_puzzle_id,
        from_thought_id=c.from_thought_id,
        to_thought_id=c.to_thought_id,
        created_at=c.created_at,
    )


async def _verify_puzzle_ownership(course_puzzle_id: str, user):
    """Raise 404 if puzzle doesn't exist; 403 if the caller doesn't own its
    parent course. Returns the CoursePuzzle on success."""
    result = await puzzle_repo.get_with_course(course_puzzle_id)
    if not result:
        raise HTTPException(status_code=404, detail="Puzzle not found")
    cp, course_user_id = result
    if course_user_id != user.id:
        raise HTTPException(status_code=403, detail="Not your puzzle")
    return cp


async def _verify_thought_ownership(thought_id: str, user):
    """Verify that `thought_id` exists and the caller owns the parent course.
    Returns the Thought on success."""
    t = await thought_repo.get_by_id(thought_id)
    if not t:
        raise HTTPException(status_code=404, detail="Thought not found")
    await _verify_puzzle_ownership(t.course_puzzle_id, user)
    return t


async def _verify_connection_ownership(connection_id: str, user):
    c = await connection_repo.get_by_id(connection_id)
    if not c:
        raise HTTPException(status_code=404, detail="Connection not found")
    await _verify_puzzle_ownership(c.course_puzzle_id, user)
    return c


@router.patch(
    "/canvas/{course_puzzle_id}/stage",
    response_model=CoursePuzzleResponse,
)
async def update_canvas_stage(
    course_puzzle_id: str,
    request: CanvasStageUpdateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Persist the user's current stage on a course_puzzle.

    Called by the canvas page on each Stage advance. Without this, leaving
    the canvas and coming back drops the user back to Stage 1, which makes
    the AI nudge re-seed pointless and forces re-doing work."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    new_stage = request.current_stage
    if new_stage < 1 or new_stage > 3:
        raise HTTPException(
            status_code=400,
            detail="current_stage must be 1, 2, or 3",
        )
    # Refuse to go BACKWARD. Stage advancement is one-way by product
    # design, and a stale tab racing with a fresh one shouldn't be able
    # to undo progress.
    if new_stage < (cp.current_stage or 1):
        raise HTTPException(
            status_code=400,
            detail="Cannot move to an earlier stage",
        )

    updated = await puzzle_repo.update_current_stage(course_puzzle_id, new_stage)
    # Initialize stage3_phase when entering Stage 3
    if new_stage == 3 and not getattr(updated, "stage3_phase", None):
        updated = await puzzle_repo.update_stage3_phase(course_puzzle_id, "reflect")
    return _cp_to_response(updated)


@router.get(
    "/canvas/{course_puzzle_id}",
    response_model=CanvasStateResponse,
)
async def get_canvas_state(
    course_puzzle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Single round-trip load: puzzle + thoughts + connections."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)
    # Mark puzzle as in_progress the first time the canvas is opened so the
    # course page can show "Resume" instead of "Begin" on return visits.
    if cp.status == "pending":
        cp = await puzzle_repo.update_status(course_puzzle_id, "in_progress")
    thoughts = await thought_repo.get_by_course_puzzle(course_puzzle_id)
    connections = await connection_repo.get_by_course_puzzle(course_puzzle_id)
    return CanvasStateResponse(
        course_puzzle=_cp_to_response(cp),
        thoughts=[_thought_to_response(t) for t in thoughts],
        connections=[_connection_to_response(c) for c in connections],
    )


@router.post(
    "/canvas/{course_puzzle_id}/thoughts",
    response_model=ThoughtResponse,
)
async def create_thought(
    course_puzzle_id: str,
    request: ThoughtCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_puzzle_ownership(course_puzzle_id, user)
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="content is required")
    t = await thought_repo.create(
        course_puzzle_id=course_puzzle_id,
        user_id=user.id,
        content=request.content,
        element=request.element,
        sub_element=request.sub_element,
        pos_x=request.pos_x,
        pos_y=request.pos_y,
        time_spent_seconds=request.time_spent_seconds,
    )
    return _thought_to_response(t)


@router.patch(
    "/canvas/thoughts/{thought_id}/position",
    response_model=ThoughtResponse,
)
async def update_thought_position(
    thought_id: str,
    request: ThoughtUpdatePositionRequest,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_thought_ownership(thought_id, user)
    t = await thought_repo.update_position(thought_id, request.pos_x, request.pos_y)
    return _thought_to_response(t)


@router.patch(
    "/canvas/thoughts/{thought_id}/content",
    response_model=ThoughtResponse,
)
async def update_thought_content(
    thought_id: str,
    request: ThoughtUpdateContentRequest,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_thought_ownership(thought_id, user)
    if not request.content or not request.content.strip():
        raise HTTPException(status_code=400, detail="content is required")
    t = await thought_repo.update_content(thought_id, request.content)
    return _thought_to_response(t)


@router.patch(
    "/canvas/thoughts/{thought_id}/tagging",
    response_model=ThoughtResponse,
)
async def update_thought_tagging(
    thought_id: str,
    request: ThoughtUpdateTaggingRequest,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_thought_ownership(thought_id, user)
    t = await thought_repo.update_tagging(
        thought_id, request.element, request.sub_element
    )
    return _thought_to_response(t)


@router.delete("/canvas/thoughts/{thought_id}", status_code=204)
async def delete_thought_endpoint(
    thought_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_thought_ownership(thought_id, user)
    await thought_repo.delete(thought_id)
    # 204 No Content
    return None


@router.post(
    "/canvas/{course_puzzle_id}/connections",
    response_model=ConnectionResponse,
)
async def create_connection(
    course_puzzle_id: str,
    request: ConnectionCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_puzzle_ownership(course_puzzle_id, user)

    if request.from_thought_id == request.to_thought_id:
        raise HTTPException(status_code=400, detail="Self-connections are not allowed")

    # Verify both thoughts exist AND both belong to THIS course_puzzle.
    # Prevents cross-puzzle edges even if someone forges the payload.
    from_t = await thought_repo.get_by_id(request.from_thought_id)
    to_t = await thought_repo.get_by_id(request.to_thought_id)
    if not from_t or not to_t:
        raise HTTPException(status_code=404, detail="Thought not found")
    if (
        from_t.course_puzzle_id != course_puzzle_id
        or to_t.course_puzzle_id != course_puzzle_id
    ):
        raise HTTPException(
            status_code=400,
            detail="Both thoughts must belong to this course_puzzle",
        )

    c = await connection_repo.create(
        course_puzzle_id=course_puzzle_id,
        user_id=user.id,
        from_thought_id=request.from_thought_id,
        to_thought_id=request.to_thought_id,
    )
    return _connection_to_response(c)


@router.delete("/canvas/connections/{connection_id}", status_code=204)
async def delete_connection_endpoint(
    connection_id: str,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    await _verify_connection_ownership(connection_id, user)
    await connection_repo.delete(connection_id)
    return None


# ============ Canvas: Stage chat (real LLM) ============
#
# The chat system prompt is canvas-aware: every turn loads the user's
# Stage 1 thoughts, Stage 2 nudges, Stage 3 reflections, and connections,
# then embeds them so the model can reference specific blocks. Element
# names (Earth/Fire/Water/etc.) are forbidden in the model's output — the
# model talks about thinking *moves* in plain language instead.


def _format_thoughts_compact(thoughts: list) -> str:
    """Compact line-per-thought formatter for embedding in chat prompts."""
    if not thoughts:
        return ""
    lines = []
    for t in thoughts:
        # Support both entity objects and dicts
        tid = getattr(t, "id", None) if not isinstance(t, dict) else t.get("id")
        content = getattr(t, "content", None) if not isinstance(t, dict) else t.get("content")
        flow = getattr(t, "flow_order", None) if not isinstance(t, dict) else t.get("flow_order")
        content = (content or "").strip()
        lines.append(f'  [{tid}] (flow={flow if flow is not None else "?"}): "{content}"')
    return "\n".join(lines)


def _build_canvas_chat_system_prompt(
    *,
    stage: int,
    cp,
    user_thoughts: list,
    nudge_thoughts: list,
    reflection_thoughts: list,
    connections: list,
) -> str:
    """Stage-aware canvas chat system prompt that embeds the user's canvas
    state so the assistant can reference specific thoughts by content.

    The puzzle's `answer` is intentionally NOT included — the bot must
    never give it, and the simplest way to guarantee that is to keep it
    out of context.
    """
    primary = cp.primary_element or "synthesis"

    user_block = _format_thoughts_compact(user_thoughts) or "  (none)"
    nudge_block = _format_thoughts_compact(nudge_thoughts) or "  (none)"
    reflection_block = _format_thoughts_compact(reflection_thoughts) or "  (none)"

    if connections:
        conn_block = "\n".join(
            f"  [{c['from_id']}] -> [{c['to_id']}]" for c in connections
        )
    else:
        conn_block = "  (no connections drawn)"

    if stage == 1:
        stage_directive = (
            "\nSTAGE 1 — INDEPENDENT THINKING\n"
            "\n"
            "The user is doing independent work. They are thinking through the puzzle on their own.\n"
            "\n"
            "Your role:\n"
            "- DO NOT give answers, hints, or solution-shaped suggestions.\n"
            "- DO NOT extend their thinking with new ideas they haven't surfaced.\n"
            "- DO answer factual clarifying questions about the puzzle text itself.\n"
            "- DO answer questions about what each thinking move asks for in plain language\n"
            "  (e.g., \"starting with simple things means...\"). NEVER use the framework names —\n"
            "  describe the move conversationally.\n"
            "- DO NOT recommend which element they should apply to *this specific puzzle*, and do NOT\n"
            "  steer them toward a particular element tag for this prompt.\n"
            "- If they ask \"what should I do next?\" — redirect them: \"What's the question you're sitting with?\"\n"
            "\n"
            "Reference their canvas thoughts when relevant. Quote their actual words.\n"
        )
    elif stage == 2:
        stage_directive = (
            "\nSTAGE 2 — REDIRECT (Edward Burger / *Making Up Your Own Mind*)\n"
            "\n"
            "The user has a small structured intervention on their canvas\n"
            "(anchor + children, or a single deep prompt). This is a *redirect* —\n"
            "not a new lecture. Voice: invitational, intellectually playful, humble.\n"
            "Short sentences. No hype, no therapy-speak, no cheerleading.\n"
            "\n"
            "Your role:\n"
            "- DO NOT solve the puzzle or give answer-shaped hints.\n"
            "- DO gently point back to the purple nudge nodes and what each is *asking* them to try.\n"
            "- DO answer questions about how to engage (what the anchor names, what a child is for).\n"
            "- DO reference their own words from the canvas when it helps.\n"
            "- AVOID inventing a brand-new method beyond what's already on the canvas.\n"
            "- If they want \"one more step\": remind them the work is to *live inside* the nudges,\n"
            "  not to collect more instructions.\n"
            "- If asked which nudge first: pick one briefly and say why, 1–2 sentences.\n"
        )
    else:  # stage 3 — note: Stage 3 has its own dedicated chat endpoint, but
           # if this prompt is reused, handle it gracefully.
        stage_directive = (
            "\nSTAGE 3 — REFLECTION / BRIDGE\n"
            "\n"
            "The user is reflecting on the puzzle and connecting it to their real life.\n"
            "\n"
            "Your role:\n"
            "- Reference their actual thoughts. Quote what they wrote.\n"
            "- Ask reflective questions, not solution-shaped questions.\n"
            "- Help them notice what they did. Don't tell them what they should have done.\n"
        )

    return f"""You are guiding a user through Edward Burger's "Making Up Your Own Mind" thinking practice on a canvas. Your role varies by stage.

THE PUZZLE:
- Title: {cp.title}
- Prompt: {cp.puzzle_text}
- Primary thinking territory: {primary}

THE USER'S CANVAS:

USER THOUGHTS (Stage 1, kind='thought'):
{user_block}

AI NUDGE NODES ON CANVAS (Stage 2, kind='nudge'):
{nudge_block}

USER REFLECTION THOUGHTS (Stage 3, kind='reflection'):
{reflection_block}

CONNECTIONS:
{conn_block}
{stage_directive}
================================================================
HARD RULES (always)
================================================================

1. NEVER use the words "Earth", "Fire", "Air", "Water", "Synthesis", "Change", or "element" in your reply.
2. NEVER reveal the puzzle's logical answer or any solution-shaped hint.
3. Keep replies short — 2-4 sentences. No paragraphs of advice.
4. When relevant, quote the user's actual words back to them.
5. Tone: curious friend at a coffee shop. Not coach. Not therapist.
6. ONE question per turn. Never ask multiple questions in a row.

Reply with just your next message in the conversation. No preamble, no metadata.
"""


def _format_canvas_chat_prompt(history, user_message: str) -> str:
    """Render a flat user prompt from the running history. The ClaudeAdapter
    we use takes a single user message; the system instructions are passed
    separately. We embed the conversation as a transcript so the model sees
    its own prior replies."""
    lines = []
    for m in history:
        role = "User" if (m.role or "").lower() == "user" else "Guide"
        lines.append(f"{role}: {m.content.strip()}")
    lines.append(f"User: {user_message.strip()}")
    lines.append("Guide:")
    return "\n\n".join(lines)


@router.post("/canvas/{course_puzzle_id}/chat/stream")
async def canvas_chat_stream(
    course_puzzle_id: str,
    request: CanvasChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream a Stage chat reply via SSE. The frontend renders chunks as
    they arrive so the user sees the model thinking. This is the only
    LLM-backed surface in the canvas today."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    user_message = (request.user_message or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")
    if request.stage not in (1, 2, 3):
        raise HTTPException(status_code=400, detail="Invalid stage")

    if not rate_limit_user(user.id, "canvas_chat"):
        raise HTTPException(
            status_code=429,
            detail="You're chatting fast — give it a few seconds and try again.",
        )

    # Load full canvas state so the chat can reference specific thoughts.
    user_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "thought")
    nudge_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "nudge")
    reflection_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "reflection")
    raw_connections = await connection_repo.get_by_course_puzzle(course_puzzle_id)
    connections = [
        {"from_id": str(c.from_thought_id), "to_id": str(c.to_thought_id)}
        for c in raw_connections
    ]

    system_prompt = _build_canvas_chat_system_prompt(
        stage=request.stage,
        cp=cp,
        user_thoughts=user_thoughts,
        nudge_thoughts=nudge_thoughts,
        reflection_thoughts=reflection_thoughts,
        connections=connections,
    )
    prompt = _format_canvas_chat_prompt(request.history, user_message)

    async def gen():
        async for ev in sse_stream(
            llm_client.generate_stream_with_system(
                prompt=prompt,
                system=system_prompt,
                max_tokens=600,
            )
        ):
            yield ev

    return StreamingResponse(gen(), media_type="text/event-stream")


# ============ Canvas: Stage 2 Nudges ============
#
# When the user advances from Stage 1 → Stage 2, we ask the LLM to drop a
# small set of "nudge" thoughts on their canvas. These behave exactly like
# user-authored thoughts (drag/connect/delete/edit) but are persisted with
# is_nudge=true so the UI can render them with a distinctive treatment and
# the user knows they didn't write them. The endpoint is one-shot per
# course_puzzle: subsequent calls return the existing nudges instead of
# generating more.

# Element-keyed sub-element ids the model is allowed to pick from. Mirrors
# the canonical list in `frontend/lib/elements.ts`. We hand the model the
# id strings (e.g. "earth-1") so the response is unambiguous on tagging.
_VALID_SUB_ELEMENTS = {
    "earth": ["earth-1", "earth-2", "earth-3"],
    "fire":  ["fire-1", "fire-2", "fire-3"],
    "air":   ["air-1", "air-2", "air-3"],
    "water": ["water-1", "water-2", "water-3"],
    "synthesis": [
        "earth-1", "earth-2", "earth-3",
        "fire-1", "fire-2", "fire-3",
        "air-1", "air-2", "air-3",
        "water-1", "water-2", "water-3",
    ],
}



# ---------- Stage 2 nudges (2–3 primary-element prompts) ----------
# Geometry constants (match frontend Canvas block size).
BLOCK_WIDTH = 280
BLOCK_MIN_HEIGHT = 100
CLEAR_MARGIN_X = 80
CANVAS_CENTER = 16000


def _rightmost_x_extent_simple(existing_thoughts: list) -> float:
    if not existing_thoughts:
        return float(CANVAS_CENTER)
    return max(float(t.pos_x) + BLOCK_WIDTH for t in existing_thoughts)


def _element_display_name(primary: str) -> str:
    m = {
        "earth": "Earth",
        "fire": "Fire",
        "air": "Air",
        "water": "Water",
        "synthesis": "Synthesis",
    }
    return m.get((primary or "synthesis").lower(), "Synthesis")


def _parse_simple_nudge_json(raw: str) -> dict:
    t = (raw or "").strip()
    if t.startswith("```"):
        lines = t.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        t = "\n".join(lines)
    try:
        return json.loads(t)
    except json.JSONDecodeError:
        s, e = t.find("{"), t.rfind("}")
        if s >= 0 and e > s:
            return json.loads(t[s : e + 1])
        raise


@router.post(
    "/canvas/{course_puzzle_id}/stage2/nudges",
    response_model=CanvasNudgesResponse,
)
async def generate_stage2_nudges(
    course_puzzle_id: str,
    request: CanvasNudgesRequest,
    current_user: dict = Depends(get_current_user),
):
    """Seed 2–3 AI nudge thoughts tagged with the puzzle's primary element."""
    from app.domain.services import (
        build_forge_stage2_nudges_json_prompt,
        SUB_ELEMENT_NAMES,
    )

    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    existing_nudges = await thought_repo.get_by_kind(course_puzzle_id, "nudge")
    if existing_nudges:
        all_connections = await connection_repo.get_by_course_puzzle(course_puzzle_id)
        nudge_ids = {str(t.id) for t in existing_nudges}
        nudge_connections = [
            c
            for c in all_connections
            if str(c.from_thought_id) in nudge_ids or str(c.to_thought_id) in nudge_ids
        ]
        return CanvasNudgesResponse(
            nudges=[_thought_to_response(t) for t in existing_nudges],
            connections=[_connection_to_response(c) for c in nudge_connections],
            chat_message=(
                "Welcome back — your **AI Nudge** blocks are still on the canvas. "
                "Continue where you left off: pick a nudge, answer it on a fresh block, "
                "or edit anything that no longer fits. When you're ready, use **Continue to Stage 3** above."
            ),
            move=None,
            shape=None,
            branch_source_thought_id=None,
            already_seeded=True,
        )

    if not rate_limit_user(user.id, "canvas_chat"):
        raise HTTPException(
            status_code=429,
            detail="Slow down — give it a few seconds before generating again.",
        )

    user_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "thought")
    thought_lines = "\n".join(
        f'- [{t.id}] "{(t.content or "").strip()}" (element={t.element}, sub={t.sub_element})'
        for t in user_thoughts
    ) or "(empty canvas)"

    primary = (cp.primary_element or "synthesis").lower()
    valid_subs = set(_VALID_SUB_ELEMENTS.get(primary, _VALID_SUB_ELEMENTS["synthesis"]))

    prompt = build_forge_stage2_nudges_json_prompt(
        title=cp.title,
        puzzle_text=cp.puzzle_text,
        primary_element=primary,
        user_thought_lines=thought_lines,
    )

    parsed = None
    for attempt in range(2):
        try:
            raw = await llm_client.generate_text(
                prompt=prompt,
                system=(
                    "You output ONLY valid JSON for an internal API. "
                    "Follow the schema exactly. Never reveal puzzle answers."
                ),
                max_tokens=1200,
            )
            parsed = _parse_simple_nudge_json(raw)
            nudges = parsed.get("nudges") or []
            if not isinstance(nudges, list) or not (2 <= len(nudges) <= 3):
                raise ValueError("Need 2-3 nudges")
            for n in nudges:
                sub = n.get("sub_element")
                if sub not in valid_subs:
                    raise ValueError(f"Invalid sub_element {sub}")
                c = (n.get("content") or "").strip()
                if not c or len(c) > 220:
                    raise ValueError("Bad nudge content")
            break
        except Exception as e:
            logger.warning(
                "Simple nudge attempt %d failed for %s: %s",
                attempt + 1,
                course_puzzle_id,
                e,
            )
            if attempt == 0:
                prompt = (
                    prompt
                    + "\n\nPrevious output failed validation. Return ONLY JSON with "
                    '"nudges" array length 2 or 3; each item needs content (<=220 chars) '
                    f"and sub_element one of: {', '.join(sorted(valid_subs))}."
                )
                continue
            raise HTTPException(
                status_code=502,
                detail="Couldn't generate nudges right now. Try again in a moment.",
            )

    latest = await thought_repo.get_latest_non_nudge_by_created_at(course_puzzle_id)
    if latest:
        base_x = float(latest.pos_x) + BLOCK_WIDTH + CLEAR_MARGIN_X
        base_y = float(latest.pos_y)
    else:
        base_x = _rightmost_x_extent_simple(user_thoughts) + CLEAR_MARGIN_X
        base_y = float(CANVAS_CENTER)

    persisted_nodes: list = []
    persisted_connections: list = []

    try:
        for i, nd in enumerate(parsed["nudges"]):
            content = nd["content"].strip()
            sub = nd["sub_element"]
            el = sub.split("-")[0] if "-" in sub else primary
            x = base_x + i * (BLOCK_WIDTH + 40)
            y = base_y
            t = await thought_repo.create(
                course_puzzle_id=course_puzzle_id,
                user_id=user.id,
                content=content,
                element=el,
                sub_element=sub,
                pos_x=x,
                pos_y=y,
                time_spent_seconds=None,
                is_nudge=True,
            )
            persisted_nodes.append(t)
            if latest:
                conn = await connection_repo.create(
                    course_puzzle_id=course_puzzle_id,
                    user_id=user.id,
                    from_thought_id=str(latest.id),
                    to_thought_id=str(t.id),
                )
                persisted_connections.append(conn)
    except Exception as e:
        logger.error("Persist simple nudges failed %s: %s", course_puzzle_id, e)
        raise HTTPException(
            status_code=502,
            detail="Couldn't drop nudges on your canvas. Try again in a moment.",
        )

    first_sub = parsed["nudges"][0]["sub_element"]
    sub_name = SUB_ELEMENT_NAMES.get(first_sub, first_sub)
    n_count = len(persisted_nodes)
    chat_message = (
        f"I've placed {n_count} {_element_display_name(primary)} nudges on the canvas"
        + (
            ", connected to your latest thought. "
            if latest
            else ". "
        )
        + "They're not answers — they're prompts to extend your thinking. "
        f"Try applying {_element_display_name(primary)} {sub_name}: "
        "use these prompts to push one step further without jumping to a conclusion."
    )

    return CanvasNudgesResponse(
        nudges=[_thought_to_response(t) for t in persisted_nodes],
        connections=[_connection_to_response(c) for c in persisted_connections],
        chat_message=chat_message,
        move=None,
        shape="single",
        branch_source_thought_id=str(latest.id) if latest else None,
        already_seeded=False,
    )


# ============ Canvas: Stage 3 — Reflection + Bridge + Synthesis ============
#
# Stage 3 is broken into two sub-phases:
#   A) Reflect — the user reflects on the puzzle ("what did you discover?")
#   B) Bridge — the user connects the puzzle to their real-life goal
# After both, the user triggers completion which generates a hidden
# synthesis paragraph and marks the puzzle as completed.


def _build_stage3_chat_system_prompt(
    cp,
    course,
    phase: str,
    *,
    user_thoughts: list | None = None,
    nudge_thoughts: list | None = None,
    reflection_thoughts: list | None = None,
    connections: list | None = None,
) -> str:
    """System prompt for the Stage 3 chatbot.

    Voice: warm, curious friend who just did the puzzle with you. Short
    paragraphs. No element names (earth/fire/air/water). No coaching
    tone. No forbidden words (element, synthesis, change).

    Canvas state (thoughts + reflections + connections) is embedded so
    the reflection chat can quote the user's actual work back to them.
    """
    forbidden = (
        "FORBIDDEN WORDS — never use these in your response: "
        "earth, fire, air, water, element, synthesis, change, Change, "
        "quintessence, coaching, coach."
    )

    user_block = _format_thoughts_compact(user_thoughts or []) or "  (none)"
    nudge_block = _format_thoughts_compact(nudge_thoughts or []) or "  (none)"
    reflection_block = _format_thoughts_compact(reflection_thoughts or []) or "  (none)"
    if connections:
        conn_block = "\n".join(
            f"  [{c['from_id']}] -> [{c['to_id']}]" for c in connections
        )
    else:
        conn_block = "  (no connections drawn)"

    canvas_block = (
        f"THE USER'S CANVAS:\n\n"
        f"USER THOUGHTS (Stage 1):\n{user_block}\n\n"
        f"AI NUDGE NODES (Stage 2):\n{nudge_block}\n\n"
        f"USER REFLECTIONS (Stage 3):\n{reflection_block}\n\n"
        f"CONNECTIONS:\n{conn_block}\n"
    )

    base = (
        "You are a curious friend talking to someone who just worked "
        "through a thinking puzzle. Be warm, direct, and concise (2–4 "
        "short paragraphs max). Use light Markdown with **bold** for "
        "emphasis. Never include code fences.\n\n"
        f"PUZZLE CONTEXT:\n"
        f"- Title: {cp.title}\n"
        f"- Prompt: {cp.puzzle_text}\n\n"
        f"{canvas_block}\n"
        f"{forbidden}\n\n"
        "HARD RULES:\n"
        "- NEVER give the puzzle's answer or any solution-shaped hint.\n"
        "- NEVER summarize the user's work for them.\n"
        "- Ask reflective questions; let the user do the thinking.\n"
        "- When useful, quote the user's actual words back to them.\n"
    )

    if phase == "reflect":
        return base + (
            "\nPHASE: REFLECT\n"
            "Help them look back at what happened — Burger-style: curious, not corrective.\n"
            "Invite, don't inventory. One angle at a time. Ask about surprise, friction,\n"
            "or a moment that clicked — only what fits what they actually put on the canvas.\n"
        )

    # phase == "bridge"
    user_goal = course.crisp_statement or "their goal"
    domain = course.domain or "their domain"
    return base + (
        f"\nPHASE: BRIDGE\n"
        f"They care about: \"{user_goal}\" (context: {domain}).\n"
        f"We're not summarizing the puzzle — we're linking practice to life.\n"
        f"Ask one grounded question at a time about where this *kind of thinking*\n"
        f"already shows up for them, or where they might try it next. No jargon.\n"
        f"Do NOT mention element names."
    )


def _build_completed_puzzle_chat_system_prompt(
    cp,
    course,
    synthesis: str | None,
    *,
    user_thoughts: list | None = None,
    nudge_thoughts: list | None = None,
    reflection_thoughts: list | None = None,
    connections: list | None = None,
) -> str:
    """When the puzzle is already completed: welcome-back chat, *we* voice."""
    forbidden = (
        "FORBIDDEN WORDS — never use these in your response: "
        "earth, fire, air, water, element, synthesis, change, Change, "
        "quintessence, coaching, coach."
    )
    user_block = _format_thoughts_compact(user_thoughts or []) or "  (none)"
    nudge_block = _format_thoughts_compact(nudge_thoughts or []) or "  (none)"
    reflection_block = _format_thoughts_compact(reflection_thoughts or []) or "  (none)"
    if connections:
        conn_block = "\n".join(
            f"  [{c['from_id']}] -> [{c['to_id']}]" for c in connections
        )
    else:
        conn_block = "  (no connections drawn)"

    syn = (synthesis or "").strip() or "(none saved yet)"
    muscle = (cp.why_this_trains_the_element or "").strip() or "the thinking move this puzzle was built around"
    bridge_hint = (cp.domain_connection or cp.bridge_back or "").strip() or "how this practice ties back to what they care about"

    user_goal = course.crisp_statement or "their larger goal"

    return (
        "You are revisiting a finished thinking puzzle with someone who already did the work.\n"
        "Use **we/us/our** language: you and they went through this together. "
        "Warm, plain, short (2–4 sentences per turn). Light **bold** ok. No code fences.\n\n"
        f"PUZZLE: {cp.title}\n"
        f"Prompt: {cp.puzzle_text}\n\n"
        f"What this puzzle was meant to stretch (for us to reference): {muscle}\n"
        f"How it was designed to connect to their life (background): {bridge_hint}\n"
        f"Their course commitment: {user_goal}\n\n"
        f"SAVED CLOSING NOTE (may quote briefly if helpful):\n{syn}\n\n"
        f"THEIR CANVAS (for quoting):\n"
        f"User thoughts:\n{user_block}\n\n"
        f"Nudge nodes:\n{nudge_block}\n\n"
        f"Reflections:\n{reflection_block}\n\n"
        f"CONNECTIONS:\n{conn_block}\n\n"
        f"{forbidden}\n\n"
        "RULES:\n"
        "- NEVER give the puzzle answer or solution-shaped hints.\n"
        "- Do not sound like a report about \"the user\" — speak with them.\n"
        "- If they ask what to do next, suggest how we might apply what we noticed to their goal.\n"
    )


def _build_synthesis_prompt(cp, course, thoughts, reflections) -> str:
    """Closing message shown to the learner: *we* voice, specific to their canvas."""
    thought_summaries = "\n".join(
        f"  - {t.content[:200]}" for t in thoughts[:20] if t.content
    )
    reflection_summaries = "\n".join(
        f"  - {r.content[:200]}" for r in reflections[:10] if r.content
    )
    muscle = cp.why_this_trains_the_element or ""
    bridge_design = (cp.domain_connection or cp.bridge_back or "").strip()

    return (
        "Write a single 4–7 sentence closing message the learner will read "
        "right after finishing this puzzle. Voice: **we/us/our** together with "
        "the learner (e.g. \"We started out aiming to…\", \"What we practiced here…\"). "
        "Address them as **you** where natural. No third-person report "
        "(avoid \"the user\", \"they learned\").\n\n"
        "Cover ALL of:\n"
        "(1) What thinking move or habit this puzzle was set up to stretch, and why that mattered.\n"
        "(2) What we actually did on the canvas — cite their words or paraphrase specific notes "
        "from the lists below, not generic praise.\n"
        "(3) How this small puzzle bridges toward their larger commitment — use their goal and, "
        "if useful, this design note: "
        f"{bridge_design or '(infer carefully from goal and canvas)'}\n\n"
        f"PUZZLE: {cp.title}\n"
        f"Puzzle prompt: {cp.puzzle_text}\n"
        f"Designer note on the muscle to train: {muscle or '(infer from puzzle)'}\n"
        f"Their stated goal: {course.crisp_statement or 'N/A'}\n"
        f"Domain: {course.domain or 'N/A'}\n\n"
        f"THOUGHTS AND NUDGES ON THE CANVAS:\n{thought_summaries or '(none)'}\n\n"
        f"REFLECTIONS:\n{reflection_summaries or '(none)'}\n\n"
        "Do NOT use the words: earth, fire, air, water, element, synthesis, "
        "change, quintessence.\n\n"
        "Return ONLY the message — no title, no bullet points."
    )


@router.post("/canvas/{course_puzzle_id}/reflections", response_model=ThoughtResponse)
async def create_reflection_thought(
    course_puzzle_id: str,
    request: CreateReflectionRequest,
    current_user: dict = Depends(get_current_user),
):
    """Create a reflection thought on the canvas (Stage 3).
    Same as a regular thought but kind='reflection'."""
    user = current_user["db_user"]
    await _verify_puzzle_ownership(course_puzzle_id, user)

    content = (request.content or "").strip()
    if not content:
        raise HTTPException(status_code=400, detail="content is required")

    t = await thought_repo.create_reflection(
        course_puzzle_id=course_puzzle_id,
        user_id=user.id,
        content=content,
        element=request.element,
        sub_element=request.sub_element,
        pos_x=request.pos_x,
        pos_y=request.pos_y,
    )
    return _thought_to_response(t)


@router.post("/canvas/{course_puzzle_id}/stage3/chat")
async def stage3_chat_stream(
    course_puzzle_id: str,
    request: Stage3ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream a Stage 3 chat reply via SSE. Phase-aware: uses the puzzle's
    current stage3_phase ('reflect' or 'bridge') to select the prompt."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    user_message = (request.user_message or "").strip()
    if not user_message:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    if not rate_limit_user(user.id, "canvas_chat"):
        raise HTTPException(
            status_code=429,
            detail="You're chatting fast — give it a few seconds and try again.",
        )

    # We need the parent course for bridge-phase prompts
    course = await course_repo.get_by_id(cp.course_id)
    if not course:
        raise HTTPException(status_code=500, detail="Parent course not found")

    # Load canvas state so the reflection chat can quote actual thoughts.
    user_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "thought")
    nudge_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "nudge")
    reflection_thoughts = await thought_repo.get_by_kind(course_puzzle_id, "reflection")
    raw_connections = await connection_repo.get_by_course_puzzle(course_puzzle_id)
    connections = [
        {"from_id": str(c.from_thought_id), "to_id": str(c.to_thought_id)}
        for c in raw_connections
    ]

    if cp.status == "completed":
        system_prompt = _build_completed_puzzle_chat_system_prompt(
            cp,
            course,
            getattr(cp, "synthesis", None),
            user_thoughts=user_thoughts,
            nudge_thoughts=nudge_thoughts,
            reflection_thoughts=reflection_thoughts,
            connections=connections,
        )
    else:
        phase = cp.stage3_phase or "reflect"
        system_prompt = _build_stage3_chat_system_prompt(
            cp,
            course,
            phase,
            user_thoughts=user_thoughts,
            nudge_thoughts=nudge_thoughts,
            reflection_thoughts=reflection_thoughts,
            connections=connections,
        )

    # Build message history for Claude structured messages API
    messages = []
    for m in request.history:
        role = "user" if (m.role or "").lower() == "user" else "assistant"
        messages.append({"role": role, "content": m.content.strip()})
    messages.append({"role": "user", "content": user_message})

    async def gen():
        async for ev in sse_stream(
            llm_client.generate_stream_with_messages(
                messages=messages,
                system=system_prompt,
                max_tokens=600,
            )
        ):
            yield ev

    return StreamingResponse(gen(), media_type="text/event-stream")


@router.post(
    "/canvas/{course_puzzle_id}/stage3/advance-to-bridge",
    response_model=CoursePuzzleResponse,
)
async def advance_to_bridge(
    course_puzzle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Transition from the reflect sub-phase to the bridge sub-phase.
    Sets stage3_phase='bridge' on the course_puzzle. Idempotent."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    if cp.stage3_phase == "bridge":
        # Already in bridge phase — return as-is
        return _cp_to_response(cp)

    updated = await puzzle_repo.update_stage3_phase(course_puzzle_id, "bridge")
    return _cp_to_response(updated)


@router.post(
    "/canvas/{course_puzzle_id}/stage3/complete",
    response_model=CompletePuzzleResponse,
)
async def complete_puzzle(
    course_puzzle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Finalize the puzzle: generate closing synthesis, mark completed."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    # Idempotent: already completed
    if cp.status == "completed":
        return CompletePuzzleResponse(
            status="completed",
            completed_at=cp.completed_at,
            synthesis=getattr(cp, "synthesis", None),
        )

    # Load course for synthesis prompt
    course = await course_repo.get_by_id(cp.course_id)
    if not course:
        raise HTTPException(status_code=500, detail="Parent course not found")

    # Load thoughts and reflections
    all_thoughts = await thought_repo.get_by_course_puzzle(course_puzzle_id)
    thoughts = [t for t in all_thoughts if t.kind in ("thought", "nudge")]
    reflections = [t for t in all_thoughts if t.kind == "reflection"]

    synthesis = ""
    try:
        prompt = _build_synthesis_prompt(cp, course, thoughts, reflections)
        synthesis = await llm_client.generate_text(
            prompt=prompt,
            system=(
                "You write warm, specific closing notes learners read after a puzzle. "
                "Use we/us with them; never 'the user'. No element names, no therapy jargon."
            ),
            max_tokens=500,
        )
    except Exception as e:
        logger.error("Synthesis generation failed for puzzle %s: %s", course_puzzle_id, e)
        synthesis = "(We couldn't generate your closing note — you can still review your canvas.)"

    # Save synthesis and mark completed
    updated = await puzzle_repo.save_synthesis_and_complete(
        course_puzzle_id, synthesis.strip()
    )

    return CompletePuzzleResponse(
        status="completed",
        completed_at=updated.completed_at,
        synthesis=updated.synthesis,
    )


@router.post(
    "/canvas/{course_puzzle_id}/reflection-answers",
    response_model=CoursePuzzleResponse,
)
async def save_reflection_answers(
    course_puzzle_id: str,
    request: ReflectionAnswersSaveRequest,
    current_user: dict = Depends(get_current_user),
):
    """Persist the three structured Forge Stage 3 reflection answers."""
    user = current_user["db_user"]
    await _verify_puzzle_ownership(course_puzzle_id, user)
    payload = {
        "elements_applied": (request.elements_applied or "").strip(),
        "most_insightful_element": (request.most_insightful_element or "").strip(),
        "question_at_start": (request.question_at_start or "").strip(),
    }
    updated = await puzzle_repo.update_reflection_answers(course_puzzle_id, payload)
    return _cp_to_response(updated)


def _parse_json_object(raw: str) -> dict:
    text = (raw or "").strip()
    if text.startswith("```"):
        lines = text.split("\n")[1:]
        if lines and lines[-1].strip() == "```":
            lines = lines[:-1]
        text = "\n".join(lines)
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        s, e = text.find("{"), text.rfind("}")
        if s >= 0 and e > s:
            return json.loads(text[s : e + 1])
        raise


@router.post(
    "/canvas/{course_puzzle_id}/forge-fire-starter",
    response_model=ForgeFireStarterDraftResponse,
)
async def forge_fire_starter_draft(
    course_puzzle_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Draft a Fire Starter via Claude (does not persist)."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)
    if not getattr(cp, "reflection_answers", None):
        raise HTTPException(
            status_code=400,
            detail="Complete the three reflection questions before forging a Fire Starter.",
        )

    all_thoughts = await thought_repo.get_by_course_puzzle(course_puzzle_id)
    all_thoughts.sort(key=lambda t: (t.flow_order, str(t.created_at or "")))
    lines = []
    for t in all_thoughts:
        lines.append(
            f"- [{t.id}] kind={t.kind} element={t.element} sub={t.sub_element} "
            f'content="{((t.content or "").strip())}"'
        )
    flow_block = "\n".join(lines) if lines else "(empty)"

    prompt = build_fire_starter_prompt(
        title=cp.title,
        puzzle_text=cp.puzzle_text,
        reflection_answers=cp.reflection_answers or {},
        thought_flow_lines=flow_block,
    )
    try:
        raw = await llm_client.generate_text(
            prompt=prompt,
            system="You output ONLY valid JSON for an API. No markdown fences.",
            max_tokens=1500,
        )
        data = _parse_json_object(raw)
    except Exception as e:
        logger.error("forge-fire-starter LLM failed %s: %s", course_puzzle_id, e)
        raise HTTPException(
            status_code=502,
            detail="Couldn't draft a Fire Starter right now. Try again shortly.",
        )

    try:
        return ForgeFireStarterDraftResponse(
            element_combination=list(data.get("element_combination") or []),
            flow_of_ideas=list(data.get("flow_of_ideas") or []),
            description=str(data.get("description") or "").strip(),
            proposed_names=list(data.get("proposed_names") or [])[:5],
        )
    except Exception as e:
        logger.error("forge-fire-starter parse failed %s: %s", course_puzzle_id, e)
        raise HTTPException(status_code=502, detail="Model returned invalid JSON.")


def _row_to_fire_starter_response(row: dict) -> FireStarterResponse:
    return FireStarterResponse(
        id=row["id"],
        user_id=row["user_id"],
        course_id=row["course_id"],
        course_puzzle_id=row["course_puzzle_id"],
        name=row["name"],
        description=row["description"],
        element_combination=row.get("element_combination") or [],
        flow_of_ideas=row.get("flow_of_ideas") or [],
        created_at=row.get("created_at"),
    )


@router.post("/fire-starters", response_model=FireStarterResponse)
async def create_fire_starter(
    request: FireStarterCreateRequest,
    current_user: dict = Depends(get_current_user),
):
    """Save a forged Fire Starter and mark the puzzle complete."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(request.course_puzzle_id, user)
    if cp.status == "completed":
        raise HTTPException(status_code=400, detail="This puzzle is already completed.")

    name = (request.name or "").strip()
    desc = (request.description or "").strip()
    if not name or not desc:
        raise HTTPException(status_code=400, detail="name and description are required")

    row = fire_starter_repo.create(
        {
            "user_id": user.id,
            "course_id": cp.course_id,
            "course_puzzle_id": request.course_puzzle_id,
            "name": name,
            "description": desc,
            "element_combination": request.element_combination,
            "flow_of_ideas": request.flow_of_ideas,
        }
    )
    if not row:
        raise HTTPException(status_code=500, detail="Failed to save Fire Starter")

    course = await course_repo.get_by_id(cp.course_id)
    if not course:
        raise HTTPException(status_code=500, detail="Parent course not found")

    all_thoughts = await thought_repo.get_by_course_puzzle(request.course_puzzle_id)
    thoughts = [t for t in all_thoughts if t.kind in ("thought", "nudge")]
    reflections = [t for t in all_thoughts if t.kind == "reflection"]
    synthesis = ""
    try:
        syn_prompt = _build_synthesis_prompt(cp, course, thoughts, reflections)
        synthesis = await llm_client.generate_text(
            prompt=syn_prompt,
            system=(
                "You write warm, specific closing notes learners read after a puzzle. "
                "Use we/us with them; never 'the user'. No element names, no therapy jargon."
            ),
            max_tokens=500,
        )
    except Exception as e:
        logger.error("Synthesis after fire starter failed %s: %s", request.course_puzzle_id, e)
        synthesis = "(We couldn't generate your closing note — you can still review your canvas.)"

    await puzzle_repo.save_synthesis_and_complete(request.course_puzzle_id, synthesis.strip())

    return _row_to_fire_starter_response(row)


@router.get("/fire-starters", response_model=List[FireStarterResponse])
async def list_fire_starters(
    course_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    user = current_user["db_user"]
    if course_id:
        course = await course_repo.get_by_id(course_id)
        if not course or course.user_id != user.id:
            raise HTTPException(status_code=403, detail="Not your course")
        rows = fire_starter_repo.list_by_course(course_id)
    else:
        rows = fire_starter_repo.list_by_user(user.id)
    return [_row_to_fire_starter_response(r) for r in rows]


@router.get(
    "/canvas-test/dev-redirect",
    response_model=DevRedirectResponse,
)
async def canvas_test_dev_redirect(
    current_user: dict = Depends(get_current_user),
):
    """Dev-only helper. Resolves to the first puzzle of the user's most
    recent ready/active/completed course. Returns 404 if none.

    Used by /canvas-test in the frontend to land on a real canvas without
    having to click through the course list."""
    user = current_user["db_user"]
    courses = await course_repo.get_user_courses(user.id, limit=50)
    for c in courses:
        if c.course_status in ("ready", "active", "completed"):
            puzzles = await puzzle_repo.get_by_course(c.id)
            if puzzles:
                return DevRedirectResponse(course_puzzle_id=puzzles[0].id)
    raise HTTPException(status_code=404, detail="No ready course puzzles found")
