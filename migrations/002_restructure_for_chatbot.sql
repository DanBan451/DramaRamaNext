-- DramaRama Restructuring Migration
-- From visible 5 Elements workspace to invisible scaffolding chatbot
-- Run this in Supabase SQL Editor

-- 1. Add problem_description and thinker_description to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS problem_description TEXT;
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS thinker_description TEXT;

-- 2. Make puzzle_id nullable (for backward compatibility)
ALTER TABLE sessions ALTER COLUMN puzzle_id DROP NOT NULL;

-- 3. Add element_applied column to element_messages
-- This tracks which element was invisibly applied for each message
ALTER TABLE element_messages ADD COLUMN IF NOT EXISTS element_applied VARCHAR(50);

-- 4. Create deep_understanding table if it doesn't exist
CREATE TABLE IF NOT EXISTS deep_understanding (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES sessions(id) ON DELETE CASCADE,
  element VARCHAR(50) NOT NULL,
  insight_text TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_deep_understanding_session_id ON deep_understanding(session_id);

-- 6. Note: prompt_index in deep_understanding is no longer needed for new architecture
-- but we keep it for backward compatibility with existing data
-- New records will use element_applied in element_messages instead
