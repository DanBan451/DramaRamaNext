-- Migration 008: Courses
-- Introduces the Course concept: a user's commitment to becoming more
-- effective at X. Each course owns an intake conversation (chatbot history)
-- plus the structured "crisp statement" extracted at the end of intake.
-- Phase 2 only. Does not migrate existing sessions.

CREATE TABLE IF NOT EXISTS courses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

    -- Intake state
    intake_status VARCHAR(20) NOT NULL DEFAULT 'in_progress'
        CHECK (intake_status IN ('in_progress', 'complete', 'abandoned')),
    intake_messages JSONB NOT NULL DEFAULT '[]',

    -- Crisp goal statement (set when intake completes)
    crisp_statement TEXT,
    domain VARCHAR(120),
    what TEXT,
    why TEXT,
    blocker TEXT,
    effective_looks_like TEXT,
    raw_quotes JSONB,

    -- Course lifecycle
    course_status VARCHAR(20) NOT NULL DEFAULT 'awaiting_puzzles'
        CHECK (course_status IN ('awaiting_puzzles', 'active', 'completed', 'abandoned')),

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_courses_user_id ON courses(user_id);
CREATE INDEX IF NOT EXISTS idx_courses_intake_status ON courses(intake_status);

-- Optional FK from sessions to courses (nullable for backwards compat).
-- Old sessions remain with course_id = NULL; we do not backfill.
ALTER TABLE sessions
    ADD COLUMN IF NOT EXISTS course_id UUID REFERENCES courses(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_sessions_course_id ON sessions(course_id);

-- RLS: enable + service role full access (matches the rest of the schema)
ALTER TABLE courses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to courses" ON courses;
CREATE POLICY "Service role has full access to courses"
ON courses FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
