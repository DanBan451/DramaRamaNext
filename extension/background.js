/**
 * DramaRama Extension - Background Service Worker
 * Handles API communication and session state
 */

const API_BASE_URL = 'http://localhost:8000/api';

// Store session state
let currentSession = null;
let authToken = null;

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender) {
  switch (request.type) {
    case 'SET_AUTH_TOKEN':
      authToken = request.token;
      await chrome.storage.local.set({ authToken: request.token });
      return { success: true };

    case 'GET_AUTH_TOKEN':
      if (!authToken) {
        const stored = await chrome.storage.local.get('authToken');
        authToken = stored.authToken;
      }
      return { token: authToken };

    case 'START_SESSION':
      return await startSession(request.algorithmTitle, request.algorithmUrl);

    case 'SUBMIT_RESPONSE':
      return await submitResponse(
        request.sessionId,
        request.promptIndex,
        request.responseText,
        request.timeSpentSeconds
      );

    case 'GET_HINT':
      return await getHint(request.sessionId);

    case 'GET_CURRENT_SESSION':
      return { session: currentSession };

    case 'CLEAR_SESSION':
      currentSession = null;
      await chrome.storage.local.remove('currentSession');
      return { success: true };

    default:
      return { error: 'Unknown message type' };
  }
}

async function apiRequest(endpoint, method = 'GET', body = null) {
  if (!authToken) {
    const stored = await chrome.storage.local.get('authToken');
    authToken = stored.authToken;
  }

  if (!authToken) {
    throw new Error('Not authenticated. Please login at DramaRama.');
  }

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`,
    },
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  const response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
    throw new Error(error.detail || 'API request failed');
  }

  return response.json();
}

async function startSession(algorithmTitle, algorithmUrl) {
  try {
    const result = await apiRequest('/session/start', 'POST', {
      algorithm_title: algorithmTitle,
      algorithm_url: algorithmUrl,
    });

    currentSession = {
      id: result.session_id,
      algorithmTitle: result.algorithm_title,
      currentPromptIndex: result.current_prompt_index,
      currentPrompt: result.current_prompt,
      responses: [],
    };

    await chrome.storage.local.set({ currentSession });

    return { success: true, session: currentSession };
  } catch (error) {
    return { error: error.message };
  }
}

async function submitResponse(sessionId, promptIndex, responseText, timeSpentSeconds) {
  try {
    const result = await apiRequest('/session/respond', 'POST', {
      session_id: sessionId,
      prompt_index: promptIndex,
      response_text: responseText,
      time_spent_seconds: timeSpentSeconds,
    });

    if (currentSession && currentSession.id === sessionId) {
      currentSession.responses.push({
        promptIndex,
        responseText,
        timeSpentSeconds,
      });
      currentSession.currentPromptIndex = result.prompts_completed;
      currentSession.currentPrompt = result.next_prompt;
      currentSession.sessionComplete = result.session_complete;
      
      await chrome.storage.local.set({ currentSession });
    }

    return {
      success: true,
      promptsCompleted: result.prompts_completed,
      nextPrompt: result.next_prompt,
      sessionComplete: result.session_complete,
    };
  } catch (error) {
    return { error: error.message };
  }
}

async function getHint(sessionId) {
  try {
    // For SSE, we return the endpoint URL and let the content script handle streaming
    return {
      success: true,
      sseUrl: `${API_BASE_URL}/session/${sessionId}/analyze`,
      token: authToken,
    };
  } catch (error) {
    return { error: error.message };
  }
}

// Restore session on startup
chrome.storage.local.get(['currentSession', 'authToken'], (result) => {
  if (result.currentSession) {
    currentSession = result.currentSession;
  }
  if (result.authToken) {
    authToken = result.authToken;
  }
});

