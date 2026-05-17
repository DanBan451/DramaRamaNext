-- Migration 019: Fire Starter symbolic illustration (async image generation)

ALTER TABLE fire_starters
ADD COLUMN IF NOT EXISTS image_url TEXT,
ADD COLUMN IF NOT EXISTS image_generation_status TEXT DEFAULT 'pending',
ADD COLUMN IF NOT EXISTS image_generation_error TEXT,
ADD COLUMN IF NOT EXISTS image_generated_at TIMESTAMP WITH TIME ZONE;

COMMENT ON COLUMN fire_starters.image_url IS 'Public URL of the symbolic illustration generated for this Fire Starter';
COMMENT ON COLUMN fire_starters.image_generation_status IS 'pending, generating, completed, or failed';
