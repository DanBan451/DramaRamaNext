/**
 * DramaRama Extension - Popup Script
 */

document.addEventListener('DOMContentLoaded', async () => {
  await checkAuthStatus();
  
  // Event listeners
  document.getElementById('show-token-btn')?.addEventListener('click', showTokenSection);
  document.getElementById('save-token-btn')?.addEventListener('click', saveToken);
  document.getElementById('cancel-token-btn')?.addEventListener('click', hideTokenSection);
  document.getElementById('logout-btn')?.addEventListener('click', logout);
});

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

function setConnectedIdentity(token) {
  const el = document.getElementById('connected-as');
  if (!el) return;

  if (!token) {
    el.textContent = 'Connected as: (no token)';
    return;
  }

  const payload = decodeJwtPayload(token);
  const sub = payload?.sub;
  const email = payload?.email;

  if (!sub) {
    el.textContent = 'Connected as: (unable to read clerk_id from token)';
    return;
  }

  // Keep it readable in a small popup
  const short = sub.length > 18 ? `${sub.slice(0, 10)}…${sub.slice(-6)}` : sub;
  el.textContent = email
    ? `Connected as (clerk_id): ${short}  |  ${email}`
    : `Connected as (clerk_id): ${short}`;
}

async function checkAuthStatus() {
  const response = await chrome.runtime.sendMessage({ type: 'GET_AUTH_TOKEN' });
  
  const authSection = document.getElementById('auth-section');
  const tokenSection = document.getElementById('token-section');
  const loggedInSection = document.getElementById('logged-in-section');
  
  if (response.token) {
    authSection.classList.add('hidden');
    tokenSection.classList.add('hidden');
    loggedInSection.classList.remove('hidden');
    setConnectedIdentity(response.token);
  } else {
    authSection.classList.remove('hidden');
    tokenSection.classList.add('hidden');
    loggedInSection.classList.add('hidden');
  }
}

function showTokenSection() {
  document.getElementById('auth-section').classList.add('hidden');
  document.getElementById('token-section').classList.remove('hidden');
}

function hideTokenSection() {
  document.getElementById('auth-section').classList.remove('hidden');
  document.getElementById('token-section').classList.add('hidden');
}

async function saveToken() {
  const tokenInput = document.getElementById('token-input');
  const token = tokenInput.value.trim();
  
  if (!token) {
    alert('Please paste your JWT token');
    return;
  }
  
  // Save token
  await chrome.runtime.sendMessage({ 
    type: 'SET_AUTH_TOKEN', 
    token: token 
  });
  
  // Refresh view
  await checkAuthStatus();
}

async function logout() {
  await chrome.storage.local.remove(['authToken', 'currentSession']);
  await checkAuthStatus();
}
