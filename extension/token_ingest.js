/**
 * Token ingest content script
 *
 * Runs on all LeetCode/HackerRank pages to capture `#dramarama_token=...`
 * from the URL fragment, store it in the extension, then clean the URL.
 *
 * This fixes the issue where the user lands on https://leetcode.com/ first
 * (not /problems/*), so the main UI content script wouldn't run and the token
 * would never be saved.
 */

function readDramaRamaTokenFromFragment() {
  try {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return null;
    const params = new URLSearchParams(hash.slice(1));
    return params.get("dramarama_token");
  } catch {
    return null;
  }
}

function readDramaRamaHqFromFragment() {
  try {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return null;
    const params = new URLSearchParams(hash.slice(1));
    return params.get("dramarama_hq");
  } catch {
    return null;
  }
}

function stripDramaRamaTokenFromFragment() {
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    const hadToken = params.has("dramarama_token");
    const hadHq = params.has("dramarama_hq");
    if (!hadToken && !hadHq) return;
    params.delete("dramarama_token");
    params.delete("dramarama_hq");
    url.hash = params.toString();
    history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
}

async function ingest() {
  const token = readDramaRamaTokenFromFragment();
  const hq = readDramaRamaHqFromFragment();
  if (!token && !hq) return;
  try {
    if (token) {
      await chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token });
    }
    // If HQ origin is provided, auto-configure extension endpoints:
    // - API: use the HQ proxy route so the extension doesn't need direct access to EC2
    // - Frontend: use HQ for login/dashboard
    if (hq) {
      const trimmed = String(hq).replace(/\/+$/, "");
      await chrome.runtime.sendMessage({
        type: "SET_CONFIG",
        apiBaseUrl: `${trimmed}/api/backend-api`,
        frontendBaseUrl: trimmed,
      });
    }
    stripDramaRamaTokenFromFragment();
  } catch {
    // ignore
  }
}

// Run ASAP and also after SPA navigations (hash can change)
ingest();
window.addEventListener("hashchange", ingest);


