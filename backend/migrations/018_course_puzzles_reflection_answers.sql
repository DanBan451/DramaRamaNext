-- Migration 018: Store Stage 3 structured reflection answers on course_puzzles

ALTER TABLE course_puzzles
  ADD COLUMN IF NOT EXISTS reflection_answers JSONB;
