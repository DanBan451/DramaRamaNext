-- =============================================================================
-- STOCKFISH Migration: Replace Teacher Agent with real-time nudging
-- Run this in the Supabase SQL Editor.
-- =============================================================================

-- 1. Drop matched_flow_id from hints (remove FK first)
ALTER TABLE hints
    DROP CONSTRAINT IF EXISTS hints_matched_flow_id_fkey;

ALTER TABLE hints
    DROP COLUMN IF EXISTS matched_flow_id;

-- 2. Drop teacher_flows table entirely
DROP TABLE IF EXISTS teacher_flows CASCADE;

-- 3. New table: components (session completion analysis)
CREATE TABLE IF NOT EXISTS components (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id        UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    puzzle_id         UUID NOT NULL REFERENCES puzzles(id) ON DELETE CASCADE,
    user_id           UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title             VARCHAR(255) NOT NULL,
    key_insight       TEXT NOT NULL,
    input_context     TEXT NOT NULL,
    output_capability TEXT NOT NULL,
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_components_session_id ON components(session_id);
CREATE INDEX IF NOT EXISTS idx_components_user_id ON components(user_id);

-- 4. Enable RLS on components
ALTER TABLE components ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role full access on components"
    ON components FOR ALL
    USING (true)
    WITH CHECK (true);

-- =============================================================================
-- Done. After running this, restart the backend.
-- =============================================================================
