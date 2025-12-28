/**
 * DramaRama Extension - Content Script
 * Injected into LeetCode/HackerRank pages
 */

// State
let isOpen = false;
let currentSession = null;
let currentPromptIndex = 0;
let promptStartTime = null;
let chatContainer = null;
let authTokenCached = null;

function setAuthStatus(message) {
  const el = document.getElementById("dramarama-auth-status");
  if (!el) return;
  el.textContent = message || "";
  el.classList.toggle("hidden", !message);
}

function triggerConfetti() {
  // Lightweight confetti burst (DOM-based, no external deps).
  try {
    const existing = document.getElementById("dramarama-confetti");
    if (existing) existing.remove();
    const root = document.getElementById("dramarama-panel") || document.body;
    const container = document.createElement("div");
    container.id = "dramarama-confetti";
    container.className = "dramarama-confetti";
    const colors = ["#dc2626", "#111111", "#0ea5e9", "#16a34a", "#f59e0b"];
    for (let i = 0; i < 28; i++) {
      const piece = document.createElement("div");
      piece.className = "dramarama-confetti-piece";
      piece.style.left = `${Math.random() * 100}%`;
      piece.style.background = colors[i % colors.length];
      piece.style.animationDelay = `${Math.random() * 0.2}s`;
      piece.style.transform = `rotate(${Math.random() * 360}deg)`;
      container.appendChild(piece);
    }
    root.appendChild(container);
    setTimeout(() => container.remove(), 2200);
  } catch {
    // ignore
  }
}

function readDramaRamaTokenFromFragment() {
  try {
    const hash = window.location.hash || "";
    if (!hash.startsWith("#")) return null;
    const params = new URLSearchParams(hash.slice(1));
    const token = params.get("dramarama_token");
    return token || null;
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
    // Clean URL without causing navigation/reload
    history.replaceState(null, "", url.toString());
  } catch {
    // ignore
  }
}

async function ingestTokenHandoffIfPresent() {
  const token = readDramaRamaTokenFromFragment();
  if (!token) return;
  try {
    await chrome.runtime.sendMessage({ type: "SET_AUTH_TOKEN", token });
    stripDramaRamaTokenFromFragment();
  } catch {
    // ignore; user can still connect via popup
  }
}

