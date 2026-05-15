-- Migration 017: Ignite mode (application workspace)

CREATE TABLE IF NOT EXISTS ignite_problems (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  course_id UUID NOT NULL REFERENCES courses(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  applied_fire_starter_id UUID REFERENCES fire_starters(id),
  matched_course_puzzle_id UUID REFERENCES course_puzzles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ignite_thoughts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ignite_problem_id UUID NOT NULL REFERENCES ignite_problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  element TEXT,
  sub_element TEXT,
  content TEXT NOT NULL,
  pos_x FLOAT,
  pos_y FLOAT,
  is_terrain BOOLEAN DEFAULT false,
  is_fire_starter_node BOOLEAN DEFAULT false,
  flow_order INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ignite_thought_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ignite_problem_id UUID NOT NULL REFERENCES ignite_problems(id) ON DELETE CASCADE,
  from_thought_id UUID NOT NULL REFERENCES ignite_thoughts(id) ON DELETE CASCADE,
  to_thought_id UUID NOT NULL REFERENCES ignite_thoughts(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS ignite_chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ignite_problem_id UUID NOT NULL REFERENCES ignite_problems(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ignite_problems_user ON ignite_problems(user_id);
CREATE INDEX IF NOT EXISTS idx_ignite_problems_course ON ignite_problems(course_id);
CREATE INDEX IF NOT EXISTS idx_ignite_thoughts_problem ON ignite_thoughts(ignite_problem_id);
CREATE INDEX IF NOT EXISTS idx_ignite_connections_problem ON ignite_thought_connections(ignite_problem_id);
CREATE INDEX IF NOT EXISTS idx_ignite_chat_problem ON ignite_chat_messages(ignite_problem_id);
