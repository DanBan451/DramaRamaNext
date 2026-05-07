/**
 * Turn a failed fetch Response from `/api/backend-api/*` into a user-visible message.
 * The proxy returns JSON `{ detail, upstream? }` on connection failures (502).
 */
export async function readBackendErrorMessage(res, fallback) {
  const fallbackText =
    fallback ?? `Something went wrong (${res.status}). Try again in a moment.`;

  try {
    const ct = res.headers.get("content-type") || "";
    if (ct.includes("application/json")) {
      const body = await res.json();
      const detail = body?.detail;
      if (typeof detail === "string" && detail.trim()) {
        if (
          res.status === 502 &&
          (detail.includes("proxy could not reach") ||
            detail.includes("Backend connection failed"))
        ) {
          return `${detail} — For local dev, start the API from the backend folder: uvicorn app.main:app --reload --port 8000`;
        }
        return detail;
      }
    }
  } catch {
    /* ignore parse errors */
  }

  if (res.status === 502) {
    return "Cannot reach the DramaRama API (502). If you're developing locally, start the backend on port 8000: cd backend && uvicorn app.main:app --reload --port 8000";
  }

  return fallbackText;
}
