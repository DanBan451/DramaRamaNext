// Canvas API client (Phase 4b).
// Thin wrapper around /api/backend-api/canvas/* — one function per endpoint,
// all Clerk-authenticated. No retry, no caching, no optimistic state;
// the caller (canvas page) owns all UI state and rollback logic.

import type { Thought, Connection } from "@/types/canvas";

const BASE = "/api/backend-api";

type TokenGetter = () => Promise<string | null>;

export interface CoursePuzzleSummary {
  id: string;
  position: number;
  title: string;
  puzzle_text: string;
  primary_element: string;
  why_this_trains_the_element: string;
  domain_connection: string;
  bridge_back: string;
  status: string;
  completed_at: string | null;
  current_stage?: number;
  course_id?: string;
  stage3_phase?: "reflect" | "bridge" | null;
  synthesis?: string | null;
  reflection_answers?: Record<string, string> | null;
}

export interface CanvasState {
  course_puzzle: CoursePuzzleSummary;
  thoughts: Thought[];
  connections: Connection[];
}

async function authedFetch(
  path: string,
  init: RequestInit,
  getToken: TokenGetter,
): Promise<Response> {
  const token = await getToken();
  const headers = new Headers(init.headers);
  if (token) headers.set("Authorization", `Bearer ${token}`);
  if (init.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }
  return fetch(`${BASE}${path}`, { ...init, headers });
}

async function asJson<T>(res: Response, label: string): Promise<T> {
  if (!res.ok) {
    let detail = "";
    try {
      const body = await res.json();
      detail = body?.detail || body?.error || "";
    } catch {
      /* ignore */
    }
    throw new Error(`${label}: ${res.status}${detail ? ` — ${detail}` : ""}`);
  }
  return res.json();
}

export async function getCanvasState(
  coursePuzzleId: string,
  getToken: TokenGetter,
): Promise<CanvasState> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}`,
    { method: "GET" },
    getToken,
  );
  return asJson<CanvasState>(res, "getCanvasState");
}

export async function createThought(
  coursePuzzleId: string,
  body: {
    content: string;
    element: string | null;
    sub_element: string | null;
    pos_x: number;
    pos_y: number;
    time_spent_seconds: number | null;
  },
  getToken: TokenGetter,
): Promise<Thought> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/thoughts`,
    { method: "POST", body: JSON.stringify(body) },
    getToken,
  );
  return asJson<Thought>(res, "createThought");
}

export async function updateThoughtPosition(
  thoughtId: string,
  pos_x: number,
  pos_y: number,
  getToken: TokenGetter,
): Promise<Thought> {
  const res = await authedFetch(
    `/canvas/thoughts/${thoughtId}/position`,
    { method: "PATCH", body: JSON.stringify({ pos_x, pos_y }) },
    getToken,
  );
  return asJson<Thought>(res, "updateThoughtPosition");
}

export async function updateThoughtContent(
  thoughtId: string,
  content: string,
  getToken: TokenGetter,
): Promise<Thought> {
  const res = await authedFetch(
    `/canvas/thoughts/${thoughtId}/content`,
    { method: "PATCH", body: JSON.stringify({ content }) },
    getToken,
  );
  return asJson<Thought>(res, "updateThoughtContent");
}

export async function updateThoughtTagging(
  thoughtId: string,
  element: string | null,
  sub_element: string | null,
  getToken: TokenGetter,
): Promise<Thought> {
  const res = await authedFetch(
    `/canvas/thoughts/${thoughtId}/tagging`,
    { method: "PATCH", body: JSON.stringify({ element, sub_element }) },
    getToken,
  );
  return asJson<Thought>(res, "updateThoughtTagging");
}

export async function deleteThought(
  thoughtId: string,
  getToken: TokenGetter,
): Promise<void> {
  const res = await authedFetch(
    `/canvas/thoughts/${thoughtId}`,
    { method: "DELETE" },
    getToken,
  );
  if (!res.ok) throw new Error(`deleteThought: ${res.status}`);
}

export async function createConnection(
  coursePuzzleId: string,
  from_thought_id: string,
  to_thought_id: string,
  getToken: TokenGetter,
): Promise<Connection> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/connections`,
    {
      method: "POST",
      body: JSON.stringify({ from_thought_id, to_thought_id }),
    },
    getToken,
  );
  return asJson<Connection>(res, "createConnection");
}

export async function deleteConnection(
  connectionId: string,
  getToken: TokenGetter,
): Promise<void> {
  const res = await authedFetch(
    `/canvas/connections/${connectionId}`,
    { method: "DELETE" },
    getToken,
  );
  if (!res.ok) throw new Error(`deleteConnection: ${res.status}`);
}

export type NudgeMove =
  | "simplify"
  | "push_extreme"
  | "enumerate_cases"
  | "ground_in_specifics"
  | "find_negative_space"
  | "name_the_frame"
  | "socrates"
  | "extend_thread";

export interface Stage2NudgesResponse {
  /** Newly-created nudge thoughts in canvas order (anchor first for fans). */
  nudges: Thought[];
  /** New edges: source->anchor and anchor->child (fan), or source->single. */
  connections: Connection[];
  /** Opening assistant message for Stage 2 chat (null on idempotent reseed). */
  chat_message: string | null;
  move: NudgeMove | null;
  shape: "fan" | "single" | null;
  branch_source_thought_id: string | null;
  /** True when nudges already existed and were returned without LLM call. */
  already_seeded: boolean;
}

/**
 * Generate the Stage 2 fan-shape (or single-node) intervention.
 * The server is the source of truth for both the move selection and the
 * positioning, so the client no longer passes positions or thought snapshots.
 */
export async function generateStage2Nudges(
  coursePuzzleId: string,
  getToken: TokenGetter,
): Promise<Stage2NudgesResponse> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/stage2/nudges`,
    {
      method: "POST",
      body: JSON.stringify({}),
    },
    getToken,
  );
  return asJson<Stage2NudgesResponse>(res, "generateStage2Nudges");
}

