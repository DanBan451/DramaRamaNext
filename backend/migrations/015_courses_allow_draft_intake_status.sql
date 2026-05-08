-- Migration 015: allow 'draft' intake_status for courses
-- Backend creates courses as 'draft' so they don't show in list until engaged.

ALTER TABLE courses
    DROP CONSTRAINT IF EXISTS courses_intake_status_check;

ALTER TABLE courses
    ADD CONSTRAINT courses_intake_status_check
    CHECK (intake_status IN ('draft', 'in_progress', 'complete', 'abandoned'));

