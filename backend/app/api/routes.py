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
)
from app.domain.entities import (
    Response, Hint, Element, SessionStatus,
    Component, ElementMessage, DeepUnderstanding,
)
from app.domain.services import (
    build_session_completion_prompt, build_extract_understanding_prompt,
    build_extract_insight_prompt, build_batched_chat_prompt,
)
from app.adapters.supabase_adapter import (
    SupabaseUserRepository,
    SupabaseSessionRepository,
    SupabaseResponseRepository,
    SupabaseHintRepository,
    SupabaseComponentRepository,
    SupabaseElementMessageRepository,
    SupabaseDeepUnderstandingRepository,
)
from app.adapters.claude_adapter import ClaudeStreamingAdapter
from app.adapters.openai_adapter import OpenAIImageAdapter
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
llm_client = ClaudeStreamingAdapter()
image_client = OpenAIImageAdapter()

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
