"""
Repository Ports - Abstract interfaces for data access
"""
from abc import ABC, abstractmethod
from typing import List, Optional
from app.domain.entities import (
    User, Session, Response, Hint, Puzzle, Component, ElementMessage, DeepUnderstanding,
    Course, IntakeMessage, CoursePuzzle, Thought, ThoughtConnection,
)

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



class CourseRepository(ABC):
    @abstractmethod
    async def create(self, user_id: str) -> Course:
        """Create a new course in 'in_progress' intake state."""
        ...

    @abstractmethod
    async def get_by_id(self, course_id: str) -> Optional[Course]:
        ...

    @abstractmethod
    async def get_user_courses(self, user_id: str, limit: int = 50) -> List[Course]:
        """Return courses for a user, newest first. Includes all statuses."""
        ...

    @abstractmethod
    async def append_intake_message(
        self,
        course_id: str,
        message: IntakeMessage,
    ) -> Course:
        """Append a message to intake_messages and return the updated course."""
        ...

    @abstractmethod
    async def complete_intake(
        self,
        course_id: str,
        crisp_statement: str,
        course_label: Optional[str],
        domain: str,
        what: str,
        why: str,
        blocker: str,
        effective_looks_like: str,
        raw_quotes: List[str],
    ) -> Course:
        """Mark intake_status='complete', save structured fields, set
        course_status='awaiting_puzzles'. Return the updated course."""
        ...

    @abstractmethod
    async def abandon(self, course_id: str) -> None:
        ...

    @abstractmethod
    async def update_course_status(
        self,
        course_id: str,
        status: str,
        generation_error: Optional[str] = None,
    ) -> Course:
        """Update course_status. Optionally set generation_error.
        Sets generation_started_at=now() when status='generating'; sets
        generation_completed_at=now() when status in ('ready', 'generation_failed')."""
        ...


class CoursePuzzleRepository(ABC):
    @abstractmethod
    async def create_many(
        self,
        course_id: str,
        puzzles: List[dict],
    ) -> List[CoursePuzzle]:
        """Bulk-insert puzzles for a course. Each dict must contain:
        position, title, puzzle_text, answer, primary_element,
        why_this_trains_the_element, domain_connection, bridge_back."""
        ...

    @abstractmethod
    async def get_by_course(self, course_id: str) -> List[CoursePuzzle]:
        """Return all puzzles for a course, ordered by position."""
        ...

    @abstractmethod
    async def get_by_id(self, puzzle_id: str) -> Optional[CoursePuzzle]:
        ...

    @abstractmethod
    async def delete_by_course(self, course_id: str) -> int:
        """Delete all puzzles for a course. Returns count deleted.
        Used when retrying generation after a failure."""
        ...

    @abstractmethod
    async def update_status(
        self,
        puzzle_id: str,
        status: str,
    ) -> CoursePuzzle:
        ...

    @abstractmethod
    async def update_current_stage(
        self,
        puzzle_id: str,
        current_stage: int,
    ) -> CoursePuzzle:
        """Persist the user's current stage (1..3) for resume-on-return."""
        ...

    @abstractmethod
    async def get_with_course(
        self,
        course_puzzle_id: str,
    ) -> Optional[tuple]:
        """Return (course_puzzle, course_user_id) for ownership checks.
        Returns None if the puzzle doesn't exist."""
        ...

    @abstractmethod
    async def update_stage3_phase(
        self,
        puzzle_id: str,
        phase: str,
    ) -> CoursePuzzle:
        """Set stage3_phase to 'reflect' or 'bridge'."""
        ...

    @abstractmethod
    async def save_synthesis_and_complete(
        self,
        course_puzzle_id: str,
        synthesis: str,
    ) -> CoursePuzzle:
        """Save synthesis text, set status='completed', set completed_at=now().
        Single transaction."""
        ...

    @abstractmethod
    async def update_reflection_answers(
        self,
        puzzle_id: str,
        reflection_answers: dict,
    ) -> CoursePuzzle:
        """Persist Stage 3 structured reflection answers as JSONB."""
        ...


class ThoughtRepository(ABC):
    @abstractmethod
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
        is_nudge: bool = False,
    ) -> Thought:
        """Create a thought. Server assigns flow_order = max(flow_order)+1
        for the (course_puzzle_id) group. Set is_nudge=True for
        AI-generated nudge thoughts seeded at Stage 2 transition."""
        ...

    @abstractmethod
    async def count_nudges(self, course_puzzle_id: str) -> int:
        """How many is_nudge=true thoughts already exist on this canvas.
        Used to gate the one-shot Stage 2 nudge seeding."""
        ...

    @abstractmethod
    async def get_by_id(self, thought_id: str) -> Optional[Thought]:
        ...

    @abstractmethod
    async def get_by_course_puzzle(
        self,
        course_puzzle_id: str,
    ) -> List[Thought]:
        """Return thoughts for a puzzle, ordered by flow_order ASC."""
        ...

    @abstractmethod
    async def get_user_thoughts_by_course_puzzle(
        self,
        course_puzzle_id: str,
    ) -> List[Thought]:
        """Return user-authored thoughts only (is_nudge=false), ordered by flow_order ASC.
        Used for Stage 2 diagnostic input — excludes AI nudges."""
        ...

    @abstractmethod
    async def create_reflection(
        self,
        course_puzzle_id: str,
        user_id: str,
        content: str,
        element: Optional[str],
        sub_element: Optional[str],
        pos_x: float,
        pos_y: float,
    ) -> Thought:
        """Create a reflection thought (Stage 3). Sets kind='reflection'."""
        ...

    @abstractmethod
    async def get_by_kind(
        self,
        course_puzzle_id: str,
        kind: str,
    ) -> List[Thought]:
        """Return thoughts of a given kind for a course_puzzle."""
        ...

    @abstractmethod
    async def get_latest_non_nudge_by_created_at(
        self,
        course_puzzle_id: str,
    ) -> Optional[Thought]:
        """Most recent user-authored thought (is_nudge=false) by created_at."""
        ...

    @abstractmethod
    async def update_position(
        self,
        thought_id: str,
        pos_x: float,
        pos_y: float,
    ) -> Thought:
        ...

    @abstractmethod
    async def update_content(
        self,
        thought_id: str,
        content: str,
    ) -> Thought:
        ...

    @abstractmethod
    async def update_tagging(
        self,
        thought_id: str,
        element: Optional[str],
        sub_element: Optional[str],
    ) -> Thought:
        ...

    @abstractmethod
    async def delete(self, thought_id: str) -> None:
        """Cascade-deletes any thought_connections via FK ON DELETE CASCADE."""
        ...


class ThoughtConnectionRepository(ABC):
    @abstractmethod
    async def create(
        self,
        course_puzzle_id: str,
        user_id: str,
        from_thought_id: str,
        to_thought_id: str,
    ) -> ThoughtConnection:
        """Create an edge. Idempotent on the UNIQUE
        (course_puzzle_id, from_thought_id, to_thought_id) constraint —
        returns the existing row if the same edge was already created.
        Raises if from == to (DB CHECK)."""
        ...

    @abstractmethod
    async def get_by_id(self, connection_id: str) -> Optional[ThoughtConnection]:
        ...

    @abstractmethod
    async def get_by_course_puzzle(
        self,
        course_puzzle_id: str,
    ) -> List[ThoughtConnection]:
        ...

    @abstractmethod
    async def delete(self, connection_id: str) -> None:
        ...
