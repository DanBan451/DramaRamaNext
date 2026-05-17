/**
 * Fire Starter list/create API helpers (goal workspace + Forge).
 */

/**
 * @typedef {Object} FireStarter
 * @property {string} id
 * @property {string} name
 * @property {string} description
 * @property {string[]} element_combination
 * @property {string} course_puzzle_id
 * @property {string|null} created_at
 * @property {string|null} [image_url]
 * @property {'pending'|'generating'|'completed'|'failed'|string} [image_generation_status]
 * @property {string|null} [image_generation_error]
 * @property {string|null} [image_generated_at]
 */

/**
 * @param {import('@/lib/canvas-api').TokenGetter} getToken
 * @param {string} courseId
 * @returns {Promise<FireStarter[]>}
 */
export async function fetchFireStartersForCourse(getToken, courseId) {
  const token = await getToken();
  const res = await fetch(
    `/api/backend-api/fire-starters?course_id=${encodeURIComponent(courseId)}`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!res.ok) throw new Error("fire starters");
  const data = await res.json();
  return Array.isArray(data) ? data : [];
}

/** @param {FireStarter[]} list */
export function fireStartersNeedImagePolling(list) {
  if (!Array.isArray(list) || !list.length) return false;
  return list.some((fs) => {
    const s = fs.image_generation_status || "pending";
    return s === "pending" || s === "generating";
  });
}
