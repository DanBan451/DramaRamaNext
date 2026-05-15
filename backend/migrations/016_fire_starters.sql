-- Migration 016: Fire Starters (named insights earned in Forge)

CREATE TABLE IF NOT EXISTS fire_starters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  course_puzzle_id UUID NOT NULL REFERENCES course_puzzles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  element_combination JSONB NOT NULL,
  flow_of_ideas JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_fire_starters_user_id ON fire_starters(user_id);
CREATE INDEX IF NOT EXISTS idx_fire_starters_course_id ON fire_starters(course_id);
