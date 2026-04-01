"""
API Routes - HTTP endpoints
"""
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
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
    build_cube_properties_prompt, build_archetype_prompt,
    build_select_element_prompt, build_chatbot_prompt, build_opening_question_prompt,
    build_extract_insight_prompt, build_thinker_description_prompt,
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
    
    if not request.problem_description or not request.problem_description.strip():
        raise HTTPException(status_code=400, detail="Problem description is required")
    
    problem_description = request.problem_description.strip()
    
    # Create new session with problem description
    session = await session_repo.create(
        user_id=user.id,
        problem_description=problem_description,
    )
    
    # Generate the first chatbot message (opening question using Earth 1.0 invisibly)
    first_message = None
    try:
        opening_prompt = build_opening_question_prompt(problem_description)
        first_message = await llm_client.generate_text(opening_prompt, max_tokens=100)
        first_message = first_message.strip()
        
        # Save as the first assistant message
        assistant_msg = ElementMessage(
            id="",
            session_id=session.id,
            prompt_index=0,
            role="assistant",
            message_text=first_message,
            element_applied="earth",  # Opening question uses Earth invisibly
        )
        await element_message_repo.create(assistant_msg)
    except Exception as e:
        logger.warning(f"Failed to generate opening question: {e}")
        first_message = "What do you currently understand about this problem, and where do you feel stuck?"
    
    # Generate cube visual properties via LLM (don't block session start)
    try:
        cube_prompt = build_cube_properties_prompt(problem_description)
        cube_response = await llm_client.generate_text(cube_prompt, max_tokens=200)
        cube_data = json.loads(cube_response.strip())
        
        cube_label = cube_data.get("label", "Problem")[:50]
        
        # Generate abstract texture for cube faces
        image_prompt = f"Abstract seamless texture pattern representing '{cube_label}'. Flowing gradients from {cube_data.get('primary_color', 'purple')} to {cube_data.get('secondary_color', 'blue')}. Ethereal, glowing energy patterns, subtle geometric shapes, digital art style. Square format, tileable, no text, no 3D objects, flat abstract design suitable for wrapping on a 3D surface."
        cube_image_url = await image_client.generate_image(image_prompt)
        
        # Update session with cube properties
        await session_repo.update(
            session.id,
            cube_primary_color=cube_data.get("primary_color", "#6366F1"),
            cube_secondary_color=cube_data.get("secondary_color", "#A5B4FC"),
            cube_complexity=min(5, max(1, int(cube_data.get("complexity", 3)))),
            cube_label=cube_label,
            cube_image_url=cube_image_url or None,
        )
        session = await session_repo.get_by_id(session.id)
    except Exception as e:
        logger.warning(f"Failed to generate cube properties: {e}")
    
    return SessionStartResponse(
        session_id=session.id,
        problem_description=session.problem_description,
        first_message=first_message,
        cube_primary_color=session.cube_primary_color,
        cube_secondary_color=session.cube_secondary_color,
        cube_complexity=session.cube_complexity,
        cube_label=session.cube_label,
        cube_image_url=session.cube_image_url,
    )

