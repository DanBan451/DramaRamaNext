"""
Supabase Adapter - Implementation of repository ports using Supabase
"""
from typing import List, Optional
from supabase import create_client, Client
from datetime import datetime
import uuid

from app.core.config import settings
from app.domain.entities import (
    User, Session, Response, Hint, SessionStatus, Element, SubElement,
    Puzzle, TeacherFlow, TeacherFlowStep,
)
from app.ports.repositories import (
    UserRepository, SessionRepository, ResponseRepository, HintRepository,
    PuzzleRepository, TeacherFlowRepository,
)

def get_supabase_client() -> Client:
    """Get Supabase client instance"""
    return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_KEY)

class SupabaseUserRepository(UserRepository):
    def __init__(self):
        self.client = get_supabase_client()
    
    async def get_by_clerk_id(self, clerk_id: str) -> Optional[User]:
        result = self.client.table("users").select("*").eq("clerk_id", clerk_id).execute()
        if result.data:
            return User(**result.data[0])
        return None
    
    async def create(self, clerk_id: str, email: Optional[str] = None) -> User:
        data = {
            "clerk_id": clerk_id,
            "email": email,
        }
        result = self.client.table("users").insert(data).execute()
        return User(**result.data[0])
    
    async def get_or_create(self, clerk_id: str, email: Optional[str] = None) -> User:
        user = await self.get_by_clerk_id(clerk_id)
        if user:
            # Sync email if it was missing and we now have it
            if email and not user.email:
                self.client.table("users").update({"email": email}).eq("clerk_id", clerk_id).execute()
                user.email = email
            return user
        return await self.create(clerk_id, email)

