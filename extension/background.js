/**
 * DramaRama Extension - Background Service Worker
 * Handles API communication and session state
 */

const API_BASE_URL = 'http://localhost:8000/api';
const FRONTEND_BASE_URL = 'http://localhost:3000';

// Store session state
let currentSession = null;
let authToken = null;
// Map of problem URL -> session for tracking one session per problem
let sessionsByProblem = {};

function decodeJwtSub(token) {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad base64 if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const json = atob(padded);
    const payload = JSON.parse(json);
    return payload?.sub || null;
  } catch {
    return null;
  }
}

// Listen for messages from content script and popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  handleMessage(request, sender).then(sendResponse);
  return true; // Keep channel open for async response
});

async function handleMessage(request, sender) {
  switch (request.type) {
    case 'SET_AUTH_TOKEN':
      // If user identity changes, discard any in-progress session tied to the old token.
      // But if token rotates for the same user (common), keep the session.
      if (authToken && request.token && authToken !== request.token) {
        const prevSub = decodeJwtSub(authToken);
        const nextSub = decodeJwtSub(request.token);
        if (prevSub && nextSub && prevSub !== nextSub) {
          currentSession = null;
          sessionsByProblem = {};
          await chrome.storage.local.remove(['currentSession', 'sessionsByProblem']);
        }
      }
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

    case 'FETCH_HINT_TEXT':
      return await fetchHintText(request.sessionId);

    case 'COMPLETE_SESSION':
      return await completeSession(request.sessionId);

    case 'CANCEL_SESSION':
      return await cancelSession(request.sessionId, request.reason);

    case 'GET_CURRENT_SESSION':
      return { session: currentSession };

    case 'GET_SESSION_FOR_PROBLEM':
      return await getSessionForProblem(request.problemUrl);

    case 'CHECK_ACTIVE_SESSION_FOR_PROBLEM':
      return await checkActiveSessionForProblem(request.problemUrl);

    case 'LOGOUT':
      // Clear all auth and session data
      authToken = null;
      currentSession = null;
      sessionsByProblem = {};
      await chrome.storage.local.remove(['authToken', 'currentSession', 'sessionsByProblem']);
      return { success: true };

    case 'CLEAR_SESSION':
      // Clear current session and remove from problem map
      if (currentSession?.algorithmUrl) {
        delete sessionsByProblem[currentSession.algorithmUrl];
      }
      currentSession = null;
      await chrome.storage.local.set({ currentSession: null, sessionsByProblem });
      return { success: true };

    case 'OPEN_REAUTH': {
      const returnUrl = request?.returnUrl || 'https://leetcode.com/';
      const target = `${FRONTEND_BASE_URL}/go/leetcode?url=${encodeURIComponent(returnUrl)}`;
      try {
        // Open a background tab to mint+ingest a fresh token (user stays on LeetCode).
        await chrome.tabs.create({ url: target, active: false });
        return { success: true };
      } catch (e) {
        return { error: 'Unable to open re-auth tab. Is the DramaRama HQ running?' };
      }
    }

    default:
      return { error: 'Unknown message type' };
  }
}

async function getSessionForProblem(problemUrl) {
  // Load sessions from storage if not in memory
  if (Object.keys(sessionsByProblem).length === 0) {
    const stored = await chrome.storage.local.get('sessionsByProblem');
    sessionsByProblem = stored.sessionsByProblem || {};
  }
  
  const session = sessionsByProblem[problemUrl];
  if (session && !session.sessionComplete) {
    currentSession = session;
    return { session };
  }
  
  return { session: null };
}

async function checkActiveSessionForProblem(problemUrl) {
  // Load sessions from storage if not in memory
  if (Object.keys(sessionsByProblem).length === 0) {
    const stored = await chrome.storage.local.get('sessionsByProblem');
    sessionsByProblem = stored.sessionsByProblem || {};
  }
  
  const session = sessionsByProblem[problemUrl];
  if (session && !session.sessionComplete && session.currentPromptIndex > 0) {
    return { hasActiveSession: true, session };
  }
  
  return { hasActiveSession: false };
}

