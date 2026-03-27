-- Migration: Real Problem Pivot
-- Add problem_description to sessions, make puzzle_id nullable, create deep_understanding table

ALTER TABLE sessions ADD COLUMN problem_description TEXT;
ALTER TABLE sessions ALTER COLUMN puzzle_id DROP NOT NULL;

CREATE TABLE deep_understanding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  prompt_index INTEGER NOT NULL,
  element VARCHAR(50) NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_deep_understanding_session_id ON deep_understanding(session_id);
