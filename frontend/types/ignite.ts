/** Ignite workspace types (DramaRama Supabase: ignite_* tables) */

export interface IgniteThoughtRow {
  id: string;
  ignite_problem_id: string;
  user_id: string;
  element: string | null;
  sub_element: string | null;
  content: string;
  pos_x: number | null;
  pos_y: number | null;
  is_terrain?: boolean;
  terrain_type?: string;
  is_fire_starter_node?: boolean;
  flow_order: number | null;
  created_at: string;
}

export interface IgniteConnectionRow {
  id: string;
  ignite_problem_id: string;
  from_thought_id: string;
  to_thought_id: string;
  created_at?: string;
}

export interface IgniteChatRow {
  id: string;
  ignite_problem_id: string;
  role: string;
  content: string;
  created_at?: string;
}
