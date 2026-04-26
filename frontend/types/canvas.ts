// Phase 4b: renamed puzzle_id -> course_puzzle_id to match the backend schema
// (thoughts and thought_connections tables reference course_puzzles.id).
// `insight` was a phase-4a-only leftover and is dropped — the backend does
// not store an insight on the Thought row; that will come back in phase 4c.

export interface Thought {
  id: string;
  course_puzzle_id: string;
  element: string | null;
  sub_element: string | null;
  content: string;
  flow_order: number;
  time_spent_seconds: number | null;
  pos_x: number;
  pos_y: number;
  created_at: string;
  updated_at?: string;
}

export interface Connection {
  id: string;
  course_puzzle_id: string;
  from_thought_id: string;
  to_thought_id: string;
  created_at: string;
}