async function fetchTextFromResponse(response) {
  const contentType = response.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const j = await response.json().catch(() => null);
    return j?.detail || JSON.stringify(j) || 'Request failed';
  }
  return await response.text().catch(() => 'Request failed');
}

async function parseSseToText(response) {
  if (!response.body) return '';
  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let buf = '';
  let out = '';

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buf += decoder.decode(value, { stream: true });

    // SSE events are separated by a blank line
    let idx;
    while ((idx = buf.indexOf('\n\n')) !== -1) {
      const eventBlock = buf.slice(0, idx);
      buf = buf.slice(idx + 2);

      const lines = eventBlock.split('\n');
      for (const line of lines) {
        if (!line.startsWith('data:')) continue;
        // SSE allows a single optional space after "data:"; preserve all other whitespace.
        let data = line.slice(5);
        if (data.startsWith(' ')) data = data.slice(1);
        if (data === '[DONE]') return out.trimEnd();
        out += data;
      }
    }
  }

  return out.trimEnd();
}

async function fetchHintText(sessionId) {
  try {
    if (!authToken) {
      const stored = await chrome.storage.local.get('authToken');
      authToken = stored.authToken;
    }
    if (!authToken) {
      throw new Error('Not authenticated. Please login at DramaRama.');
    }

    const url = `${API_BASE_URL}/session/${sessionId}/analyze?token=${encodeURIComponent(authToken)}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      const msg = await fetchTextFromResponse(response);
      throw new Error(msg || 'Unable to fetch hint');
    }

    const text = await parseSseToText(response);
    return { success: true, text };
  } catch (error) {
    return { error: error.message || 'Unable to fetch hint' };
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

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, options);
  } catch (e) {
    // Network/CORS failures show up as TypeError: Failed to fetch
    throw new Error(
      'Failed to fetch. Make sure the backend is running on http://localhost:8000 and CORS allows your chrome-extension:// origin.'
    );
  }
  
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
      algorithmUrl: algorithmUrl,
      currentPromptIndex: result.current_prompt_index,
      currentPrompt: result.current_prompt,
      responses: [],
    };

    // Store in sessions by problem
    sessionsByProblem[algorithmUrl] = currentSession;

    await chrome.storage.local.set({ currentSession, sessionsByProblem });

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
      
      // Update in sessions by problem
      if (currentSession.algorithmUrl) {
        sessionsByProblem[currentSession.algorithmUrl] = currentSession;
      }
      
      await chrome.storage.local.set({ currentSession, sessionsByProblem });
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

async function completeSession(sessionId) {
  try {
    const result = await apiRequest('/session/complete', 'POST', {
      session_id: sessionId,
      final_response: null,
    });
    
    // Mark session as complete in our map
    if (currentSession && currentSession.id === sessionId) {
      currentSession.sessionComplete = true;
      if (currentSession.algorithmUrl) {
        sessionsByProblem[currentSession.algorithmUrl] = currentSession;
      }
      await chrome.storage.local.set({ currentSession, sessionsByProblem });
    }
    
    return { success: true, result };
  } catch (error) {
    return { error: error.message };
  }
}

async function cancelSession(sessionId, reason = null) {
  try {
    const result = await apiRequest('/session/cancel', 'POST', {
      session_id: sessionId,
      reason,
    });
    
    // Remove session from our map
    if (currentSession && currentSession.id === sessionId && currentSession.algorithmUrl) {
      delete sessionsByProblem[currentSession.algorithmUrl];
      await chrome.storage.local.set({ sessionsByProblem });
    }
    
    return { success: true, result };
  } catch (error) {
    return { error: error.message };
  }
}

// Restore session on startup
chrome.storage.local.get(['currentSession', 'authToken', 'sessionsByProblem'], (result) => {
  if (result.currentSession) {
    currentSession = result.currentSession;
  }
  if (result.authToken) {
    authToken = result.authToken;
  }
  if (result.sessionsByProblem) {
    sessionsByProblem = result.sessionsByProblem;
  }
});
