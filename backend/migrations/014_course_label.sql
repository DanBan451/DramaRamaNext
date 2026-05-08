-- Migration 014: courses.course_label
-- Short UI label that completes: "I want to think more effectively in ___"

ALTER TABLE courses
    ADD COLUMN IF NOT EXISTS course_label VARCHAR(255);

