"""
Supabase Adapter - Implementation of repository ports using Supabase
"""
from typing import List, Optional
from supabase import create_client, Client
from datetime import datetime
import uuid

from app.core.config import settings
from app.domain.entities import User, Session, Response, Hint, SessionStatus, Element, SubElement
from app.ports.repositories import UserRepository, SessionRepository, ResponseRepository, HintRepository

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
            return user
        return await self.create(clerk_id, email)

class SupabaseSessionRepository(SessionRepository):
    def __init__(self):
        self.client = get_supabase_client()
    
    async def create(self, user_id: str, algorithm_title: str, algorithm_url: Optional[str] = None) -> Session:
        data = {
            "user_id": user_id,
            "algorithm_title": algorithm_title,
            "algorithm_url": algorithm_url,
            "status": SessionStatus.IN_PROGRESS.value,
            "prompts_completed": 0,
        }
        result = self.client.table("sessions").insert(data).execute()
        row = result.data[0]
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            algorithm_title=row["algorithm_title"],
            algorithm_url=row.get("algorithm_url"),
            started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
            ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
            status=SessionStatus(row["status"]),
            prompts_completed=row["prompts_completed"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )
    
    async def get_by_id(self, session_id: str) -> Optional[Session]:
        result = self.client.table("sessions").select("*").eq("id", session_id).execute()
        if result.data:
            row = result.data[0]
            return Session(
                id=row["id"],
                user_id=row["user_id"],
                algorithm_title=row["algorithm_title"],
                algorithm_url=row.get("algorithm_url"),
                started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
                ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
                status=SessionStatus(row["status"]),
                prompts_completed=row["prompts_completed"],
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
            )
        return None
    
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Session]:
        result = self.client.table("sessions").select("*").eq("user_id", user_id).order("created_at", desc=True).limit(limit).execute()
        sessions = []
        for row in result.data:
            sessions.append(Session(
                id=row["id"],
                user_id=row["user_id"],
                algorithm_title=row["algorithm_title"],
                algorithm_url=row.get("algorithm_url"),
                started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
                ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
                status=SessionStatus(row["status"]),
                prompts_completed=row["prompts_completed"],
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
            ))
        return sessions
    
    async def update(self, session_id: str, **kwargs) -> Session:
        # Convert enums to values
        if "status" in kwargs and isinstance(kwargs["status"], SessionStatus):
            kwargs["status"] = kwargs["status"].value

        # Supabase client expects JSON-serializable values
        for k, v in list(kwargs.items()):
            if isinstance(v, datetime):
                kwargs[k] = v.isoformat()
        
        result = self.client.table("sessions").update(kwargs).eq("id", session_id).execute()
        row = result.data[0]
        return Session(
            id=row["id"],
            user_id=row["user_id"],
            algorithm_title=row["algorithm_title"],
            algorithm_url=row.get("algorithm_url"),
            started_at=datetime.fromisoformat(row["started_at"].replace("Z", "+00:00")),
            ended_at=datetime.fromisoformat(row["ended_at"].replace("Z", "+00:00")) if row.get("ended_at") else None,
            status=SessionStatus(row["status"]),
            prompts_completed=row["prompts_completed"],
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

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
    
    async def create(self, hint: Hint) -> Hint:
        data = {
            "session_id": hint.session_id,
            "hint_text": hint.hint_text,
            "element_focus": hint.element_focus.value if hint.element_focus else None,
            "patterns_detected": hint.patterns_detected,
        }
        result = self.client.table("hints").insert(data).execute()
        row = result.data[0]
        return Hint(
            id=row["id"],
            session_id=row["session_id"],
            hint_text=row["hint_text"],
            element_focus=Element(row["element_focus"]) if row.get("element_focus") else None,
            patterns_detected=row.get("patterns_detected"),
            user_final_response=row.get("user_final_response"),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )
    
    async def get_by_session_id(self, session_id: str) -> Optional[Hint]:
        result = self.client.table("hints").select("*").eq("session_id", session_id).execute()
        if result.data:
            row = result.data[0]
            return Hint(
                id=row["id"],
                session_id=row["session_id"],
                hint_text=row["hint_text"],
                element_focus=Element(row["element_focus"]) if row.get("element_focus") else None,
                patterns_detected=row.get("patterns_detected"),
                user_final_response=row.get("user_final_response"),
                created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
            )
        return None
    
    async def update(self, hint_id: str, **kwargs) -> Hint:
        if "element_focus" in kwargs and isinstance(kwargs["element_focus"], Element):
            kwargs["element_focus"] = kwargs["element_focus"].value
        
        result = self.client.table("hints").update(kwargs).eq("id", hint_id).execute()
        row = result.data[0]
        return Hint(
            id=row["id"],
            session_id=row["session_id"],
            hint_text=row["hint_text"],
            element_focus=Element(row["element_focus"]) if row.get("element_focus") else None,
            patterns_detected=row.get("patterns_detected"),
            user_final_response=row.get("user_final_response"),
            created_at=datetime.fromisoformat(row["created_at"].replace("Z", "+00:00")) if row.get("created_at") else None,
        )

