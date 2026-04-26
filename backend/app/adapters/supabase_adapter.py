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
    Puzzle, Component, ElementMessage, DeepUnderstanding,
    Course, IntakeMessage, CoursePuzzle, Thought, ThoughtConnection,
)
from app.ports.repositories import (
    UserRepository, SessionRepository, ResponseRepository, HintRepository,
    PuzzleRepository, ComponentRepository, ElementMessageRepository,
    DeepUnderstandingRepository, CourseRepository, CoursePuzzleRepository,
    ThoughtRepository, ThoughtConnectionRepository,
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

    async def update_archetype(self, user_id: str, archetype_name: str, archetype_description: str, avatar_image_url: str = None) -> User:
        update_data = {
            "archetype_name": archetype_name,
            "archetype_description": archetype_description,
        }
        if avatar_image_url:
            update_data["avatar_image_url"] = avatar_image_url
        result = self.client.table("users").update(update_data).eq("id", user_id).execute()
        return User(**result.data[0])

class SupabaseSessionRepository(SessionRepository):
    def __init__(self):
        self.client = get_supabase_client()
    
    def _row_to_session(self, row: dict) -> Session:
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            puzzle_id=row.get("puzzle_id"),
            problem_description=row.get("problem_description"),
            thinker_description=row.get("thinker_description"),
            started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
            ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
            status=SessionStatus(row["status"]),
            prompts_completed=row["prompts_completed"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
            cube_primary_color=row.get("cube_primary_color"),
            cube_secondary_color=row.get("cube_secondary_color"),
            cube_complexity=row.get("cube_complexity"),
            cube_label=row.get("cube_label"),
            cube_image_url=row.get("cube_image_url"),
            understanding_document=row.get("understanding_document"),
        )

    async def create(self, user_id: str, problem_description: str, puzzle_id: str = None) -> Session:
        data = {
            "user_id": user_id,
            "problem_description": problem_description,
            "status": SessionStatus.IN_PROGRESS.value,
            "prompts_completed": 0,
        }
        if puzzle_id:
            data["puzzle_id"] = puzzle_id
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

    async def get_active_session_by_description(self, user_id: str, problem_description: str) -> Optional[Session]:
        """Find an active (in_progress) session matching exact problem_description."""
        result = self.client.table("sessions").select("*").eq("user_id", user_id).eq("problem_description", problem_description).eq("status", SessionStatus.IN_PROGRESS.value).order("created_at", desc=True).limit(1).execute()
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
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )
    
    async def create(self, hint: Hint) -> Hint:
        data = {
            "session_id": hint.session_id,
            "hint_text": hint.hint_text,
            "element_focus": hint.element_focus.value if hint.element_focus else None,
            "patterns_detected": hint.patterns_detected,
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


class SupabaseComponentRepository(ComponentRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_component(self, row: dict) -> Component:
        return Component(
            id=row["id"],
            session_id=row["session_id"],
            puzzle_id=row["puzzle_id"],
            user_id=row["user_id"],
            title=row["title"],
            key_insight=row["key_insight"],
            input_context=row["input_context"],
            output_capability=row["output_capability"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, component: Component) -> Component:
        data = {
            "session_id": component.session_id,
            "puzzle_id": component.puzzle_id,
            "user_id": component.user_id,
            "title": component.title,
            "key_insight": component.key_insight,
            "input_context": component.input_context,
            "output_capability": component.output_capability,
        }
        result = self.client.table("components").insert(data).execute()
        return self._row_to_component(result.data[0])

    async def get_by_session_id(self, session_id: str) -> Optional[Component]:
        result = self.client.table("components").select("*").eq("session_id", session_id).limit(1).execute()
        if result.data:
            return self._row_to_component(result.data[0])
        return None

    async def get_by_user_id(self, user_id: str, limit: int = 50) -> List[Component]:
        result = self.client.table("components").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        return [self._row_to_component(row) for row in result.data]


class SupabaseElementMessageRepository(ElementMessageRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_msg(self, row: dict) -> ElementMessage:
        return ElementMessage(
            id=row["id"],
            session_id=row["session_id"],
            prompt_index=row.get("prompt_index", 0),
            role=row["role"],
            message_text=row["message_text"],
            element_applied=row.get("element_applied"),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, message: ElementMessage) -> ElementMessage:
        data = {
            "session_id": message.session_id,
            "prompt_index": message.prompt_index,
            "role": message.role,
            "message_text": message.message_text,
        }
        if message.element_applied:
            data["element_applied"] = message.element_applied
        result = self.client.table("element_messages").insert(data).execute()
        return self._row_to_msg(result.data[0])

    async def get_by_session_and_prompt(self, session_id: str, prompt_index: int) -> List[ElementMessage]:
        result = (
            self.client.table("element_messages")
            .select("*")
            .eq("session_id", session_id)
            .eq("prompt_index", prompt_index)
            .order("created_at")
            .execute()
        )
        return [self._row_to_msg(row) for row in result.data]

    async def get_all_for_session(self, session_id: str) -> List[ElementMessage]:
        result = (
            self.client.table("element_messages")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return [self._row_to_msg(row) for row in result.data]

    async def get_latest_user_messages_per_prompt(self, session_id: str) -> dict:
        """Get the most recent user message for each prompt_index."""
        result = (
            self.client.table("element_messages")
            .select("*")
            .eq("session_id", session_id)
            .eq("role", "user")
            .order("created_at", desc=True)
            .execute()
        )
        latest = {}
        for row in result.data:
            pi = row["prompt_index"]
            if pi not in latest:
                latest[pi] = row["message_text"]
        return latest


class SupabaseDeepUnderstandingRepository(DeepUnderstandingRepository):
    def __init__(self):
        self.client = get_supabase_client()

    def _row_to_entry(self, row: dict) -> DeepUnderstanding:
        return DeepUnderstanding(
            id=row["id"],
            session_id=row["session_id"],
            prompt_index=row.get("prompt_index", 0),
            element=row["element"],
            insight_text=row["insight_text"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

    async def create(self, entry: DeepUnderstanding) -> DeepUnderstanding:
        data = {
            "session_id": entry.session_id,
            "element": entry.element,
            "insight_text": entry.insight_text,
        }
        # Only include prompt_index if it's set (for backward compatibility)
        if entry.prompt_index:
            data["prompt_index"] = entry.prompt_index
        result = self.client.table("deep_understanding").insert(data).execute()
        return self._row_to_entry(result.data[0])

    async def get_by_session_id(self, session_id: str) -> list[DeepUnderstanding]:
        result = (
            self.client.table("deep_understanding")
            .select("*")
            .eq("session_id", session_id)
            .order("created_at")
            .execute()
        )
        return [self._row_to_entry(row) for row in result.data]


class SupabaseCourseRepository(CourseRepository):
    def __init__(self):
        self.client = get_supabase_client()

    @staticmethod
    def _parse_dt(value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _row_to_course(self, row: dict) -> Course:
        raw_msgs = row.get("intake_messages") or []
        messages: List[IntakeMessage] = []
        for m in raw_msgs:
            if not isinstance(m, dict):
                continue
            messages.append(IntakeMessage(
                role=m.get("role", "user"),
                content=m.get("content", ""),
                created_at=self._parse_dt(m.get("created_at")),
            ))

        raw_quotes = row.get("raw_quotes")
        if raw_quotes is not None and not isinstance(raw_quotes, list):
            raw_quotes = None

        return Course(
            id=row["id"],
            user_id=row["user_id"],
            intake_status=row.get("intake_status", "in_progress"),
            intake_messages=messages,
            crisp_statement=row.get("crisp_statement"),
            domain=row.get("domain"),
            what=row.get("what"),
            why=row.get("why"),
            blocker=row.get("blocker"),
            effective_looks_like=row.get("effective_looks_like"),
            raw_quotes=raw_quotes,
            course_status=row.get("course_status", "awaiting_puzzles"),
            generation_error=row.get("generation_error"),
            generation_started_at=self._parse_dt(row.get("generation_started_at")),
            generation_completed_at=self._parse_dt(row.get("generation_completed_at")),
            created_at=self._parse_dt(row.get("created_at")),
            updated_at=self._parse_dt(row.get("updated_at")),
        )

    @staticmethod
    def _msg_to_dict(m: IntakeMessage) -> dict:
        return {
            "role": m.role,
            "content": m.content,
            "created_at": (m.created_at or datetime.utcnow()).isoformat(),
        }

    async def create(self, user_id: str) -> Course:
        data = {
            "user_id": user_id,
            "intake_status": "in_progress",
            "intake_messages": [],
            "course_status": "awaiting_puzzles",
        }
        result = self.client.table("courses").insert(data).execute()
        return self._row_to_course(result.data[0])

    async def get_by_id(self, course_id: str) -> Optional[Course]:
        result = self.client.table("courses").select("*").eq("id", course_id).execute()
        if result.data:
            return self._row_to_course(result.data[0])
        return None

    async def get_user_courses(self, user_id: str, limit: int = 50) -> List[Course]:
        result = (
            self.client.table("courses")
            .select("*")
            .eq("user_id", user_id)
            .order("created_at", desc=True)
            .limit(limit)
            .execute()
        )
        return [self._row_to_course(row) for row in result.data]

    async def append_intake_message(self, course_id: str, message: IntakeMessage) -> Course:
        # Read-modify-write. Simpler than a Postgres function and adequate
        # for one-message-at-a-time intake traffic.
        existing = (
            self.client.table("courses")
            .select("intake_messages")
            .eq("id", course_id)
            .execute()
        )
        if not existing.data:
            raise ValueError(f"Course {course_id} not found")
        msgs = existing.data[0].get("intake_messages") or []
        msgs.append(self._msg_to_dict(message))
        result = (
            self.client.table("courses")
            .update({
                "intake_messages": msgs,
                "updated_at": datetime.utcnow().isoformat(),
            })
            .eq("id", course_id)
            .execute()
        )
        return self._row_to_course(result.data[0])

    async def complete_intake(
        self,
        course_id: str,
        crisp_statement: str,
        domain: str,
        what: str,
        why: str,
        blocker: str,
        effective_looks_like: str,
        raw_quotes: List[str],
    ) -> Course:
        update = {
            "intake_status": "complete",
            "crisp_statement": crisp_statement,
            "domain": domain,
            "what": what,
            "why": why,
            "blocker": blocker,
            "effective_looks_like": effective_looks_like,
            "raw_quotes": raw_quotes or [],
            "course_status": "awaiting_puzzles",
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = self.client.table("courses").update(update).eq("id", course_id).execute()
        return self._row_to_course(result.data[0])

    async def abandon(self, course_id: str) -> None:
        self.client.table("courses").update({
            "intake_status": "abandoned",
            "course_status": "abandoned",
            "updated_at": datetime.utcnow().isoformat(),
        }).eq("id", course_id).execute()

    async def update_course_status(
        self,
        course_id: str,
        status: str,
        generation_error: Optional[str] = None,
    ) -> Course:
        now_iso = datetime.utcnow().isoformat()
        update: dict = {
            "course_status": status,
            "updated_at": now_iso,
        }
        # Clear/set generation_error explicitly based on status transition
        if status == "generating":
            update["generation_started_at"] = now_iso
            update["generation_error"] = None
        if status == "ready":
            update["generation_completed_at"] = now_iso
            update["generation_error"] = None
        if status == "generation_failed":
            update["generation_completed_at"] = now_iso
            if generation_error is not None:
                update["generation_error"] = generation_error

        result = (
            self.client.table("courses")
            .update(update)
            .eq("id", course_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Course {course_id} not found")
        return self._row_to_course(result.data[0])


class SupabaseCoursePuzzleRepository(CoursePuzzleRepository):
    def __init__(self):
        self.client = get_supabase_client()

    @staticmethod
    def _parse_dt(value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _row_to_course_puzzle(self, row: dict) -> CoursePuzzle:
        return CoursePuzzle(
            id=row["id"],
            course_id=row["course_id"],
            position=row["position"],
            title=row["title"],
            puzzle_text=row["puzzle_text"],
            answer=row["answer"],
            primary_element=row["primary_element"],
            why_this_trains_the_element=row["why_this_trains_the_element"],
            domain_connection=row["domain_connection"],
            bridge_back=row["bridge_back"],
            status=row.get("status", "pending"),
            completed_at=self._parse_dt(row.get("completed_at")),
            created_at=self._parse_dt(row.get("created_at")),
            updated_at=self._parse_dt(row.get("updated_at")),
        )

    async def create_many(
        self,
        course_id: str,
        puzzles: List[dict],
    ) -> List[CoursePuzzle]:
        if not puzzles:
            return []
        rows = [
            {
                "course_id": course_id,
                "position": p["position"],
                "title": p["title"],
                "puzzle_text": p["puzzle_text"],
                "answer": p["answer"],
                "primary_element": p["primary_element"],
                "why_this_trains_the_element": p["why_this_trains_the_element"],
                "domain_connection": p["domain_connection"],
                "bridge_back": p["bridge_back"],
                "status": "pending",
            }
            for p in puzzles
        ]
        result = self.client.table("course_puzzles").insert(rows).execute()
        # Order by position for determinism
        sorted_rows = sorted(result.data, key=lambda r: r.get("position", 0))
        return [self._row_to_course_puzzle(r) for r in sorted_rows]

    async def get_by_course(self, course_id: str) -> List[CoursePuzzle]:
        result = (
            self.client.table("course_puzzles")
            .select("*")
            .eq("course_id", course_id)
            .order("position")
            .execute()
        )
        return [self._row_to_course_puzzle(row) for row in result.data]

    async def get_by_id(self, puzzle_id: str) -> Optional[CoursePuzzle]:
        result = (
            self.client.table("course_puzzles")
            .select("*")
            .eq("id", puzzle_id)
            .execute()
        )
        if result.data:
            return self._row_to_course_puzzle(result.data[0])
        return None

    async def delete_by_course(self, course_id: str) -> int:
        existing = (
            self.client.table("course_puzzles")
            .select("id")
            .eq("course_id", course_id)
            .execute()
        )
        count = len(existing.data or [])
        if count:
            self.client.table("course_puzzles").delete().eq("course_id", course_id).execute()
        return count

    async def update_status(self, puzzle_id: str, status: str) -> CoursePuzzle:
        now_iso = datetime.utcnow().isoformat()
        update: dict = {"status": status, "updated_at": now_iso}
        if status == "completed":
            update["completed_at"] = now_iso
        result = (
            self.client.table("course_puzzles")
            .update(update)
            .eq("id", puzzle_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Puzzle {puzzle_id} not found")
        return self._row_to_course_puzzle(result.data[0])

    async def get_with_course(self, course_puzzle_id: str):
        """Return (CoursePuzzle, course_user_id) tuple, or None.
        Uses PostgREST FK-join syntax `courses(user_id)` to fetch the owner
        in one round trip. Matches the ownership-check helper pattern."""
        result = (
            self.client.table("course_puzzles")
            .select("*, courses(user_id)")
            .eq("id", course_puzzle_id)
            .execute()
        )
        if not result.data:
            return None
        row = result.data[0]
        course_info = row.get("courses") or {}
        course_user_id = course_info.get("user_id")
        if not course_user_id:
            # Puzzle's parent course row is missing — treat as not found.
            return None
        # Strip the join payload before mapping to the domain entity.
        row_without_join = {k: v for k, v in row.items() if k != "courses"}
        cp = self._row_to_course_puzzle(row_without_join)
        return cp, course_user_id


# ============ Canvas: Thoughts & Connections (Phase 4b) ============

class SupabaseThoughtRepository(ThoughtRepository):
    def __init__(self):
        self.client = get_supabase_client()

    @staticmethod
    def _parse_dt(value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _row_to_thought(self, row: dict) -> Thought:
        return Thought(
            id=row["id"],
            course_puzzle_id=row["course_puzzle_id"],
            user_id=row["user_id"],
            element=row.get("element"),
            sub_element=row.get("sub_element"),
            content=row["content"],
            flow_order=row["flow_order"],
            time_spent_seconds=row.get("time_spent_seconds"),
            pos_x=row.get("pos_x", 0) or 0,
            pos_y=row.get("pos_y", 0) or 0,
            created_at=self._parse_dt(row.get("created_at")),
            updated_at=self._parse_dt(row.get("updated_at")),
        )

    async def create(
        self,
        course_puzzle_id: str,
        user_id: str,
        content: str,
        element: Optional[str],
        sub_element: Optional[str],
        pos_x: float,
        pos_y: float,
        time_spent_seconds: Optional[int],
    ) -> Thought:
        # Assign flow_order = max(flow_order) + 1 for this puzzle.
        # Race-condition tolerant per phase 4b design note — duplicate
        # flow_order values are acceptable; we sort by created_at as tiebreak.
        existing = (
            self.client.table("thoughts")
            .select("flow_order")
            .eq("course_puzzle_id", course_puzzle_id)
            .order("flow_order", desc=True)
            .limit(1)
            .execute()
        )
        max_order = 0
        if existing.data:
            max_order = existing.data[0].get("flow_order") or 0
        next_order = max_order + 1

        data = {
            "course_puzzle_id": course_puzzle_id,
            "user_id": user_id,
            "element": element,
            "sub_element": sub_element,
            "content": content,
            "flow_order": next_order,
            "time_spent_seconds": time_spent_seconds,
            "pos_x": pos_x,
            "pos_y": pos_y,
        }
        result = self.client.table("thoughts").insert(data).execute()
        return self._row_to_thought(result.data[0])

    async def get_by_id(self, thought_id: str) -> Optional[Thought]:
        result = (
            self.client.table("thoughts")
            .select("*")
            .eq("id", thought_id)
            .execute()
        )
        if result.data:
            return self._row_to_thought(result.data[0])
        return None

    async def get_by_course_puzzle(
        self,
        course_puzzle_id: str,
    ) -> List[Thought]:
        result = (
            self.client.table("thoughts")
            .select("*")
            .eq("course_puzzle_id", course_puzzle_id)
            .order("flow_order")
            .execute()
        )
        return [self._row_to_thought(r) for r in result.data]

    async def update_position(
        self,
        thought_id: str,
        pos_x: float,
        pos_y: float,
    ) -> Thought:
        update = {
            "pos_x": pos_x,
            "pos_y": pos_y,
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = (
            self.client.table("thoughts")
            .update(update)
            .eq("id", thought_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Thought {thought_id} not found")
        return self._row_to_thought(result.data[0])

    async def update_content(
        self,
        thought_id: str,
        content: str,
    ) -> Thought:
        update = {
            "content": content,
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = (
            self.client.table("thoughts")
            .update(update)
            .eq("id", thought_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Thought {thought_id} not found")
        return self._row_to_thought(result.data[0])

    async def update_tagging(
        self,
        thought_id: str,
        element: Optional[str],
        sub_element: Optional[str],
    ) -> Thought:
        update = {
            "element": element,
            "sub_element": sub_element,
            "updated_at": datetime.utcnow().isoformat(),
        }
        result = (
            self.client.table("thoughts")
            .update(update)
            .eq("id", thought_id)
            .execute()
        )
        if not result.data:
            raise ValueError(f"Thought {thought_id} not found")
        return self._row_to_thought(result.data[0])

    async def delete(self, thought_id: str) -> None:
        self.client.table("thoughts").delete().eq("id", thought_id).execute()


class SupabaseThoughtConnectionRepository(ThoughtConnectionRepository):
    def __init__(self):
        self.client = get_supabase_client()

    @staticmethod
    def _parse_dt(value):
        if not value:
            return None
        if isinstance(value, datetime):
            return value
        return datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    def _row_to_connection(self, row: dict) -> ThoughtConnection:
        return ThoughtConnection(
            id=row["id"],
            course_puzzle_id=row["course_puzzle_id"],
            user_id=row["user_id"],
            from_thought_id=row["from_thought_id"],
            to_thought_id=row["to_thought_id"],
            created_at=self._parse_dt(row.get("created_at")),
        )

    async def create(
        self,
        course_puzzle_id: str,
        user_id: str,
        from_thought_id: str,
        to_thought_id: str,
    ) -> ThoughtConnection:
        # Idempotent: if the (course_puzzle_id, from, to) triple already
        # exists, return it. Otherwise insert. We fetch-then-insert instead of
        # upsert because PostgREST's upsert requires we send all columns and
        # will overwrite unrelated fields; for a tiny table this is fine.
        existing = (
            self.client.table("thought_connections")
            .select("*")
            .eq("course_puzzle_id", course_puzzle_id)
            .eq("from_thought_id", from_thought_id)
            .eq("to_thought_id", to_thought_id)
            .execute()
        )
        if existing.data:
            return self._row_to_connection(existing.data[0])

        data = {
            "course_puzzle_id": course_puzzle_id,
            "user_id": user_id,
            "from_thought_id": from_thought_id,
            "to_thought_id": to_thought_id,
        }
        result = self.client.table("thought_connections").insert(data).execute()
        return self._row_to_connection(result.data[0])

    async def get_by_id(self, connection_id: str) -> Optional[ThoughtConnection]:
        result = (
            self.client.table("thought_connections")
            .select("*")
            .eq("id", connection_id)
            .execute()
        )
        if result.data:
            return self._row_to_connection(result.data[0])
        return None

    async def get_by_course_puzzle(
        self,
        course_puzzle_id: str,
    ) -> List[ThoughtConnection]:
        result = (
            self.client.table("thought_connections")
            .select("*")
            .eq("course_puzzle_id", course_puzzle_id)
            .order("created_at")
            .execute()
        )
        return [self._row_to_connection(r) for r in result.data]

    async def delete(self, connection_id: str) -> None:
        self.client.table("thought_connections").delete().eq("id", connection_id).execute()
