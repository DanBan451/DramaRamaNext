-- Migration 011: thoughts.is_nudge
--
-- Adds an `is_nudge` flag to thoughts. AI-generated "nudge" blocks dropped
-- on the canvas at the Stage 1 → Stage 2 transition are persisted as normal
-- thoughts (so they participate in drag/connect/delete the same way as the
-- user's own thoughts), but flagged so the UI can render them with a
-- distinct treatment ("AI Nudge" badge, dashed border) and so we can later
-- distinguish AI vs. human contributions in any analytics.
--
-- Default is FALSE — every existing thought is user-authored.

ALTER TABLE thoughts
    ADD COLUMN IF NOT EXISTS is_nudge BOOLEAN NOT NULL DEFAULT FALSE;

-- Helps "are there already nudges on this canvas?" lookups when deciding
-- whether to seed Stage 2 nudges (we only do it once per puzzle).
CREATE INDEX IF NOT EXISTS idx_thoughts_course_puzzle_is_nudge
    ON thoughts(course_puzzle_id, is_nudge);
