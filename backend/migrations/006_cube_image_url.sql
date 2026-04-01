-- Migration: Add cube image URL to sessions
-- This stores the DALL-E generated image URL for the problem cube

ALTER TABLE sessions ADD COLUMN cube_image_url TEXT;
