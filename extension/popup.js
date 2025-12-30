/**
 * DramaRama Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  
  // Event listeners
  document.getElementById('logout-btn')?.addEventListener('click', logout);
  document.getElementById('login-btn')?.addEventListener('click', handleLogin);
});

async function handleLogin(e) {
  e.preventDefault();
  
  // Get the current tab URL
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  const currentUrl = tab?.url || 'https://leetcode.com/';
  
  // Construct the login URL with redirect back to current LeetCode page
  const API_URL = 'http://localhost:3000';
  const encodedUrl = encodeURIComponent(currentUrl);
  const redirectPath = `/go/leetcode?url=${encodedUrl}`;
  const encodedRedirect = encodeURIComponent(redirectPath);
  const loginUrl = `${API_URL}/login?redirect=${encodedRedirect}`;
  
  // Open the login page
  chrome.tabs.create({ url: loginUrl });
}

function base64UrlDecode(str) {
  // Convert base64url -> base64
  const pad = '='.repeat((4 - (str.length % 4)) % 4);
  const b64 = (str + pad).replace(/-/g, '+').replace(/_/g, '/');
  try {
    return atob(b64);
  } catch {
    return null;
  }
}

function decodeJwtPayload(token) {
  // JWT: header.payload.signature
  if (!token || typeof token !== 'string') return null;
  const parts = token.split('.');
  if (parts.length < 2) return null;
  const json = base64UrlDecode(parts[1]);
  if (!json) return null;
  try {
    return JSON.parse(json);
  } catch {
    return null;
  }
}

function extractUserInfo(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) {
    return { name: null, email: null, clerkId: null };
  }

  // Try to get name from various JWT fields
  const name = payload.name 
    || payload.given_name 
    || payload.nickname 
    || payload.preferred_username
    || null;
  
  const email = payload.email || null;
  const clerkId = payload.sub || null;

  return { name, email, clerkId };
}

function setUserInfo(token) {
  const greetingEl = document.getElementById('user-greeting');
  const emailEl = document.getElementById('user-email');
  
  if (!greetingEl || !emailEl) return;

  if (!token) {
    greetingEl.textContent = 'Hi there!';
    emailEl.textContent = '';
    return;
  }

  const { name, email, clerkId } = extractUserInfo(token);

  // Display greeting with name
  if (name) {
    greetingEl.textContent = `Hi, ${name}! 👋`;
  } else if (email) {
    // Use the part before @ as a display name
    const displayName = email.split('@')[0];
    greetingEl.textContent = `Hi, ${displayName}! 👋`;
  } else {
    greetingEl.textContent = 'Welcome back! 👋';
  }

  if (email) {
    emailEl.textContent = email;
  } else {
    emailEl.textContent = 'Ready to train your mind';
  }
}

async function checkAuthStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  const authSection = document.getElementById('auth-section');
  const loggedInSection = document.getElementById('logged-in-section');
  
  if (response.token) {
    authSection.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    setUserInfo(response.token);
  } else {
    authSection.classList.remove('hidden');
    loggedInSection.classList.add('hidden');
  }
}

async function logout() {
  await chrome.runtime.sendMessage({ type: 'LOGOUT' });
  await checkAuthStatus();
}
