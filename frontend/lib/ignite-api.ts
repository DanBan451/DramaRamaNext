import type { Thought, Connection } from "@/types/canvas";

const BASE = "/api/backend-api";

type TokenGetter = () => Promise<string | null>;

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

export function mapIgniteThoughtToCanvas(
  row: Record<string, unknown>,
  problemId: string,
): Thought {
  return {
    id: String(row.id),
    course_puzzle_id: problemId,
    element: (row.element as string) ?? null,
    sub_element: (row.sub_element as string) ?? null,
    content: String(row.content ?? ""),
    flow_order: Number(row.flow_order ?? 0),
    time_spent_seconds: null,
    pos_x: Number(row.pos_x ?? 0),
    pos_y: Number(row.pos_y ?? 0),
    is_nudge: false,
    kind: "thought",
    is_terrain: !!row.is_terrain,
    is_fire_starter_node: !!row.is_fire_starter_node,
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export function mapIgniteConnectionToCanvas(
  row: Record<string, unknown>,
  problemId: string,
): Connection {
  return {
    id: String(row.id),
    course_puzzle_id: problemId,
    from_thought_id: String(row.from_thought_id),
    to_thought_id: String(row.to_thought_id),
    created_at: String(row.created_at ?? new Date().toISOString()),
  };
}

export async function createIgniteProblem(
  body: { title: string; description: string; course_id: string },
  getToken: TokenGetter,
): Promise<{ ignite_problem_id: string }> {
  const res = await authedFetch("/ignite", { method: "POST", body: JSON.stringify(body) }, getToken);
  if (!res.ok) throw new Error(`createIgnite: ${res.status}`);
  return res.json();
}

export async function getIgniteState(id: string, getToken: TokenGetter) {
  const res = await authedFetch(`/ignite/${id}`, { method: "GET" }, getToken);
  if (!res.ok) throw new Error(`getIgnite: ${res.status}`);
  return res.json() as Promise<{
    problem: Record<string, unknown>;
    thoughts: Record<string, unknown>[];
    connections: Record<string, unknown>[];
    messages: Record<string, unknown>[];
  }>;
}

export async function igniteCreateThought(
  problemId: string,
  body: {
    content: string;
    element: string | null;
    sub_element: string | null;
    pos_x: number;
    pos_y: number;
  },
  getToken: TokenGetter,
) {
  const res = await authedFetch(
    `/ignite/${problemId}/thoughts`,
    { method: "POST", body: JSON.stringify(body) },
    getToken,
  );
  if (!res.ok) throw new Error(`ignite thought: ${res.status}`);
  return res.json();
}

export async function igniteUpdatePosition(
  thoughtId: string,
  pos_x: number,
  pos_y: number,
  getToken: TokenGetter,
) {
  const res = await authedFetch(
    `/ignite/thoughts/${thoughtId}/position`,
    { method: "PATCH", body: JSON.stringify({ pos_x, pos_y }) },
    getToken,
  );
  if (!res.ok) throw new Error(`ignite pos: ${res.status}`);
  return res.json();
}

export async function igniteDeleteThought(thoughtId: string, getToken: TokenGetter) {
  const res = await authedFetch(`/ignite/thoughts/${thoughtId}`, { method: "DELETE" }, getToken);
  if (!res.ok) throw new Error(`ignite del thought: ${res.status}`);
}

export async function igniteCreateConnection(
  problemId: string,
  from: string,
  to: string,
  getToken: TokenGetter,
) {
  const res = await authedFetch(
    `/ignite/${problemId}/connections`,
    { method: "POST", body: JSON.stringify({ from_thought_id: from, to_thought_id: to }) },
    getToken,
  );
  if (!res.ok) throw new Error(`ignite conn: ${res.status}`);
  return res.json();
}

export async function igniteDeleteConnection(connectionId: string, getToken: TokenGetter) {
  const res = await authedFetch(`/ignite/connections/${connectionId}`, { method: "DELETE" }, getToken);
  if (!res.ok && res.status !== 204) throw new Error(`ignite del conn: ${res.status}`);
}
