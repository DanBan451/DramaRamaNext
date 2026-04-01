-- Run these migrations in your Supabase SQL Editor
-- Copy and paste this entire file into the SQL Editor and execute

-- Migration 005: Add unified understanding document to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS understanding_document TEXT;

-- Migration 006: Add cube image URL to sessions
ALTER TABLE sessions ADD COLUMN IF NOT EXISTS cube_image_url TEXT;

-- Migration 007: Add avatar image URL to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_image_url TEXT;
