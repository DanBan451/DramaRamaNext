-- =============================================================================
-- MUYAIUM Migration: Pivot from LeetCode to AI-Utilization Puzzles
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. New table: puzzles
CREATE TABLE IF NOT EXISTS puzzles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title       VARCHAR(255) NOT NULL,
    scenario    TEXT NOT NULL,
    constraints JSONB NOT NULL DEFAULT '[]'::jsonb,
    example     TEXT NOT NULL,
    solution    TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. New table: teacher_flows
CREATE TABLE IF NOT EXISTS teacher_flows (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    puzzle_id        UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    flow_index       INTEGER NOT NULL,
    steps            JSONB NOT NULL DEFAULT '[]'::jsonb,
    solution_reached TEXT NOT NULL DEFAULT '',
    created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_teacher_flows_puzzle_id ON teacher_flows(puzzle_id);

-- 3. Modify sessions: add puzzle_id, drop algorithm_title / algorithm_url
--    (Old session data is being dropped — clean pivot.)
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS puzzle_id UUID REFERENCES puzzles(id) ON DELETE SET NULL;

-- Drop old columns (safe: we are ignoring old data)
ALTER TABLE sessions
    DROP COLUMN IF EXISTS algorithm_title,
    DROP COLUMN IF EXISTS algorithm_url;

-- 4. Modify hints: add matched_flow_id
ALTER TABLE hints
    ADD COLUMN IF NOT EXISTS matched_flow_id UUID REFERENCES teacher_flows(id) ON DELETE SET NULL;

-- 5. Enable RLS on new tables (match existing pattern)
ALTER TABLE puzzles ENABLE ROW LEVEL SECURITY;
ALTER TABLE teacher_flows ENABLE ROW LEVEL SECURITY;

-- Allow the service role full access (backend uses service key)
CREATE POLICY "Service role full access on puzzles"
    ON puzzles FOR ALL
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Service role full access on teacher_flows"
    ON teacher_flows FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Done. After running this, restart the backend.
-- =============================================================================