class SupabaseSessionRepository(SessionRepository):
    def __init__(self):
        self.client = get_supabase_client()
    
    def _row_to_session(self, row: dict) -> Session:
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            puzzle_id=row.get("puzzle_id"),
            started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
            ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
            status=SessionStatus(row["status"]),
            prompts_completed=row["prompts_completed"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, user_id: str, puzzle_id: str) -> Session:
        data = {
            "user_id": user_id,
            "puzzle_id": puzzle_id,
            "status": SessionStatus.IN_PROGRESS.value,
            "prompts_completed": 0,
        }
        result = self.client.table("sessions").insert(data).execute()
        return self._row_to_session(result.data[0])
    
    async def get_by_id(self, session_id: str) -> Optional[Session]:
        result = self.client.table("sessions").select("*").eq("id", session_id).execute()
        if result.data:
            return self._row_to_session(result.data[0])
        return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Session]:
        result = self.client.table("sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return [self._row_to_session(row) for row in result.data]
    
    async def get_active_session_for_puzzle(self, user_id: str, puzzle_id: str) -> Optional[Session]:
        """Find an active (in_progress) session for a specific puzzle"""
        result = self.client.table("sessions").select("*").eq("user_id", user_id).eq("puzzle_id", puzzle_id).eq("status", SessionStatus.IN_PROGRESS.value).order("created_at", desc=True).limit(1).execute()
        if result.data:
            return self._row_to_session(result.data[0])
        return None
    
    async def update(self, session_id: str, **kwargs) -> Session:
        # Convert enums to values
        if "status" in kwargs and isinstance(kwargs["status"], SessionStatus):
            kwargs["status"] = kwargs["status"].value

        # Supabase client expects JSON-serializable values
        for k, v in list(kwargs.items()):
            if isinstance(v, datetime):
                kwargs[k] = v.isoformat()
        
        result = self.client.table("sessions").update(kwargs).eq("id", session_id).execute()
        return self._row_to_session(result.data[0])

    async def delete(self, session_id: str) -> bool:
        """
        Delete a session. Related responses/hints should cascade via FK constraints.
        Returns True if a row was deleted.
        """
        result = self.client.table("sessions").delete().eq("id", session_id).execute()
        return bool(result.data)

class SupabaseResponseRepository(ResponseRepository):
    def __init__(self):
        self.client = get_supabase_client()
    
    async def create(self, response: Response) -> Response:
        data = {
            "session_id": response.session_id,
            "prompt_index": response.prompt_index,
            "element": response.element.value if isinstance(response.element, Element) else response.element,
            "sub_element": response.sub_element.value if isinstance(response.sub_element, SubElement) else response.sub_element,
            "response_text": response.response_text,
            "word_count": response.word_count,
            "time_spent_seconds": response.time_spent_seconds,
        }
        result = self.client.table("responses").insert(data).execute()
        row = result.data[0]
        return Response(
            id=row["id"],
            session_id=row["session_id"],
            prompt_index=row["prompt_index"],
            element=Element(row["element"]),
            sub_element=SubElement(row["sub_element"]),
            response_text=row["response_text"],
            word_count=row["word_count"],
            time_spent_seconds=row["time_spent_seconds"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )
    
    async def get_session_responses(self, session_id: str) -> List[Response]:
        result = self.client.table("responses").select("*").eq("session_id", session_id).order("prompt_index").execute()
        responses = []
        for row in result.data:
            responses.append(Response(
                id=row["id"],
                session_id=row["session_id"],
                prompt_index=row["prompt_index"],
                element=Element(row["element"]),
                sub_element=SubElement(row["sub_element"]),
                response_text=row["response_text"],
                word_count=row["word_count"],
                time_spent_seconds=row["time_spent_seconds"],
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
            ))
        return responses

class SupabaseHintRepository(HintRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_hint(self, row: dict) -> Hint:
        return Hint(
            id=row["id"],
            session_id=row["session_id"],
            hint_text=row["hint_text"],
            element_focus=Element(row["element_focus"]) if row.get("element_focus") else None,
            patterns_detected=row.get("patterns_detected"),
            user_final_response=row.get("user_final_response"),
            matched_flow_id=row.get("matched_flow_id"),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )
    
    async def create(self, hint: Hint) -> Hint:
        data = {
            "session_id": hint.session_id,
            "hint_text": hint.hint_text,
            "element_focus": hint.element_focus.value if hint.element_focus else None,
            "patterns_detected": hint.patterns_detected,
            "matched_flow_id": hint.matched_flow_id,
        }
        result = self.client.table("hints").insert(data).execute()
        return self._row_to_hint(result.data[0])
    
    async def get_by_session_id(self, session_id: str) -> Optional[Hint]:
        result = self.client.table("hints").select("*").eq("session_id", session_id).order("created_at", desc=True).limit(1).execute()
        if result.data:
            return self._row_to_hint(result.data[0])
        return None

    async def get_hints_for_session(self, session_id: str) -> List[Hint]:
        result = self.client.table("hints").select("*").eq("session_id", session_id).order("created_at").execute()
        return [self._row_to_hint(row) for row in result.data]

    async def count_hints_for_puzzle_user(self, user_id: str, puzzle_id: str) -> int:
        """Count nudges a user has used across all sessions for a given puzzle."""
        # Get all session ids for this user + puzzle
        sessions_result = self.client.table("sessions").select("id").eq("user_id", user_id).eq("puzzle_id", puzzle_id).execute()
        if not sessions_result.data:
            return 0
        session_ids = [s["id"] for s in sessions_result.data]
        # Count hints across those sessions
        hints_result = self.client.table("hints").select("id", count="exact").in_("session_id", session_ids).execute()
        return hints_result.count or 0
    
    async def update(self, hint_id: str, **kwargs) -> Hint:
        if "element_focus" in kwargs and isinstance(kwargs["element_focus"], Element):
            kwargs["element_focus"] = kwargs["element_focus"].value
        
        result = self.client.table("hints").update(kwargs).eq("id", hint_id).execute()
        return self._row_to_hint(result.data[0])


class SupabasePuzzleRepository(PuzzleRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_puzzle(self, row: dict) -> Puzzle:
        return Puzzle(
            id=row["id"],
            title=row["title"],
            scenario=row["scenario"],
            constraints=row.get("constraints") or [],
            example=row["example"],
            solution=row["solution"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, puzzle: Puzzle) -> Puzzle:
        data = {
            "title": puzzle.title,
            "scenario": puzzle.scenario,
            "constraints": puzzle.constraints,
            "example": puzzle.example,
            "solution": puzzle.solution,
        }
        result = self.client.table("puzzles").insert(data).execute()
        return self._row_to_puzzle(result.data[0])

    async def get_by_id(self, puzzle_id: str) -> Optional[Puzzle]:
        result = self.client.table("puzzles").select("*").eq("id", puzzle_id).execute()
        if result.data:
            return self._row_to_puzzle(result.data[0])
        return None

    async def get_all(self) -> List[Puzzle]:
        result = self.client.table("puzzles").select("*").order("created_at", desc=True).execute()
        return [self._row_to_puzzle(row) for row in result.data]


class SupabaseTeacherFlowRepository(TeacherFlowRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_flow(self, row: dict) -> TeacherFlow:
        raw_steps = row.get("steps") or []
        steps = [TeacherFlowStep(**s) for s in raw_steps]
        return TeacherFlow(
            id=row["id"],
            puzzle_id=row["puzzle_id"],
            flow_index=row["flow_index"],
            steps=steps,
            solution_reached=row.get("solution_reached", ""),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, flow: TeacherFlow) -> TeacherFlow:
        data = {
            "puzzle_id": flow.puzzle_id,
            "flow_index": flow.flow_index,
            "steps": [s.model_dump() for s in flow.steps],
            "solution_reached": flow.solution_reached,
        }
        result = self.client.table("teacher_flows").insert(data).execute()
        return self._row_to_flow(result.data[0])

    async def get_flows_for_puzzle(self, puzzle_id: str) -> List[TeacherFlow]:
        result = self.client.table("teacher_flows").select("*").eq("puzzle_id", puzzle_id).order("flow_index").execute()
        return [self._row_to_flow(row) for row in result.data]

    async def count_flows_for_puzzle(self, puzzle_id: str) -> int:
        result = self.client.table("teacher_flows").select("id", count="exact").eq("puzzle_id", puzzle_id).execute()
        return result.count or 0

