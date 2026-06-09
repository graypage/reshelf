// ── auth.js ──────────────────────────────────────────
// TODO: implement functions below when backend is ready

document.addEventListener('DOMContentLoaded', () => {
  // Page initialisation goes here
  console.log('auth page loaded');
});

function showPanel(name) {
  document.querySelectorAll('.form-panel').forEach(p => p.classList.remove('active'));
  document.getElementById('panel-' + name).classList.add('active');
}

function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  console.log('Login:', email);
  // TODO: apiFetch('/auth/login', { method:'POST', body: JSON.stringify({email, password}) })
}

function handleSignup() {
  const name  = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  console.log('Signup:', name, email);
  // TODO: apiFetch('/auth/signup', { method:'POST', ... })
}

function handleReset() {
  const email = document.getElementById('reset-email').value;
  console.log('Reset:', email);
  // TODO: apiFetch('/auth/reset', { method:'POST', ... })
}