@router.post("/session/{session_id}/chat")
async def chat_with_session(
    session_id: str,
    request: ChatRequest,
    current_user: dict = Depends(get_current_user),
):
    """
    New chatbot endpoint: single conversation thread with invisible element selection.
    1. Saves user message
    2. Calls select_element to determine which element to apply
    3. Builds chatbot prompt with selected element
    4. Streams response via SSE
    5. Saves assistant response with element_applied
    6. Extracts insight in background
    7. Returns insight for Deep Understanding Document
    """
    user = current_user["db_user"]
    
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
    
    # Get full conversation history for this session
    all_messages = await element_message_repo.get_all_for_session(session_id)
    conversation_history = [
        {"role": msg.role, "message_text": msg.message_text}
        for msg in all_messages
    ]
    
    # Select element invisibly
    select_prompt = build_select_element_prompt(
        problem_description=problem_description,
        conversation_history=conversation_history,
        user_message=user_message,
    )
    element_response = await llm_client.generate_text(select_prompt, max_tokens=10)
    selected_element = element_response.strip().lower()
    
    # Validate element
    valid_elements = ["earth", "fire", "air", "water", "change"]
    if selected_element not in valid_elements:
        selected_element = "earth"  # Default to earth if invalid
    
    # Build chatbot prompt
    chatbot_prompt = build_chatbot_prompt(
        problem_description=problem_description,
        element=selected_element,
        conversation_history=conversation_history,
        user_message=user_message,
    )
    
    async def generate():
        """SSE generator for streaming chatbot response."""
        assistant_text = ""
        
        async for chunk in llm_client.generate_stream(chatbot_prompt, max_tokens=150):
            assistant_text += chunk
            yield f"data: {json.dumps({'type': 'chunk', 'content': chunk})}\n\n"
        
        # Save assistant response with element_applied
        assistant_msg = ElementMessage(
            id="",
            session_id=session_id,
            prompt_index=0,
            role="assistant",
            message_text=assistant_text.strip(),
            element_applied=selected_element,
        )
        await element_message_repo.create(assistant_msg)
        
        # Update the unified understanding document
        try:
            # Get fresh conversation history including the new messages
            all_msgs = await element_message_repo.get_all_for_session(session_id)
            
            # Build prompt to update the document
            update_prompt = build_extract_understanding_prompt(
                problem_description=problem_description,
                element=selected_element,
                prompt_index=0,
                conversation_history=all_msgs,
                existing_document=session.understanding_document or "",
            )
            
            # Generate updated document
            updated_doc = await llm_client.generate_text(update_prompt, max_tokens=1500)
            updated_doc = (updated_doc or "").strip()
            
            # Save to session
            if updated_doc:
                await session_repo.update(session_id, understanding_document=updated_doc)
                logger.info(f"Updated understanding document for session {session_id}")
        except Exception as e:
            logger.warning(f"Failed to update understanding document: {e}")
        
        # Send final message with element
        yield f"data: {json.dumps({'type': 'done', 'element': selected_element})}\n\n"
    
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
    
    # Get responses and deep understanding entries
    responses = await response_repo.get_session_responses(request.session_id)
    deep_insights = await deep_understanding_repo.get_by_session_id(request.session_id)
    
    # Build session completion prompt
    completion_prompt = build_session_completion_prompt(
        problem_description=session.problem_description or "",
        responses=responses,
        deep_insights=deep_insights,
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
        insight_m = re.search(r'"key_insight"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        context_m = re.search(r'"input_context"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        cap_m = re.search(r'"output_capability"\s*:\s*"((?:[^"\\]|\\.)*)"', analysis_text)
        component_data = {
            "title": title_m.group(1) if title_m else "Session Summary",
            "key_insight": insight_m.group(1) if insight_m else analysis_text[:500],
            "input_context": context_m.group(1) if context_m else (session.problem_description or ""),
            "output_capability": cap_m.group(1) if cap_m else "",
        }
    
    # Save component
    try:
        component = Component(
            id="",
            session_id=request.session_id,
            puzzle_id=session.puzzle_id or "",
            user_id=user.id,
            title=component_data.get("title", "Session Summary"),
            key_insight=component_data.get("key_insight", ""),
            input_context=component_data.get("input_context", ""),
            output_capability=component_data.get("output_capability", ""),
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
    
    # Generate thinker_description on first completed session
    thinker_description = None
    all_user_sessions = await session_repo.get_user_sessions(user.id, limit=100)
    completed_sessions = [s for s in all_user_sessions if s.status == SessionStatus.COMPLETED]
    
    # If this is the first completed session, generate thinker_description
    if len(completed_sessions) <= 1:
        try:
            # Get conversation history for this session
            all_messages = await element_message_repo.get_all_for_session(request.session_id)
            conversation_history = [
                {"role": msg.role, "message_text": msg.message_text}
                for msg in all_messages
            ]
            
            if conversation_history:
                thinker_prompt = build_thinker_description_prompt(conversation_history)
                thinker_description = await llm_client.generate_text(thinker_prompt, max_tokens=50)
                thinker_description = thinker_description.strip()
                
                # Save to session
                await session_repo.update(request.session_id, thinker_description=thinker_description)
                logger.info(f"Generated thinker description for user {user.id}: {thinker_description}")
        except Exception as e:
            logger.warning(f"Failed to generate thinker description: {e}")
    
    # Generate archetype/avatar if user doesn't have one, OR regenerate avatar if missing
    if not user.archetype_name or not user.avatar_image_url:
        try:
            # Get element breakdown for archetype generation
            all_sessions = await session_repo.get_user_sessions(user.id, limit=100)
            element_counts = {"earth": 0, "fire": 0, "air": 0, "water": 0, "change": 0}
            for s in all_sessions:
                s_responses = await response_repo.get_session_responses(s.id)
                for r in s_responses:
                    if r.element.value in element_counts:
                        element_counts[r.element.value] += r.word_count
            
            # Use existing archetype or generate new one
            archetype_name = user.archetype_name
            archetype_description = user.archetype_description
            
            if not archetype_name:
                archetype_prompt = build_archetype_prompt(element_counts)
                archetype_response = await llm_client.generate_text(archetype_prompt, max_tokens=200)
                archetype_data = json.loads(archetype_response.strip())
                archetype_name = archetype_data.get("archetype_name", "The Thinker")
                archetype_description = archetype_data.get("archetype_description", "A thoughtful problem solver.")
            
            # Generate avatar image with element-based gear and background
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
            logger.info(f"Generating avatar for user {user.id} with archetype '{archetype_name}'")
            avatar_image_url = await image_client.generate_image(avatar_prompt)
            logger.info(f"Avatar URL generated: {avatar_image_url[:50] if avatar_image_url else 'None'}...")
            
            await user_repo.update_archetype(
                user.id,
                archetype_name=archetype_name,
                archetype_description=archetype_description,
                avatar_image_url=avatar_image_url or None,
            )
        except Exception as e:
            logger.error(f"Failed to generate archetype/avatar: {e}")
    
    return {
        "success": True,
        "analysis": component_data,
        "thinker_description": thinker_description,
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
