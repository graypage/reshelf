// ── settings.js ──────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/settings.html
//
// WHAT IT DOES:
//   Handles all user settings functionality including profile updates,
//   account information, password changes, and personal preferences.
//
// FUNCTIONS AND WHERE THEY'RE CALLED FROM:
//   loadProfileFromBackend() — called when page loads
//   showMessage()            — displays success/error feedback
//   hideMessage()            — hides feedback messages
//   isValidEmail()           — validates email format
//
// HOW SETTINGS WORK:
//   1. Load profile data from backend
//   2. Allow user to switch between settings tabs
//   3. Process form submissions for each settings section
//   4. Validate user input before saving changes
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {
  // Select all settings tabs and content sections
  const tabs      = document.querySelectorAll('.settings-tab');
  const sections  = document.querySelectorAll('.settings-section');
  const messageBox = document.getElementById('settings-message');

  // Password visibility toggle button
  const togglePasswordBtn = document.getElementById('togglePasswordBtn');

  // Password input fields
  const passwordInputs = [
    document.getElementById('currentPassword'),
    document.getElementById('newPassword'),
    document.getElementById('confirmPassword'),
  ];

  // Toggle password visibility between hidden and visible
  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isHidden = passwordInputs[0].type === 'password';
      passwordInputs.forEach(i => { i.type = isHidden ? 'text' : 'password'; });
      togglePasswordBtn.textContent = isHidden ? 'Hide Password' : 'Show Password';
    });
  }

  // Load profile data from backend
  await loadProfileFromBackend();

  // Handle tab switching in settings page
  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetId = tab.dataset.section;
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      sections.forEach(s => { s.style.display = s.id === targetId ? 'block' : 'none'; });
      hideMessage();
    });
  });

  // Profile form
  // Updates user profile information such as name, university, and bio
  document.getElementById('profile-section').addEventListener('submit', async (e) => {
    e.preventDefault();
    const name       = document.getElementById('displayName').value.trim();
    const university = document.getElementById('university').value.trim();
    const bio        = document.getElementById('bio').value.trim();

    const res = await apiFetch('/profile', {
      method: 'PUT',
      body: JSON.stringify({ name, university, bio })
    });

    if (!res || res.error) {
      showMessage(res?.error || 'Failed to save profile.', 'error');
      return;
    }

    // Update cached user name
    const user = getCurrentUser();
    setCurrentUser({ ...user, name: res.name });
    showMessage('Profile updated successfully.', 'success');
  });

  // Account form (email only stored locally for now, password handled separately)
  document.getElementById('account-section').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('email').value.trim();

    // Validate email format before accepting changes
    if (email && !isValidEmail(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }

    showMessage('Account info noted (email changes require additional verification).', 'success');
  });

  // Password form
  // Handles secure password update
  document.getElementById('password-section').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    // Validate password fields
    if (!currentPassword || !newPassword || !confirmPassword) {
      showMessage('Please fill in all password fields.', 'error'); return;
    }
    if (newPassword.length < 6) {
      showMessage('New password must be at least 6 characters.', 'error'); return;
    }
    if (newPassword !== confirmPassword) {
      showMessage('Passwords do not match.', 'error'); return;
    }

    const res = await apiFetch('/profile/password', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword })
    });

    if (!res || res.error) {
      showMessage(res?.error || 'Failed to update password.', 'error');
      return;
    }

    // Reset form after successful password update
    document.getElementById('password-section').reset();
    passwordInputs.forEach(i => { i.type = 'password'; });
    if (togglePasswordBtn) togglePasswordBtn.textContent = 'Show Password';
    showMessage('Password updated successfully.', 'success');
  });

  // Preferences form (stored locally — not critical user data)
  // Saves user preferences in local storage
  document.getElementById('preferences-section')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const prefs = {
      defaultUniversity: document.getElementById('defaultUniversity')?.value.trim() || '',
      preferredCategory: document.getElementById('preferredCategory')?.value || '',
      meetupPreference:  document.getElementById('meetupPreference')?.value || '',
    };
    localStorage.setItem('reshelfPreferences', JSON.stringify(prefs));
    showMessage('Preferences saved.', 'success');
  });

  // Load saved preferences
  const savedPrefs = JSON.parse(localStorage.getItem('reshelfPreferences') || '{}');
  if (document.getElementById('defaultUniversity'))
    document.getElementById('defaultUniversity').value = savedPrefs.defaultUniversity || '';
  if (document.getElementById('preferredCategory'))
    document.getElementById('preferredCategory').value = savedPrefs.preferredCategory || '';
  if (document.getElementById('meetupPreference'))
    document.getElementById('meetupPreference').value = savedPrefs.meetupPreference || '';

  // Pre-fill account email from local user cache
  const user = getCurrentUser();
  if (user && document.getElementById('email')) {
    document.getElementById('email').value = user.email || '';
  }

  // Displays success/error message to user
  function showMessage(msg, type) {
    messageBox.textContent = msg;
    messageBox.style.display = 'block';
    if (type === 'success') {
      messageBox.style.background = '#e8f5e9';
      messageBox.style.color = '#3a7d44';
      messageBox.style.border = '1px solid rgba(58,125,68,0.25)';
    } else {
      messageBox.style.background = '#fdecea';
      messageBox.style.color = '#c0392b';
      messageBox.style.border = '1px solid rgba(192,57,43,0.25)';
    }
  }

  // Hides message box
  function hideMessage() {
    messageBox.style.display = 'none';
    messageBox.textContent = '';
  }

  // Validates email format using regular expression
  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});

// Fetch profile data from backend and pre-fill form fields
async function loadProfileFromBackend() {
  const profile = await apiFetch('/profile');
  if (!profile || profile.error) return;

  const el = id => document.getElementById(id);
  if (el('displayName')) el('displayName').value = profile.name || '';
  if (el('university'))  el('university').value  = profile.university || '';
  if (el('bio'))         el('bio').value          = profile.bio || '';
}