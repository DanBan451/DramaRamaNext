"""
Puzzle generation orchestration (Phase 3).

Runs as a fire-and-forget asyncio task triggered after intake completes.
Updates course_status across the lifecycle:
    awaiting_puzzles → generating → ready | generation_failed
"""
import json
import logging
from typing import Optional

from app.ports.repositories import CourseRepository, CoursePuzzleRepository
from app.domain.services import build_puzzle_generation_prompt
from app.adapters.claude_adapter import ClaudeStreamingAdapter

logger = logging.getLogger(__name__)


VALID_ELEMENTS = {"earth", "fire", "air", "water", "synthesis"}
MIN_PUZZLES = 3
MAX_PUZZLES = 10


class PuzzleGenerationError(Exception):
    pass


async def generate_course_puzzles(
    course_id: str,
    course_repo: CourseRepository,
    puzzle_repo: CoursePuzzleRepository,
    llm_client: ClaudeStreamingAdapter,
) -> None:
    """
    Generate puzzles for a course. Fire-and-forget asyncio task.

    Idempotent on retry: deletes any existing course_puzzles before
    generating new ones.
    """
    try:
        await course_repo.update_course_status(course_id, "generating")

        course = await course_repo.get_by_id(course_id)
        if not course:
            raise PuzzleGenerationError(f"Course {course_id} not found")
        if not course.crisp_statement:
            raise PuzzleGenerationError("Course has no crisp_statement")

        # Clear any existing puzzles (retry case)
        await puzzle_repo.delete_by_course(course_id)

        course_dict = {
            "crisp_statement": course.crisp_statement,
            "domain": course.domain or "",
            "what": course.what or "",
            "why": course.why or "",
            "blocker": course.blocker or "",
            "effective_looks_like": course.effective_looks_like or "",
            "raw_quotes": course.raw_quotes or [],
        }
        prompt = build_puzzle_generation_prompt(course_dict)

        # Non-streaming — we want the complete JSON object before parsing.
        # Generation can produce up to ~10 puzzles with several text fields
        # each, so allow plenty of room.
        raw_response = await llm_client.generate_text(prompt, max_tokens=8000)

        parsed = _parse_puzzle_response(raw_response)
        _validate_puzzles(parsed)

        puzzle_dicts = [
            {
                "position": p["position"],
                "title": p["title"],
                "puzzle_text": p["puzzle_text"],
                "answer": p["answer"],
                "primary_element": p["primary_element"],
                "why_this_trains_the_element": p["why_this_trains_the_element"],
                "domain_connection": p["domain_connection"],
                "bridge_back": p["bridge_back"],
            }
            for p in parsed["puzzles"]
        ]
        await puzzle_repo.create_many(course_id, puzzle_dicts)

        await course_repo.update_course_status(course_id, "ready")
        logger.info(
            "Generated %d puzzles for course %s", len(puzzle_dicts), course_id
        )

    except Exception as e:
        logger.exception("Puzzle generation failed for course %s", course_id)
        try:
            await course_repo.update_course_status(
                course_id,
                "generation_failed",
                generation_error=str(e)[:500],
            )
        except Exception:
            logger.exception("Failed to mark course as generation_failed")


def _parse_puzzle_response(raw: str) -> dict:
    """Parse the LLM's JSON response. Strips code fences if present."""
    text = (raw or "").strip()

    if text.startswith("```"):
        lines = text.split("\n")
        # Drop the opening fence line (```json or ```)
        lines = lines[1:]
        # Drop the closing fence if present
        if lines and lines[-1].strip().startswith("```"):
            lines = lines[:-1]
        text = "\n".join(lines)

    try:
        return json.loads(text)
    except json.JSONDecodeError as e:
        # Last-resort: extract the largest {...} substring
        start = text.find("{")
        end = text.rfind("}")
        if start >= 0 and end > start:
            try:
                return json.loads(text[start:end + 1])
            except json.JSONDecodeError:
                pass
        raise PuzzleGenerationError(f"Failed to parse JSON: {e}")


def _validate_puzzles(parsed: dict) -> None:
    """Validate the parsed puzzle response. Raises PuzzleGenerationError if invalid."""
    if "puzzles" not in parsed or not isinstance(parsed["puzzles"], list):
        raise PuzzleGenerationError("Response missing 'puzzles' array")

    puzzles = parsed["puzzles"]

    if len(puzzles) < MIN_PUZZLES:
        raise PuzzleGenerationError(
            f"Got {len(puzzles)} puzzles, minimum is {MIN_PUZZLES}"
        )
    if len(puzzles) > MAX_PUZZLES:
        raise PuzzleGenerationError(
            f"Got {len(puzzles)} puzzles, maximum is {MAX_PUZZLES}"
        )

    required_fields = {
        "position", "title", "primary_element", "puzzle_text", "answer",
        "why_this_trains_the_element", "domain_connection", "bridge_back",
    }

    seen_positions = set()
    for i, p in enumerate(puzzles):
        if not isinstance(p, dict):
            raise PuzzleGenerationError(f"Puzzle {i} is not an object")

        missing = required_fields - p.keys()
        if missing:
            raise PuzzleGenerationError(
                f"Puzzle {i} missing fields: {sorted(missing)}"
            )

        if p["primary_element"] not in VALID_ELEMENTS:
            raise PuzzleGenerationError(
                f"Puzzle {i} has invalid element: {p['primary_element']}"
            )

        if p["position"] in seen_positions:
            raise PuzzleGenerationError(f"Duplicate position: {p['position']}")
        seen_positions.add(p["position"])

        if not isinstance(p["puzzle_text"], str) or len(p["puzzle_text"]) < 30:
            raise PuzzleGenerationError(f"Puzzle {i} text too short")
        if not isinstance(p["title"], str) or len(p["title"]) < 3:
            raise PuzzleGenerationError(f"Puzzle {i} title too short")
