-- Run these migrations in your Supabase SQL Editor
-- Copy and paste this entire file into the SQL Editor and execute

-- Migration 005: Add unified understanding document to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS understanding_document TEXT;

-- Migration 006: Add cube image URL to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cube_image_url TEXT;

-- Migration 007: Add avatar image URL to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image_url TEXT;

-- Migration 014: courses.course_label
ALTER TABLE courses ADD COLUMN IF NOT EXISTS course_label VARCHAR(255);

-- Migration 015: allow draft intake rows (required for /course/intake/start)
ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS courses_intake_status_check;

ALTER TABLE courses
    ADD CONSTRAINT courses_intake_status_check
    CHECK (intake_status IN ('draft', 'in_progress', 'complete', 'abandoned'));
