/**
 * API client for DramaRama backend
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
  }

  async getAuthToken() {
    // In browser, get token from Clerk
    if (typeof window !== 'undefined') {
      const { auth } = await import('@clerk/nextjs');
      // For client-side, we need to get the token differently
      return null; // Will be handled by useAuth hook in components
    }
    return null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ detail: 'Unknown error' }));
      throw new Error(error.detail || `API error: ${response.status}`);
    }

    return response.json();
  }

  // Session endpoints
  async startSession(token, algorithmTitle, algorithmUrl) {
    return this.request('/api/session/start', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        algorithm_title: algorithmTitle,
        algorithm_url: algorithmUrl,
      }),
    });
  }

  async submitResponse(token, sessionId, promptIndex, responseText, timeSpentSeconds) {
    return this.request('/api/session/respond', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: sessionId,
        prompt_index: promptIndex,
        response_text: responseText,
        time_spent_seconds: timeSpentSeconds,
      }),
    });
  }

  async completeSession(token, sessionId, finalResponse) {
    return this.request('/api/session/complete', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: JSON.stringify({
        session_id: sessionId,
        final_response: finalResponse,
      }),
    });
  }

  // User endpoints
  async getUserSessions(token, limit = 50) {
    return this.request(`/api/user/sessions?limit=${limit}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getSessionDetail(token, sessionId) {
    return this.request(`/api/user/sessions/${sessionId}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  async getUserStats(token) {
    return this.request('/api/user/stats', {
      headers: { Authorization: `Bearer ${token}` },
    });
  }

  // Prompts
  async getPrompts() {
    return this.request('/api/prompts');
  }
}

export const api = new ApiClient();
export default api;