export async function updateCurrentStage(
  coursePuzzleId: string,
  currentStage: number,
  getToken: TokenGetter,
): Promise<CoursePuzzleSummary> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/stage`,
    {
      method: "PATCH",
      body: JSON.stringify({ current_stage: currentStage }),
    },
    getToken,
  );
  return asJson<CoursePuzzleSummary>(res, "updateCurrentStage");
}

// ============ Stage 3: Reflection + Bridge + Synthesis ============

export async function createReflection(
  coursePuzzleId: string,
  body: {
    content: string;
    element: string | null;
    sub_element: string | null;
    pos_x: number;
    pos_y: number;
  },
  getToken: TokenGetter,
): Promise<Thought> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/reflections`,
    { method: "POST", body: JSON.stringify(body) },
    getToken,
  );
  return asJson<Thought>(res, "createReflection");
}

export async function advanceToBridge(
  coursePuzzleId: string,
  getToken: TokenGetter,
): Promise<CoursePuzzleSummary> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/stage3/advance-to-bridge`,
    { method: "POST" },
    getToken,
  );
  return asJson<CoursePuzzleSummary>(res, "advanceToBridge");
}

export async function completePuzzle(
  coursePuzzleId: string,
  getToken: TokenGetter,
): Promise<{
  status: string;
  completed_at: string | null;
  synthesis?: string | null;
}> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/stage3/complete`,
    { method: "POST" },
    getToken,
  );
  return asJson<{
    status: string;
    completed_at: string | null;
    synthesis?: string | null;
  }>(res, "completePuzzle");
}

export async function saveReflectionAnswers(
  coursePuzzleId: string,
  body: {
    elements_applied: string;
    most_insightful_element: string;
    question_at_start: string;
  },
  getToken: TokenGetter,
): Promise<CoursePuzzleSummary> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/reflection-answers`,
    { method: "POST", body: JSON.stringify(body) },
    getToken,
  );
  return asJson<CoursePuzzleSummary>(res, "saveReflectionAnswers");
}

export interface ForgeFireStarterDraft {
  element_combination: string[];
  flow_of_ideas: Record<string, unknown>[];
  description: string;
  proposed_names: string[];
}

export async function forgeFireStarterDraft(
  coursePuzzleId: string,
  getToken: TokenGetter,
): Promise<ForgeFireStarterDraft> {
  const res = await authedFetch(
    `/canvas/${coursePuzzleId}/forge-fire-starter`,
    { method: "POST", body: JSON.stringify({}) },
    getToken,
  );
  return asJson<ForgeFireStarterDraft>(res, "forgeFireStarterDraft");
}

export async function createFireStarter(
  body: {
    course_puzzle_id: string;
    name: string;
    description: string;
    element_combination: string[];
    flow_of_ideas: Record<string, unknown>[];
  },
  getToken: TokenGetter,
): Promise<{ id: string; name: string }> {
  const res = await authedFetch(
    `/fire-starters`,
    { method: "POST", body: JSON.stringify(body) },
    getToken,
  );
  return asJson<{ id: string; name: string }>(res, "createFireStarter");
}

export async function listFireStartersForCourse(
  courseId: string,
  getToken: TokenGetter,
): Promise<
  Array<{
    id: string;
    name: string;
    description: string;
    element_combination: string[];
    course_puzzle_id: string;
    created_at: string | null;
    image_url?: string | null;
    image_generation_status?: string | null;
    image_generation_error?: string | null;
    image_generated_at?: string | null;
  }>
> {
  const res = await authedFetch(
    `/fire-starters?course_id=${encodeURIComponent(courseId)}`,
    { method: "GET" },
    getToken,
  );
  return asJson<
    Array<{
      id: string;
      name: string;
      description: string;
      element_combination: string[];
      course_puzzle_id: string;
      created_at: string | null;
      image_url?: string | null;
      image_generation_status?: string | null;
      image_generation_error?: string | null;
      image_generated_at?: string | null;
    }>
  >(res, "listFireStartersForCourse");
}

export async function getDevRedirectTarget(
  getToken: TokenGetter,
): Promise<{ course_puzzle_id: string } | null> {
  const res = await authedFetch(
    `/canvas-test/dev-redirect`,
    { method: "GET" },
    getToken,
  );
  if (res.status === 404) return null;
  return asJson<{ course_puzzle_id: string }>(res, "getDevRedirectTarget");
}
