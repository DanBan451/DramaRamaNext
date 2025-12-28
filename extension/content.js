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
            <p>Please login at DramaRama to start your mental gym session.</p>
            <a href="http://localhost:3000/login" target="_blank" class="dramarama-btn dramarama-btn-primary">
              Login to DramaRama
            </a>
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
  document.getElementById('dramarama-start-btn')?.addEventListener('click', startSession);
  document.getElementById('dramarama-submit-btn')?.addEventListener('click', submitResponse);
  document.getElementById('dramarama-complete-btn')?.addEventListener('click', completeSession);
  document.getElementById('dramarama-new-session-btn')?.addEventListener('click', resetSession);

  // Word count tracking
  document.getElementById('dramarama-response')?.addEventListener('input', updateWordCount);

  // Initialize
  checkAuthAndSession();
}

function togglePanel() {
  const panel = document.getElementById('dramarama-panel');
  const toggle = document.getElementById('dramarama-toggle');
  
  isOpen = !isOpen;
  
  if (isOpen) {
    panel.classList.remove('hidden');
    toggle.classList.add('active');
  } else {
    panel.classList.add('hidden');
    toggle.classList.remove('active');
  }
}

async function checkAuthAndSession() {
  // Check for auth token
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  if (!response.token) {
    showView('auth');
    return;
  }

  // Check for existing session
  const sessionResponse = await chrome.runtime.sendMessage({ type: 'GET_CURRENT_SESSION' });
  
  if (sessionResponse.session) {
    currentSession = sessionResponse.session;
    
    if (currentSession.sessionComplete) {
      showView('hint');
    } else {
      currentPromptIndex = currentSession.currentPromptIndex;
      showView('session');
      updatePromptDisplay();
    }
  } else {
    // Show start view with algorithm title
    const algorithmTitle = getAlgorithmTitle();
    document.getElementById('dramarama-algo-title').textContent = algorithmTitle;
    showView('start');
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

  const response = await chrome.runtime.sendMessage({
    type: 'SUBMIT_RESPONSE',
    sessionId: currentSession.id,
    promptIndex: currentPromptIndex,
    responseText,
    timeSpentSeconds,
  });

  if (response.error) {
    alert('Error submitting response: ' + response.error);
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
  hintText.textContent = '';

  try {
    const eventSource = new EventSource(
      `${response.sseUrl}?token=${encodeURIComponent(response.token)}`
    );

    eventSource.onmessage = (event) => {
      if (event.data === '[DONE]') {
        eventSource.close();
        return;
      }
      hintText.textContent += event.data;
    };

    eventSource.onerror = () => {
      eventSource.close();
      if (!hintText.textContent) {
        hintText.textContent = 'Unable to load hint. Check your connection.';
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
    } catch (e) {
      hintText.textContent = 'Unable to load hint. Please check your connection.';
    }
  }
}

async function completeSession() {
  await chrome.runtime.sendMessage({
    type: 'CLEAR_SESSION',
  });
  
  showView('complete');
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

