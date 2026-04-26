-- Migration 009: Course Puzzles
-- Adds the AI-generated puzzle rows for a course, and extends courses
-- with generation lifecycle fields + status values.

CREATE TABLE IF NOT EXISTS course_puzzles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,

    -- Order within the course (1-indexed)
    position INTEGER NOT NULL,

    -- Generated puzzle content
    title VARCHAR(200) NOT NULL,
    puzzle_text TEXT NOT NULL,
    answer TEXT NOT NULL,                       -- internal only; never exposed via API
    primary_element VARCHAR(20) NOT NULL
        CHECK (primary_element IN ('earth', 'fire', 'air', 'water', 'synthesis')),
    why_this_trains_the_element TEXT NOT NULL,
    domain_connection TEXT NOT NULL,
    bridge_back TEXT NOT NULL,

    -- Lifecycle
    status VARCHAR(20) NOT NULL DEFAULT 'pending'
        CHECK (status IN ('pending', 'in_progress', 'completed', 'skipped')),
    completed_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),

    UNIQUE(course_id, position)
);

CREATE INDEX IF NOT EXISTS idx_course_puzzles_course_id ON course_puzzles(course_id);
CREATE INDEX IF NOT EXISTS idx_course_puzzles_status ON course_puzzles(status);

-- Extend courses.course_status values for the generation lifecycle
ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS courses_course_status_check;

ALTER TABLE courses
    ADD CONSTRAINT courses_course_status_check
    CHECK (course_status IN (
        'awaiting_puzzles',
        'generating',
        'generation_failed',
        'ready',
        'active',
        'completed',
        'abandoned'
    ));

-- Generation attempt metadata
ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS generation_error TEXT,
    ADD COLUMN IF NOT EXISTS generation_started_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS generation_completed_at TIMESTAMPTZ;

-- RLS: match the rest of the schema
ALTER TABLE course_puzzles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role has full access to course_puzzles" ON course_puzzles;
CREATE POLICY "Service role has full access to course_puzzles"
ON course_puzzles FOR ALL
TO service_role
USING (true)
WITH CHECK (true);
