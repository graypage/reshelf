const API_BASE = '/api';

// ── Auth helpers ──────────────────────────────────────────
function getCurrentUser() {
  const u = localStorage.getItem('reshelf_user');
  return u ? JSON.parse(u) : null;
}

function setCurrentUser(user) {
  localStorage.setItem('reshelf_user', JSON.stringify(user));
}

function clearCurrentUser() {
  localStorage.removeItem('reshelf_user');
}

function isLoggedIn() {
  return !!getCurrentUser();
}

function requireAuth() {
  if (!isLoggedIn()) window.location.href = '../pages/auth.html';
}

// ── API fetch wrapper ─────────────────────────────────────
async function apiFetch(endpoint, options = {}) {
  try {

    const currentUser = getCurrentUser();

    const res = await fetch(API_BASE + endpoint, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(currentUser && { 'x-user-email': currentUser.email }),
        ...(options.headers || {})
      }
    });

    return await res.json();

  } catch (err) {
    console.error('apiFetch error:', err);
    return null;
  }
}

// ── Misc helpers ──────────────────────────────────────────
function formatPrice(amount) {
  return 'AED ' + parseFloat(amount).toFixed(2);
}

function timeAgo(dateString) {
  const diff = Date.now() - new Date(dateString).getTime();
  const days = Math.floor(diff / 86400000);
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  return days + ' days ago';
}

function getQueryParam(key) {
  return new URLSearchParams(window.location.search).get(key);
}

// ── Basic HTML escaping for any user-generated text inserted via innerHTML ──
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// ── Inbox read-state tracking ────────────────────────────────
// The backend has no concept of "read" messages, so we track it client-side:
// every time a conversation is opened, we stamp "now" against that user's id.
// The inbox then compares each thread's latest message time against that stamp.
function getLastRead(otherId) {
  try {
    const map = JSON.parse(localStorage.getItem('reshelf_lastRead') || '{}');
    return map[otherId] || 0;
  } catch {
    return 0;
  }
}

function setLastRead(otherId) {
  try {
    const map = JSON.parse(localStorage.getItem('reshelf_lastRead') || '{}');
    map[otherId] = Date.now();
    localStorage.setItem('reshelf_lastRead', JSON.stringify(map));
  } catch {
    // localStorage unavailable — read-state just won't persist, not fatal
  }
}