// Create and inject the DramaRama chatbot UI
function createChatUI() {
  // Check if already exists
  if (document.getElementById('dramarama-container')) {
    return;
  }

  // Create container
  chatContainer = document.createElement('div');
  chatContainer.id = 'dramarama-container';
  chatContainer.innerHTML = `
    <div id="dramarama-toggle" class="dramarama-toggle">
      <span class="dramarama-icon">🎭</span>
    </div>
    <div id="dramarama-panel" class="dramarama-panel hidden">
      <div class="dramarama-header">
        <div class="dramarama-header-left">
          <span class="dramarama-logo">🎭</span>
          <span class="dramarama-title">DramaRama</span>
        </div>
        <button id="dramarama-close" class="dramarama-close">×</button>
      </div>
      <div id="dramarama-content" class="dramarama-content">
        <div id="dramarama-auth-view" class="dramarama-view">
          <div class="dramarama-auth-message">
            <p>To start, connect your account to the extension.</p>
            <a href="http://localhost:3000/go/leetcode?url=https%3A%2F%2Fleetcode.com%2F" target="_blank" class="dramarama-btn dramarama-btn-primary">
              Open LeetCode via DramaRama (auto-auth)
            </a>
            <button id="dramarama-refresh-auth" class="dramarama-btn dramarama-btn-secondary">
              I already connected — Refresh
            </button>
            <div id="dramarama-auth-status" class="dramarama-auth-status hidden"></div>
          </div>
        </div>
        <div id="dramarama-start-view" class="dramarama-view hidden">
          <h3>Ready to think through this problem?</h3>
          <p class="dramarama-algorithm-title" id="dramarama-algo-title"></p>
          <button id="dramarama-start-btn" class="dramarama-btn dramarama-btn-primary">
            Start Session
          </button>
        </div>
        <div id="dramarama-session-view" class="dramarama-view hidden">
          <div class="dramarama-progress">
            <div class="dramarama-progress-bar">
              <div id="dramarama-progress-fill" class="dramarama-progress-fill"></div>
            </div>
            <span id="dramarama-progress-text" class="dramarama-progress-text">0/12</span>
          </div>
          <div id="dramarama-prompt-section" class="dramarama-prompt-section">
            <div class="dramarama-element-badge" id="dramarama-element-badge">
              <span id="dramarama-element-emoji">🌳</span>
              <span id="dramarama-element-name">EARTH 1.0</span>
            </div>
            <p id="dramarama-prompt-text" class="dramarama-prompt-text"></p>
          </div>
          <textarea 
            id="dramarama-response" 
            class="dramarama-textarea" 
            placeholder="Think through this prompt... (minimum 20 words)"
            rows="4"
          ></textarea>
          <div class="dramarama-actions">
            <span id="dramarama-word-count" class="dramarama-word-count">0 words</span>
            <button id="dramarama-submit-btn" class="dramarama-btn dramarama-btn-primary" disabled>
              Submit Response
            </button>
          </div>
          <button id="dramarama-cancel-btn" class="dramarama-btn dramarama-btn-danger">
            Cancel Session
          </button>
        </div>
        <div id="dramarama-hint-view" class="dramarama-view hidden">
          <h3>🎯 Your Personalized Nudge</h3>
          <div id="dramarama-hint-text" class="dramarama-hint-text"></div>
          <button id="dramarama-complete-btn" class="dramarama-btn dramarama-btn-primary">
            Complete Session
          </button>
        </div>
        <div id="dramarama-complete-view" class="dramarama-view hidden">
          <div class="dramarama-complete-message">
            <span class="dramarama-complete-emoji">🎉</span>
            <h3>Session Complete!</h3>
            <p>Great job thinking through this problem.</p>
            <a href="http://localhost:3000/dashboard" target="_blank" class="dramarama-btn dramarama-btn-secondary">
              View in Dashboard
            </a>
            <button id="dramarama-new-session-btn" class="dramarama-btn dramarama-btn-primary">
              New Session
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.appendChild(chatContainer);

  // Add event listeners
  document.getElementById('dramarama-toggle').addEventListener('click', togglePanel);
  document.getElementById('dramarama-close').addEventListener('click', togglePanel);
  document.getElementById('dramarama-refresh-auth')?.addEventListener('click', checkAuthAndSession);
  document.getElementById('dramarama-start-btn')?.addEventListener('click', startSession);
  document.getElementById('dramarama-submit-btn')?.addEventListener('click', submitResponse);
  document.getElementById('dramarama-cancel-btn')?.addEventListener('click', cancelSession);
  document.getElementById('dramarama-complete-btn')?.addEventListener('click', completeSession);
  document.getElementById('dramarama-new-session-btn')?.addEventListener('click', resetSession);

  // Word count tracking
  document.getElementById('dramarama-response')?.addEventListener('input', updateWordCount);

  // Initialize
  ingestTokenHandoffIfPresent().finally(() => {
    checkAuthAndSession();
  });

  // React to token/session changes (e.g. user connects JWT via popup without reloading page)
  if (chrome?.storage?.onChanged) {
    chrome.storage.onChanged.addListener((changes, areaName) => {
      if (areaName !== 'local') return;
      if (changes.authToken || changes.currentSession) {
        checkAuthAndSession();
      }
    });
  }
}

function togglePanel() {
  const panel = document.getElementById('dramarama-panel');
  const toggle = document.getElementById('dramarama-toggle');
  
  isOpen = !isOpen;
  
  if (isOpen) {
    panel.classList.remove('hidden');
    toggle.classList.add('active');
    // Re-check auth every time panel opens (so "connect token" works without page refresh)
    checkAuthAndSession();
  } else {
    panel.classList.add('hidden');
    toggle.classList.remove('active');
  }
}

async function checkAuthAndSession() {
  setAuthStatus("Checking connection…");
  // If we already have a token cached, still validate session state (fast path)
  // Check for auth token
  let response;
  try {
    response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  } catch (e) {
    // If the background service worker is asleep, this can temporarily fail.
    // Show auth view and let user refresh.
    showView('auth');
    setAuthStatus("Waking extension… click Refresh again in a moment.");
    return;
  }
  
  authTokenCached = response?.token || null;
  if (!authTokenCached) {
    showView('auth');
    setAuthStatus("Not connected yet.");
    return;
  }

  // Check for existing session
  const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_SESSION' });
  
  if (sessionResponse.session) {
    currentSession = sessionResponse.session;
    
    if (currentSession.sessionComplete) {
      showView('hint');
      setAuthStatus("");
    } else {
      currentPromptIndex = currentSession.currentPromptIndex;
      showView('session');
      updatePromptDisplay();
      setAuthStatus("");
    }
  } else {
    // Show start view with algorithm title
    const algorithmTitle = getAlgorithmTitle();
    document.getElementById('dramarama-algo-title').textContent = algorithmTitle;
    showView('start');
    setAuthStatus("");
  }
}

function getAlgorithmTitle() {
  // Try to get from LeetCode
  const leetcodeTitle = document.querySelector('[data-cy="question-title"]');
  if (leetcodeTitle) return leetcodeTitle.textContent;

  // Try HackerRank
  const hackerrankTitle = document.querySelector('.challenge-name');
  if (hackerrankTitle) return hackerrankTitle.textContent;

  // Fallback to page title
  const pageTitle = document.title.split('-')[0].trim();
  return pageTitle || 'Algorithm Problem';
}

async function startSession() {
  const algorithmTitle = getAlgorithmTitle();
  const algorithmUrl = window.location.href;

  const response = await chrome.runtime.sendMessage({
    type: 'START_SESSION',
    algorithmTitle,
    algorithmUrl,
  });

  if (response.error) {
    alert('Error starting session: ' + response.error);
    return;
  }

  currentSession = response.session;
  currentPromptIndex = 0;
  promptStartTime = Date.now();
  
  showView('session');
  updatePromptDisplay();
}

function updatePromptDisplay() {
  if (!currentSession || !currentSession.currentPrompt) return;

  const prompt = currentSession.currentPrompt;
  
  // Update progress
  document.getElementById('dramarama-progress-fill').style.width = 
    `${(currentPromptIndex / 12) * 100}%`;
  document.getElementById('dramarama-progress-text').textContent = 
    `${currentPromptIndex}/12`;

  // Update element badge
  const elementEmojis = {
    earth: '🌳',
    fire: '🔥',
    air: '💨',
    water: '🌊',
  };
  
  document.getElementById('dramarama-element-emoji').textContent = 
    elementEmojis[prompt.element] || '🌳';
  document.getElementById('dramarama-element-name').textContent = 
    `${prompt.element.toUpperCase()} ${prompt.sub_element}`;

  // Update prompt text
  document.getElementById('dramarama-prompt-text').textContent = prompt.prompt;

  // Clear response textarea
  document.getElementById('dramarama-response').value = '';
  updateWordCount();

  // Reset timer
  promptStartTime = Date.now();
}

function updateWordCount() {
  const textarea = document.getElementById('dramarama-response');
  const wordCount = textarea.value.trim().split(/\s+/).filter(w => w).length;
  
  document.getElementById('dramarama-word-count').textContent = `${wordCount} words`;
  
  // Enable submit if at least 20 words
  const submitBtn = document.getElementById('dramarama-submit-btn');
  submitBtn.disabled = wordCount < 20;
}

async function submitResponse() {
  const responseText = document.getElementById('dramarama-response').value.trim();
  const timeSpentSeconds = Math.round((Date.now() - promptStartTime) / 1000);

  const submitBtn = document.getElementById('dramarama-submit-btn');
  const prevBtnText = submitBtn?.textContent;
  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting…';
  }

  const response = await chrome.runtime.sendMessage({
    type: 'SUBMIT_RESPONSE',
    sessionId: currentSession.id,
    promptIndex: currentPromptIndex,
    responseText,
    timeSpentSeconds,
  });

  if (response.error) {
    // If the token expired mid-session, mint a fresh one in a background tab.
    if (String(response.error).toLowerCase().includes('token expired')) {
      try {
        await chrome.runtime.sendMessage({
          type: 'OPEN_REAUTH',
          returnUrl: window.location.href,
        });
        alert(
          'Your DramaRama login token expired. Re-auth is running in the background.\n\n' +
            'Wait a second, then click “Submit Response” again.'
        );
      } catch {
        alert(
          'Your DramaRama login token expired. Please go to DramaRama HQ and click “Start New Session” to refresh.'
        );
      }
      return;
    }
    alert('Error submitting response: ' + response.error);
    if (submitBtn) {
      submitBtn.textContent = prevBtnText || 'Submit Response';
      updateWordCount();
    }
    return;
  }

  if (response.sessionComplete) {
    // Get hint
    await getHint();
  } else {
    currentPromptIndex = response.promptsCompleted;
    currentSession.currentPrompt = response.nextPrompt;
    updatePromptDisplay();
  }

  if (submitBtn) {
    submitBtn.textContent = prevBtnText || 'Submit Response';
    updateWordCount();
  }
}

async function getHint() {
  const response = await chrome.runtime.sendMessage({
    type: 'GET_HINT',
    sessionId: currentSession.id,
  });

  if (response.error) {
    alert('Error getting hint: ' + response.error);
    return;
  }

  showView('hint');
  
  // Stream hint using SSE
  const hintText = document.getElementById('dramarama-hint-text');
  hintText.textContent = 'Processing your nudge…';
  const completeBtn = document.getElementById('dramarama-complete-btn');
  if (completeBtn) {
    completeBtn.disabled = true;
    completeBtn.textContent = 'Generating…';
  }

  try {
    const eventSource = new EventSource(
      `${response.sseUrl}?token=${encodeURIComponent(response.token)}`
    );

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        if (completeBtn) {
          completeBtn.disabled = false;
          completeBtn.textContent = 'Complete Session';
        }
        return;
      }
      if (hintText.textContent === 'Processing your nudge…') hintText.textContent = '';
      hintText.textContent += event.data;
    };

    eventSource.onerror = async () => {
      eventSource.close();
      // If SSE fails (often CORS / network), fetch the hint via the background worker (host-permissioned).
      if (!hintText.textContent || hintText.textContent === 'Processing your nudge…') {
        hintText.textContent = 'Loading your personalized nudge...';
        try {
          const fetched = await chrome.runtime.sendMessage({
            type: 'FETCH_HINT_TEXT',
            sessionId: currentSession.id,
          });
          if (fetched?.success && fetched.text) {
            hintText.textContent = fetched.text;
            if (completeBtn) {
              completeBtn.disabled = false;
              completeBtn.textContent = 'Complete Session';
            }
          } else {
            hintText.textContent = `Unable to load hint. ${fetched?.error || 'Check your connection.'}`;
            if (completeBtn) {
              completeBtn.disabled = false;
              completeBtn.textContent = 'Complete Session';
            }
          }
        } catch {
          hintText.textContent = 'Unable to load hint. Check your connection.';
          if (completeBtn) {
            completeBtn.disabled = false;
            completeBtn.textContent = 'Complete Session';
          }
        }
      }
    };
  } catch (error) {
    // Fallback: fetch hint non-streaming
    hintText.textContent = 'Loading your personalized nudge...';
    
    try {
      const fetchResponse = await fetch(response.sseUrl, {
        headers: {
          'Authorization': `Bearer ${response.token}`,
        },
      });
      const text = await fetchResponse.text();
      hintText.textContent = text;
      if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Complete Session';
      }
    } catch (e) {
      hintText.textContent = 'Unable to load hint. Please check your connection.';
      if (completeBtn) {
        completeBtn.disabled = false;
        completeBtn.textContent = 'Complete Session';
      }
    }
  }
}

async function completeSession() {
  const btn = document.getElementById('dramarama-complete-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Saving…';
  }

  // Persist completion server-side (so it appears in HQ)
  try {
    if (currentSession?.id) {
      await chrome.runtime.sendMessage({
        type: 'COMPLETE_SESSION',
        sessionId: currentSession.id,
      });
    }
  } catch (e) {
    // Non-fatal: still allow user to finish locally
  }

  await chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' });
  
  showView('complete');
  triggerConfetti();

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Complete Session';
  }
}

async function cancelSession() {
  if (!currentSession?.id) return;
  const ok = confirm("Cancel this session? Your progress will be saved as abandoned.");
  if (!ok) return;

  const btn = document.getElementById('dramarama-cancel-btn');
  if (btn) {
    btn.disabled = true;
    btn.textContent = 'Cancelling…';
  }

  try {
    const resp = await chrome.runtime.sendMessage({
      type: 'CANCEL_SESSION',
      sessionId: currentSession.id,
      reason: 'user_cancelled',
    });
    if (resp?.error) {
      alert(`Unable to cancel session: ${resp.error}`);
    }
  } catch (e) {
    alert('Unable to cancel session. Check your connection.');
  }

  await chrome.runtime.sendMessage({ type: 'CLEAR_SESSION' });
  await resetSession();

  if (btn) {
    btn.disabled = false;
    btn.textContent = 'Cancel Session';
  }
}

async function resetSession() {
  currentSession = null;
  currentPromptIndex = 0;
  
  const algorithmTitle = getAlgorithmTitle();
  document.getElementById('dramarama-algo-title').textContent = algorithmTitle;
  
  showView('start');
}

function showView(viewName) {
  const views = ['auth', 'start', 'session', 'hint', 'complete'];
  
  views.forEach(view => {
    const element = document.getElementById(`dramarama-${view}-view`);
    if (element) {
      element.classList.toggle('hidden', view !== viewName);
    }
  });
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', createChatUI);
} else {
  createChatUI();
}

