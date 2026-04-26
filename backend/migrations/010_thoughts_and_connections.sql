-- Migration 010: Thoughts & Thought Connections (Phase 4b)
-- One canvas per (course_puzzle, user). These tables back the real-time
-- canvas persistence: every add/drag/connect/delete writes immediately.

CREATE TABLE IF NOT EXISTS thoughts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_puzzle_id UUID NOT NULL REFERENCES course_puzzles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    element VARCHAR(20),          -- nullable: untagged thoughts allowed
    sub_element VARCHAR(20),      -- nullable: e.g. "earth-1"
    content TEXT NOT NULL,

    flow_order INTEGER NOT NULL,  -- monotonic per course_puzzle; assigned server-side
    time_spent_seconds INTEGER,   -- from Timer while drafting

    pos_x DOUBLE PRECISION NOT NULL DEFAULT 0,
    pos_y DOUBLE PRECISION NOT NULL DEFAULT 0,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_thoughts_course_puzzle ON thoughts(course_puzzle_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_user ON thoughts(user_id);
CREATE INDEX IF NOT EXISTS idx_thoughts_flow ON thoughts(course_puzzle_id, flow_order);


CREATE TABLE IF NOT EXISTS thought_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_puzzle_id UUID NOT NULL REFERENCES course_puzzles(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    from_thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,
    to_thought_id UUID NOT NULL REFERENCES thoughts(id) ON DELETE CASCADE,

    created_at TIMESTAMPTZ DEFAULT NOW(),

    -- Idempotency: the same directed edge on the same canvas can exist only once.
    UNIQUE (course_puzzle_id, from_thought_id, to_thought_id),

    -- Self-loops make no sense; block at DB level.
    CHECK (from_thought_id <> to_thought_id)
);

CREATE INDEX IF NOT EXISTS idx_thought_connections_course_puzzle ON thought_connections(course_puzzle_id);
CREATE INDEX IF NOT EXISTS idx_thought_connections_from ON thought_connections(from_thought_id);
CREATE INDEX IF NOT EXISTS idx_thought_connections_to ON thought_connections(to_thought_id);

-- RLS (we only use service role from the backend, same as all other tables)
ALTER TABLE thoughts ENABLE ROW LEVEL SECURITY;
ALTER TABLE thought_connections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to thoughts" ON thoughts;
CREATE POLICY "Service role has full access to thoughts"
ON thoughts FOR ALL
TO service_role
USING (true)
WITH CHECK (true);

DROP POLICY IF EXISTS "Service role has full access to thought_connections" ON thought_connections;
CREATE POLICY "Service role has full access to thought_connections"
ON thought_connections FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
