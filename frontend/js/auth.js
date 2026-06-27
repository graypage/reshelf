// ── auth.js ──────────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/auth.html
//
// WHAT IT DOES:
//   Handles all three panels on the auth page — login, signup, and password reset.
//   Each panel has a form with an onclick button that calls a function here.
//
// FUNCTIONS AND WHERE THEY'RE CALLED FROM:
//   showPanel(name)   — called by the "Sign up" / "Log in" / "Back" links in auth.html
//   handleLogin()     — called by the "Log in" button in #panel-login
//   handleSignup()    — called by the "Create account" button in #panel-signup
//   handleReset()     — called by the "Send reset link" button in #panel-reset
//
// HOW LOGIN WORKS:
//   1. User fills in email + password and clicks "Log in"
//   2. handleLogin() sends them to POST /api/auth/login on the backend
//   3. If successful, the server returns { user: { id, name, email } }
//   4. We save that to localStorage via setCurrentUser() (defined in utils.js)
//   5. We redirect to the homepage — the navbar reads localStorage to show the user's name
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  // If the user is already logged in, no need to be on this page — send them home
  if (isLoggedIn()) window.location.href = '../../index.html';
});

// ── showPanel ─────────────────────────────────────────────────────────────────
// Switches between the login, signup, and reset panels.
// Hides all panels then makes the one matching `name` visible.
// Called by the links at the bottom of each panel, e.g.:
//   <a onclick="showPanel('signup')">Sign up</a>
function showPanel(name) {
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

// ── handleLogin ───────────────────────────────────────────────────────────────
// Called by the "Log in" button.
// Sends email + password to the backend, saves the returned user, redirects home.
async function handleLogin() {
  const email    = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;

  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }

  // apiFetch() is in utils.js — wraps fetch() with the base URL and JSON headers
  const res = await apiFetch('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  if (!res || res.error) {
    alert(res?.error || 'Login failed. Please check your details.');
    return;
  }

  // Save the user's id, name, and email to localStorage.
  // Everything else on the site reads this via getCurrentUser() (in utils.js).
  // We save the id because pages like conversation.js need it to tell
  // which messages are "mine" vs "theirs".
  setCurrentUser({ id: res.user.id, name: res.user.name, email: res.user.email });

  // Redirect to the homepage — the navbar will now show the user's name
  window.location.href = '../../index.html';
}

// ── handleSignup ──────────────────────────────────────────────────────────────
// Called by the "Create account" button.
// Sends name, email, and password to the backend to create a new user.
async function handleSignup() {
  const name     = document.getElementById('signup-name').value.trim();
  const email    = document.getElementById('signup-email').value.trim();
  const password = document.getElementById('signup-password').value;

  if (!name || !email || !password) {
    alert('Please fill in all fields');
    return;
  }

  const res = await apiFetch('/auth/signup', {
    method: 'POST',
    body: JSON.stringify({ name, email, password })
  });

  if (!res || res.error) {
    alert(res?.error || 'Signup failed. Please try again.');
    return;
  }

  // Account created — switch to the login panel so they can log in
  alert('Account created! Please log in.');
  showPanel('login');
}

// ── handleReset ───────────────────────────────────────────────────────────────
// Called by the "Set new password" button.
// Dummy-project version: no email/token verification — just sends the email
// and the new password straight to the backend, which overwrites it directly.
async function handleReset() {
  const email       = document.getElementById('reset-email').value.trim();
  const newPassword = document.getElementById('reset-new-password').value;

  if (!email || !newPassword) {
    alert('Please enter your email and a new password');
    return;
  }

  // Backend needs a matching POST /api/auth/reset-password route that finds
  // the user by email and overwrites their stored password with newPassword.
  const res = await apiFetch('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ email, newPassword })
  });

  if (!res || res.error) {
    alert(res?.error || 'Could not reset password. Check the email and try again.');
    return;
  }

  alert('Password updated! Please log in with your new password.');
  showPanel('login');
}
