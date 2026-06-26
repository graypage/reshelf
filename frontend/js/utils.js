const API_BASE = 'http://localhost:3000/api';

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
