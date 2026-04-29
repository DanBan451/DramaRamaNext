"""
API Routes - HTTP endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from typing import List
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
    CourseSummary, UserCoursesResponse, CourseDetailResponse,
    CoursePuzzleResponse, CoursePuzzlesResponse, RetryGenerationResponse,
    ThoughtCreateRequest, ThoughtUpdatePositionRequest,
    ThoughtUpdateContentRequest, ThoughtUpdateTaggingRequest,
    ThoughtResponse, ConnectionCreateRequest, ConnectionResponse,
    CanvasStateResponse, DevRedirectResponse,
    CanvasChatRequest,
    CanvasNudgesRequest, CanvasNudgesResponse,
    CanvasStageUpdateRequest,
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

def _course_to_summary(course) -> CourseSummary:
    return CourseSummary(
        id=course.id,
        intake_status=course.intake_status,
        course_status=course.course_status,
        crisp_statement=course.crisp_statement,
        domain=course.domain,
        generation_error=getattr(course, "generation_error", None),
        created_at=course.created_at,
        updated_at=course.updated_at,
    )


@router.post("/course/intake/start", response_model=CourseIntakeStartResponse)
async def start_course_intake(
    current_user: dict = Depends(get_current_user),
):
    """Create a new Course in 'in_progress' intake state."""
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

    If the model emitted the <<INTAKE_COMPLETE>> marker followed by valid JSON,
    save only the user-visible portion as the assistant message and commit
    the structured fields via complete_intake. Otherwise save the response
    as-is and leave intake open.
    """
    full_response = _scrub_role_prefixes(full_response)
    marker = "<<INTAKE_COMPLETE>>"
    if marker in full_response:
        visible_part, _, json_part = full_response.partition(marker)
        try:
            data = json.loads(json_part.strip())
        except json.JSONDecodeError as e:
            logger.warning(
                "Intake marker present but JSON unparseable for course %s: %s",
                course_id, e,
            )
            assistant_msg = IntakeMessage(role="assistant", content=full_response.strip())
            await course_repo.append_intake_message(course_id, assistant_msg)
            return

        assistant_msg = IntakeMessage(role="assistant", content=visible_part.strip())
        await course_repo.append_intake_message(course_id, assistant_msg)
        try:
            await course_repo.complete_intake(
                course_id=course_id,
                crisp_statement=data.get("crisp_statement", "").strip(),
                domain=data.get("domain", "").strip(),
                what=data.get("what", "").strip(),
                why=data.get("why", "").strip(),
                blocker=data.get("blocker", "").strip(),
                effective_looks_like=data.get("effective_looks_like", "").strip(),
                raw_quotes=data.get("raw_quotes", []) or [],
            )
            # Phase 3: kick off puzzle generation as a background task.
            _spawn_puzzle_generation(course_id)
        except Exception as e:
            logger.error("Failed to complete intake for course %s: %s", course_id, e)
    else:
        assistant_msg = IntakeMessage(role="assistant", content=full_response.strip())
        await course_repo.append_intake_message(course_id, assistant_msg)


