-- Stage 3: Reflection + Bridge + Synthesis
-- Adds kind column to thoughts, synthesis fields to course_puzzles,
-- and stage3_phase tracking.

-- Add a 'kind' column to thoughts to distinguish:
--   'thought'     = user thoughts from Stage 1 (the existing default)
--   'nudge'       = AI-generated nudges from Stage 2 (currently tracked via is_nudge bool)
--   'reflection'  = user thoughts from Stage 3 (new)

ALTER TABLE thoughts
ADD COLUMN IF NOT EXISTS kind VARCHAR(20) NOT NULL DEFAULT 'thought'
CHECK (kind IN ('thought', 'nudge', 'reflection'));

-- Backfill existing rows based on is_nudge
UPDATE thoughts
SET kind = CASE
    WHEN is_nudge = TRUE THEN 'nudge'
    ELSE 'thought'
END
WHERE kind = 'thought';

-- We keep is_nudge for backwards compat with existing code paths but new code reads `kind`.

CREATE INDEX IF NOT EXISTS idx_thoughts_kind ON thoughts(course_puzzle_id, kind);

-- Synthesis storage on course_puzzles
ALTER TABLE course_puzzles
ADD COLUMN IF NOT EXISTS synthesis TEXT,
ADD COLUMN IF NOT EXISTS synthesis_generated_at TIMESTAMPTZ;

-- Stage 3 sub-phase tracking (optional but useful for UI state on reload)
ALTER TABLE course_puzzles
ADD COLUMN IF NOT EXISTS stage3_phase VARCHAR(20)
CHECK (stage3_phase IN ('reflect', 'bridge') OR stage3_phase IS NULL);
