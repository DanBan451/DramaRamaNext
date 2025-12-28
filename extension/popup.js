/**
 * DramaRama Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});

async function checkAuthStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  const authSection = document.getElementById('auth-section');
  const loggedInSection = document.getElementById('logged-in-section');
  
  if (response.token) {
    authSection.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    
    // Fetch stats
    await fetchStats(response.token);
  } else {
    authSection.classList.remove('hidden');
    loggedInSection.classList.add('hidden');
  }
}

async function fetchStats(token) {
  try {
    const response = await fetch('http://localhost:8000/api/user/stats', {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });
    
    if (response.ok) {
      const stats = await response.json();
      document.getElementById('stat-sessions').textContent = stats.total_sessions || 0;
      document.getElementById('stat-streak').textContent = stats.current_streak || 0;
    }
  } catch (error) {
    console.error('Failed to fetch stats:', error);
  }
}

async function logout() {
  await chrome.storage.local.remove(['authToken', 'currentSession']);
  await checkAuthStatus();
}

