-- Migration: Add cube visual properties to sessions
-- Each problem gets a unique visual cube based on LLM analysis of the problem description

ALTER TABLE sessions ADD COLUMN cube_primary_color VARCHAR(7);
ALTER TABLE sessions ADD COLUMN cube_secondary_color VARCHAR(7);
ALTER TABLE sessions ADD COLUMN cube_complexity INTEGER;
ALTER TABLE sessions ADD COLUMN cube_label VARCHAR(50);
