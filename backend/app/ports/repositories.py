"""
Repository Ports - Abstract interfaces for data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import User, Session, Response, Hint, Puzzle, TeacherFlow

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
    async def create(self, user_id: str, puzzle_id: str) -> Session:
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


class TeacherFlowRepository(ABC):
    @abstractmethod
    async def create(self, flow: TeacherFlow) -> TeacherFlow:
        pass

    @abstractmethod
    async def get_flows_for_puzzle(self, puzzle_id: str) -> List[TeacherFlow]:
        pass

    @abstractmethod
    async def count_flows_for_puzzle(self, puzzle_id: str) -> int:
        pass

