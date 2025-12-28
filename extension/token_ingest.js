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

function stripDramaRamaTokenFromFragment() {
  try {
    const url = new URL(window.location.href);
    const params = new URLSearchParams((url.hash || "").replace(/^#/, ""));
    if (!params.has("dramarama_token")) return;
    params.delete("dramarama_token");
    url.hash = params.toString();
    history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
}

async function ingest() {
  const token = readDramaRamaTokenFromFragment();
  if (!token) return;
  try {
    await chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token });
    stripDramaRamaTokenFromFragment();
  } catch {
    // ignore
  }
}

// Run ASAP and also after SPA navigations (hash can change)
ingest();
window.addEventListener("hashchange", ingest);