@router.post("/course/intake/{course_id}/message")
async def course_intake_message(
    course_id: str,
    request: CourseIntakeMessageRequest,
    current_user: dict = Depends(get_current_user),
):
    """Stream the intake chatbot's next reply (SSE).

    On stream completion, the buffered response is parsed for the
    <<INTAKE_COMPLETE>> marker and either commits the course or saves
    the assistant message as-is.
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
    if course.intake_status != "in_progress":
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
        # After [DONE], persist the buffered assistant turn (and commit intake if marker present)
        try:
            await _handle_intake_response(course_id, "".join(buffer))
        except Exception as e:
            logger.error("Post-stream intake handling failed for course %s: %s", course_id, e)

    return StreamingResponse(gen(), media_type="text/event-stream")


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

# Element + sub-element copy used to anchor the system prompt.
#
# CRITICAL: Keep this in sync with `frontend/lib/elements.ts` — both the
# element list and the EXACT sub-element names. The previous version only
# listed top-level elements, which caused the model to confidently deny
# the existence of named sub-elements ("there's no separate 'Fail Again'
# element") even though they're real items in the app's UI. By naming
# every sub-element here, the model can reference them concretely (e.g.
# "Fire → Fail Again") and the user gets matching guidance.
_CANVAS_ELEMENTS_REFERENCE = (
    "🌳 Earth — Understand Deeply. Master basics before you reach for clever moves.\n"
    "  • Earth → Start with Simple — solve a simpler version first; nail the absolute fundamentals.\n"
    "  • Earth → Spotlight the Specific — build a concrete example simpler than the original; probe it; recast back.\n"
    "  • Earth → Add the Adjective — pick a descriptor (iterative? defensive? sequential?) and stay with it until insight.\n"
    "\n"
    "🔥 Fire — Fail Effectively. Failed attempts narrow the search space.\n"
    "  • Fire → Fail Fast — never stare at a blank page; write SOMETHING (even wrong) so you have a thing to react to.\n"
    "  • Fire → Fail Again — pursue failure on purpose; treat each failed attempt as a precious joule of understanding.\n"
    "  • Fire → Fail Intentionally — invent a deliberately extreme/impossible scenario, then tame it by analyzing where it breaks.\n"
    "\n"
    "💨 Air — Create Questions. The right question opens doors no answer can.\n"
    "  • Air → Be Your Own Socrates — ask the meta-question: what is the REAL question here? Are you asking the right one?\n"
    "  • Air → Ask Basic Questions — ask the fundamental knowledge questions you've been skipping; they unlock structure.\n"
    "  • Air → Ask Another Question — when stuck, switch to a different but related question; come back refreshed.\n"
    "\n"
    "🌊 Water — Flow with Ideas. Run multiple paths in parallel; doubt what feels obvious.\n"
    "  • Water → Run Down All Paths — stick with each idea until it's clearly a dead-end, then ask why; map promise vs. dead.\n"
    "  • Water → Embrace Doubt — never be 100% sure; inhabit the opposite view; what would a disagreer say?\n"
    "  • Water → Never Stop — follow your best idea past the first insight; ask 'and then?' and 'where does this lead?'\n"
    "\n"
    "🪨 Change — The fifth element. Emerges when the other four show up at the same table; covered in Stage 3.\n"
)


def _build_canvas_chat_system_prompt(stage: int, cp) -> str:
    """System prompt for the canvas stage chatbot.

    The puzzle's `answer` is intentionally NOT included here — the bot
    must never give it, and the easiest way to guarantee that is not to
    let the model see it.
    """
    base = (
        "You are the Guide inside DramaRama's canvas — a thinking coach that "
        "helps a user practice the 5 Elements of Effective Thinking on a "
        "specific puzzle. Be warm, direct, and concise (2–4 short paragraphs "
        "max unless the user explicitly asks for depth). Use light Markdown "
        "with **bold** for emphasis. Never include code fences.\n\n"
        f"PUZZLE CONTEXT (do not quote verbatim back at the user unless useful):\n"
        f"- Title: {cp.title}\n"
        f"- Prompt: {cp.puzzle_text}\n\n"
        "ELEMENTS REFERENCE:\n"
        f"{_CANVAS_ELEMENTS_REFERENCE}\n"
        "HARD RULES (apply in EVERY stage):\n"
        "- NEVER give the puzzle's answer or any solution-shaped hint.\n"
        "- NEVER extend, critique, or finish the user's flow on the canvas.\n"
        "- If asked for the answer, refuse plainly and redirect them to the elements.\n"
        "- Do not invent puzzle facts beyond what's in PUZZLE CONTEXT.\n"
    )

    if stage == 1:
        return base + (
            "\nSTAGE 1 — Think.\n"
            "Your job is to teach what each Element wants from the user, and "
            "to remind them what Stage 1 is for: doing real, independent "
            "thinking on the canvas (drop blocks, draw connections). Answer "
            "questions about specific elements with concrete, element-specific "
            "guidance — not just by naming the element. Example: if asked "
            "about Fire, explain *what fire wants you to do right now* on this "
            "puzzle (try a guess, find an error, fail intentionally), not "
            "just 'that's Fire'."
        )
    if stage == 2:
        return base + (
            "\nSTAGE 2 — Redirect.\n"
            "You have ALREADY posted the only flow you'll ever post for this "
            "puzzle. The user must work that flow on the canvas themselves. "
            "For every user message, do not introduce new steps, do not "
            "extend the flow, do not give answers. Briefly remind them that "
            "the goal isn't the answer — it's to practice the 5 Elements — "
            "and point them back to the existing flow. Keep replies to 1–3 "
            "short sentences."
        )
    return base + (
        "\nSTAGE 3 — Quintessence.\n"
        "Help the user reflect on how this puzzle connects back to the "
        "larger goal that prompted the course. Ask reflective questions; do "
        "not summarize their work for them."
    )


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

    system_prompt = _build_canvas_chat_system_prompt(request.stage, cp)
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


def _build_nudges_prompt(cp, existing_thoughts: List[str]) -> str:
    """Prompt to generate Stage 2 nudge thoughts.

    The model is asked to return a strict JSON array of nudge objects.
    We keep the schema small so JSON validation is easy server-side. We
    DO include the puzzle text but NOT the solution; the model is
    explicitly forbidden from giving the answer.
    """
    primary = cp.primary_element or "synthesis"
    valid_subs = _VALID_SUB_ELEMENTS.get(primary, _VALID_SUB_ELEMENTS["synthesis"])
    valid_subs_str = ", ".join(f'"{s}"' for s in valid_subs)

    user_block = ""
    if existing_thoughts:
        items = "\n".join(f"  - {t.strip()}" for t in existing_thoughts if t.strip())
        user_block = (
            "\nThe user has already written these thoughts on the canvas — your "
            "nudges should EXTEND their flow, not duplicate it:\n" + items + "\n"
        )
    else:
        user_block = (
            "\nThe user hasn't written any thoughts yet. Your nudges should give "
            "them a concrete, puzzle-aware starting point.\n"
        )

    return (
        "You are seeding nudge blocks on the user's thinking canvas at the "
        "Stage 1 → Stage 2 transition. Generate 4 short, concrete nudges "
        "that train the puzzle's primary element. Each nudge is a single "
        "thought block the user can act on directly.\n\n"
        f"PUZZLE CONTEXT:\n- Title: {cp.title}\n- Prompt: {cp.puzzle_text}\n"
        f"- Primary element: {primary}\n"
        f"{user_block}\n"
        "HARD RULES:\n"
        "- Do NOT give the answer or any solution-shaped hint.\n"
        "- Each nudge must be ACTIONABLE on the canvas (a thing the user "
        "can think about / write down right now), not abstract advice.\n"
        "- Each nudge content must be ≤ 240 characters.\n"
        f"- Tag each nudge with one of these sub_element ids: {valid_subs_str}.\n"
        f"- Set element to \"{primary if primary != 'synthesis' else 'earth'}\" "
        "for synthesis nudges pick the element matching the chosen sub_element id prefix.\n\n"
        "Return ONLY a JSON object of the form:\n"
        '{"nudges": [\n'
        '  {"element": "<element id>", "sub_element": "<sub_element id>", "content": "<≤240 chars>"},\n'
        "  ... 4 items total\n"
        "]}\n"
        "No prose, no markdown, no code fences. Just the JSON object."
    )


def _parse_nudges_json(raw: str) -> list:
    """Best-effort parse of the model's nudges payload. Strips common
    wrappers (markdown fences, leading/trailing prose) before parsing."""
    text = (raw or "").strip()
    # Strip ```json ... ``` fences if the model adds them despite instructions.
    if text.startswith("```"):
        text = re.sub(r"^```[a-zA-Z]*\n?", "", text)
        text = re.sub(r"\n?```\s*$", "", text)
    # If there's leading prose, isolate the first '{' ... last '}' block.
    first = text.find("{")
    last = text.rfind("}")
    if first != -1 and last != -1 and last > first:
        text = text[first : last + 1]
    try:
        obj = json.loads(text)
    except Exception as e:
        raise ValueError(f"Model did not return valid JSON: {e}")
    nudges = obj.get("nudges") if isinstance(obj, dict) else None
    if not isinstance(nudges, list):
        raise ValueError("Missing 'nudges' array in model output")
    return nudges


@router.post(
    "/canvas/{course_puzzle_id}/stage2/nudges",
    response_model=CanvasNudgesResponse,
)
async def generate_stage2_nudges(
    course_puzzle_id: str,
    request: CanvasNudgesRequest,
    current_user: dict = Depends(get_current_user),
):
    """Seed AI-generated nudge thoughts on the canvas. Idempotent: if any
    nudges already exist for this puzzle we return them as-is and do not
    call the LLM again. This mirrors how the user advances Stage 1 → Stage
    2 once and only once."""
    user = current_user["db_user"]
    cp = await _verify_puzzle_ownership(course_puzzle_id, user)

    # Idempotency: already seeded? Return existing.
    existing_count = await thought_repo.count_nudges(course_puzzle_id)
    if existing_count > 0:
        all_thoughts = await thought_repo.get_by_course_puzzle(course_puzzle_id)
        existing = [t for t in all_thoughts if getattr(t, "is_nudge", False)]
        return CanvasNudgesResponse(
            nudges=[_thought_to_response(t) for t in existing],
        )

    if not rate_limit_user(user.id, "canvas_chat"):
        raise HTTPException(
            status_code=429,
            detail="Slow down — give it a few seconds before generating again.",
        )

    # 1. Ask the model for 4 nudges as JSON.
    prompt = _build_nudges_prompt(cp, request.existing_thoughts)
    try:
        raw = await llm_client.generate_text(
            prompt=prompt,
            system=(
                "You generate short, structured JSON for an internal API. "
                "Never include prose outside the JSON object."
            ),
            max_tokens=900,
        )
        items = _parse_nudges_json(raw)
    except Exception as e:
        logger.error("Nudge generation failed for puzzle %s: %s", course_puzzle_id, e)
        raise HTTPException(
            status_code=502,
            detail="Couldn't generate nudges right now. Try again in a moment.",
        )

    # 2. Validate + persist. We're forgiving on extra keys / wrong types,
    #    but require content + valid sub_element.
    primary = cp.primary_element or "synthesis"
    valid_subs = set(_VALID_SUB_ELEMENTS.get(primary, _VALID_SUB_ELEMENTS["synthesis"]))

    # Use frontend-supplied positions when present (they know the canvas
    # geometry / where the user's existing thoughts live). Fall back to a
    # 2x2 grid for clients that don't send any.
    fallback_positions = [
        (520, 100),
        (520, 260),
        (820, 100),
        (820, 260),
    ]
    grid_positions: list = []
    for p in (request.positions or [])[:4]:
        if isinstance(p, (list, tuple)) and len(p) >= 2:
            try:
                grid_positions.append((float(p[0]), float(p[1])))
            except (TypeError, ValueError):
                pass
    while len(grid_positions) < 4:
        grid_positions.append(fallback_positions[len(grid_positions)])

    created: list = []
    for i, item in enumerate(items[:4]):
        if not isinstance(item, dict):
            continue
        content = (item.get("content") or "").strip()
        if not content:
            continue
        if len(content) > 280:
            content = content[:277] + "…"
        sub_element = item.get("sub_element")
        if sub_element not in valid_subs:
            # Pick a default sub-element for the primary so we never drop
            # an untagged nudge — defeats the point of the feature.
            sub_element = next(iter(valid_subs))
        # Derive element from sub_element id prefix so synthesis puzzles
        # tag correctly across the 4 base elements.
        element = sub_element.split("-")[0]

        pos_x, pos_y = grid_positions[i] if i < len(grid_positions) else (520 + i * 100, 420)
        try:
            t = await thought_repo.create(
                course_puzzle_id=course_puzzle_id,
                user_id=user.id,
                content=content,
                element=element,
                sub_element=sub_element,
                pos_x=pos_x,
                pos_y=pos_y,
                time_spent_seconds=None,
                is_nudge=True,
            )
            created.append(t)
        except Exception as e:
            logger.error("Failed to persist nudge for puzzle %s: %s", course_puzzle_id, e)
            # Continue — partial success is still useful.

    if not created:
        raise HTTPException(
            status_code=502,
            detail="Couldn't generate nudges right now. Try again in a moment.",
        )

    return CanvasNudgesResponse(
        nudges=[_thought_to_response(t) for t in created],
    )


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
