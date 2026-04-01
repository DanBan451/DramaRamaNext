-- Migration: Add unified understanding document to sessions
-- This replaces the separate deep_understanding entries with a single evolving document

ALTER TABLE sessions ADD COLUMN understanding_document TEXT;
