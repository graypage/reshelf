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

async function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  console.log('Login:', email);
  
  // changed by antigravity
  if (!email || !password) {
    alert('Please enter both email and password');
    return;
  }
  
  const res = await apiFetch('/auth/login', { 
    method: 'POST', 
    body: JSON.stringify({ email, password }) 
  });
  
  if (!res || res.error) {
    alert(res?.error || 'Login failed');
    return;
  }

  // Set the current user data from the backend response
  setCurrentUser({ name: res.user.name, email: res.user.email });
  // Redirect to root index to see the updated navbar
  window.location.href = '../../index.html';
}

async function handleSignup() {
  const name  = document.getElementById('signup-name').value;
  const email = document.getElementById('signup-email').value;
  const password = document.getElementById('signup-password').value;
  console.log('Signup:', name, email);
  
  // changed by antigravity
  if (!name || !email || !password) {
    alert('Please enter all fields');
    return;
  }

  const res = await apiFetch('/auth/signup', { 
    method: 'POST', 
    body: JSON.stringify({ name, email, password }) 
  });

  if (!res || res.error) {
    alert(res?.error || 'Signup failed');
    return;
  }

  alert('Profile made successfully! Please log in.');
  showPanel('login');
}

function handleReset() {
  const email = document.getElementById('reset-email').value;
  console.log('Reset:', email);
  // TODO: apiFetch('/auth/reset', { method:'POST', ... })
}
