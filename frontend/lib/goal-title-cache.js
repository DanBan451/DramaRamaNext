const PREFIX = "dramarama-goal-title-";

export function readCachedGoalTitle(courseId) {
  if (!courseId || typeof window === "undefined") return "";
  try {
    return sessionStorage.getItem(`${PREFIX}${courseId}`) || "";
  } catch {
    return "";
  }
}

export function writeCachedGoalTitle(courseId, title) {
  const t = (title || "").trim();
  if (!courseId || !t || typeof window === "undefined") return;
  try {
    sessionStorage.setItem(`${PREFIX}${courseId}`, t);
  } catch {
    /* ignore quota / private mode */
  }
}
