"""
Repository Ports - Abstract interfaces for data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import User, Session, Response, Hint

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
    async def create(self, user_id: str, algorithm_title: str, algorithm_url: Optional[str] = None) -> Session:
        pass
    
    @abstractmethod
    async def get_by_id(self, session_id: str) -> Optional[Session]:
        pass
    
    @abstractmethod
    async def get_user_sessions(self, user_id: str, limit: int = 50) -> List[Session]:
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
    async def update(self, hint_id: str, **kwargs) -> Hint:
        pass

