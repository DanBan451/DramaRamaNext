-- Migration: Add avatar image URL to users
-- This stores the DALL-E generated avatar image based on element strengths

ALTER TABLE users ADD COLUMN avatar_image_url TEXT;
