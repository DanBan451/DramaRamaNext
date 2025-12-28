/**
 * DramaRama CRUD smoke test (run from frontend/)
 *
 * Usage:
 *   API_URL=http://127.0.0.1:8000 TEST_AUTH_TOKEN=dev npm run test:crud
 *
 * Notes:
 * - Requires backend running.
 * - Requires Supabase tables created (users/sessions/responses/hints).
 * - In ENVIRONMENT=development, backend will accept a dummy token if JWKS isn't fully configured.
 */

const API_URL = process.env.API_URL || "http://127.0.0.1:8000";
const TOKEN = process.env.TEST_AUTH_TOKEN || "dev";

function assert(cond, msg) {
  if (!cond) throw new Error(msg);
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonOrText(res) {
  const ct = res.headers.get("content-type") || "";
  if (ct.includes("application/json")) return res.json();
  return res.text();
}

async function fetchWithRetry(url, options, { retries = 6, baseDelayMs = 150 } = {}) {
  let lastErr;
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fetch(url, options);
    } catch (err) {
      lastErr = err;
      // Transient failures commonly occur during backend hot-reload.
      const delay = baseDelayMs * Math.pow(2, attempt);
      await sleep(delay);
    }
  }
  throw lastErr;
}

async function api(path, { method = "GET", body } = {}) {
  const res = await fetchWithRetry(`${API_URL}${path}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${TOKEN}`,
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const payload = await jsonOrText(res);
  if (!res.ok) {
    const detail =
      typeof payload === "object" && payload && "detail" in payload ? payload.detail : payload;
    throw new Error(`${method} ${path} failed (${res.status}): ${detail}`);
  }
  return payload;
}

async function main() {
  console.log(`API_URL=${API_URL}`);

  // Health
  const health = await fetchWithRetry(`${API_URL}/health`, {});
  assert(health.ok, "Backend /health failed");
  console.log("✅ health ok");

  // CREATE: start session
  const started = await api("/api/session/start", {
    method: "POST",
    body: {
      algorithm_title: `CRUD Smoke Test ${new Date().toISOString()}`,
      algorithm_url: "https://leetcode.com/problems/two-sum/",
    },
  });
  assert(started.session_id, "start_session: missing session_id");
  console.log("✅ create session:", started.session_id);

  const sessionId = started.session_id;

  // UPDATE: submit one response
  const respond = await api("/api/session/respond", {
    method: "POST",
    body: {
      session_id: sessionId,
      prompt_index: 0,
      response_text:
        "This is a CRUD smoke test response. I will ground the problem in a concrete example and constraints.",
      time_spent_seconds: 7,
    },
  });
  assert(respond.success === true, "respond: expected success=true");
  console.log("✅ update (respond) ok");

  // READ: list sessions
  const list = await api("/api/user/sessions?limit=10");
  assert(Array.isArray(list.sessions), "list sessions: expected sessions[]");
  console.log("✅ read (list) ok:", list.sessions.length, "sessions");

  // READ: session detail
  const detail = await api(`/api/user/sessions/${sessionId}`);
  assert(detail.session?.id === sessionId, "detail: expected session.id match");
  console.log("✅ read (detail) ok:", detail.responses?.length ?? 0, "responses");

  // UPDATE: complete session
  const completed = await api("/api/session/complete", {
    method: "POST",
    body: { session_id: sessionId, final_response: "Finishing CRUD smoke test." },
  });
  assert(completed.success === true, "complete: expected success=true");
  console.log("✅ update (complete) ok");

  // DELETE: delete session
  const del = await api(`/api/user/sessions/${sessionId}`, { method: "DELETE" });
  assert(del.success === true, "delete: expected success=true");
  console.log("✅ delete ok");

  console.log("\n🎉 CRUD smoke test passed.");
}

main().catch((err) => {
  console.error("\n❌ CRUD smoke test failed:");
  console.error(err?.stack || err?.message || err);
  process.exit(1);
});


