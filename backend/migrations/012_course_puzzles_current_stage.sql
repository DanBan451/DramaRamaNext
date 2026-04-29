-- Migration 012: course_puzzles.current_stage
--
-- Persists which stage (1=Think, 2=Redirect, 3=Quintessence) the user is
-- currently on for a given puzzle. Without this, advancing to Stage 2
-- only lives in browser memory — leaving the canvas and coming back drops
-- the user back to Stage 1 and the AI nudges have to re-seed (or worse,
-- the user re-does work they already did).
--
-- Default 1 — every existing puzzle starts at Stage 1.

ALTER TABLE course_puzzles
    ADD COLUMN IF NOT EXISTS current_stage INTEGER NOT NULL DEFAULT 1;

-- Defensive constraint: stages are 1..3 today; reject anything else so a
-- buggy client can't put us in a weird state.
ALTER TABLE course_puzzles
    DROP CONSTRAINT IF EXISTS course_puzzles_current_stage_range;
ALTER TABLE course_puzzles
    ADD CONSTRAINT course_puzzles_current_stage_range
    CHECK (current_stage BETWEEN 1 AND 3);
