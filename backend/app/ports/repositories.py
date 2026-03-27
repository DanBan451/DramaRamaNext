"""
Repository Ports - Abstract interfaces for data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import User, Session, Response, Hint, Puzzle, Component, ElementMessage, DeepUnderstanding

class UserRepository(ABC):
    @abstractmethod
    async def get_by_clerk_id(self, clerk_id: str) -> Optional[User]:
        pass
    
    @abstractmethod
    async def create(self, clerk_id: str, email: Optional[str] = None) -> User:
        pass
    
    @abstractmethod
    async def get_or_create(self, clerk_id: str, email: Optional[str] = None) -> User:
        pass

class SessionRepository(ABC):
    @abstractmethod
    async def create(self, user_id: str, problem_description: str, puzzle_id: str = None) -> Session:
        pass
    
    @abstractmethod
    async def get_by_id(self, session_id: str) -> Optional[Session]:
        pass
    
    @abstractmethod
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Session]:
        pass

    @abstractmethod
    async def get_active_session_for_puzzle(self, user_id: str, puzzle_id: str) -> Optional[Session]:
        pass
    
    @abstractmethod
    async def update(self, session_id: str, **kwargs) -> Session:
        pass

    @abstractmethod
    async def delete(self, session_id: str) -> bool:
        """Delete a session (and cascade delete related records via DB FK)."""
        pass

class ResponseRepository(ABC):
    @abstractmethod
    async def create(self, response: Response) -> Response:
        pass
    
    @abstractmethod
    async def get_session_responses(self, session_id: str) -> List[Response]:
        pass

class HintRepository(ABC):
    @abstractmethod
    async def create(self, hint: Hint) -> Hint:
        pass
    
    @abstractmethod
    async def get_by_session_id(self, session_id: str) -> Optional[Hint]:
        pass

    @abstractmethod
    async def get_hints_for_session(self, session_id: str) -> List[Hint]:
        pass

    @abstractmethod
    async def count_hints_for_puzzle_user(self, user_id: str, puzzle_id: str) -> int:
        pass
    
    @abstractmethod
    async def update(self, hint_id: str, **kwargs) -> Hint:
        pass


class PuzzleRepository(ABC):
    @abstractmethod
    async def create(self, puzzle: Puzzle) -> Puzzle:
        pass

    @abstractmethod
    async def get_by_id(self, puzzle_id: str) -> Optional[Puzzle]:
        pass

    @abstractmethod
    async def get_all(self) -> List[Puzzle]:
        pass


class ComponentRepository(ABC):
    @abstractmethod
    async def create(self, component: Component) -> Component:
        pass

    @abstractmethod
    async def get_by_session_id(self, session_id: str) -> Optional[Component]:
        pass

    @abstractmethod
    async def get_by_user_id(self, user_id: str, limit: int = 50) -> List[Component]:
        pass


class ElementMessageRepository(ABC):
    @abstractmethod
    async def create(self, message: ElementMessage) -> ElementMessage:
        pass

    @abstractmethod
    async def get_by_session_and_prompt(self, session_id: str, prompt_index: int) -> List[ElementMessage]:
        """Get all messages for a specific element prompt in a session, ordered by created_at."""
        pass

    @abstractmethod
    async def get_all_for_session(self, session_id: str) -> List[ElementMessage]:
        """Get all messages for a session, ordered by prompt_index then created_at."""
        pass

    @abstractmethod
    async def get_latest_user_messages_per_prompt(self, session_id: str) -> dict:
        """Get the most recent user message for each prompt_index. Returns {prompt_index: message_text}."""
        pass


class DeepUnderstandingRepository(ABC):
    @abstractmethod
    async def create(self, entry: DeepUnderstanding) -> DeepUnderstanding:
        pass

    @abstractmethod
    async def get_by_session_id(self, session_id: str) -> List[DeepUnderstanding]:
        """Get all deep understanding entries for a session, ordered by created_at."""
        pass

