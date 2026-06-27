document.addEventListener('DOMContentLoaded', async () => {
  const tabs      = document.querySelectorAll('.settings-tab');
  const sections  = document.querySelectorAll('.settings-section');
  const messageBox = document.getElementById('settings-message');

  const togglePasswordBtn = document.getElementById('togglePasswordBtn');
  const passwordInputs = [
    document.getElementById('currentPassword'),
    document.getElementById('newPassword'),
    document.getElementById('confirmPassword'),
  ];

  if (togglePasswordBtn) {
    togglePasswordBtn.addEventListener('click', () => {
      const isHidden = passwordInputs[0].type === 'password';
      passwordInputs.forEach(i => { i.type = isHidden ? 'text' : 'password'; });
      togglePasswordBtn.textContent = isHidden ? 'Hide Password' : 'Show Password';
    });
  }

  // Load profile data from backend
  await loadProfileFromBackend();

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
    if (email && !isValidEmail(email)) {
      showMessage('Please enter a valid email address.', 'error');
      return;
    }
    showMessage('Account info noted (email changes require additional verification).', 'success');
  });

  // Password form
  document.getElementById('password-section').addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword     = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

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

    document.getElementById('password-section').reset();
    passwordInputs.forEach(i => { i.type = 'password'; });
    if (togglePasswordBtn) togglePasswordBtn.textContent = 'Show Password';
    showMessage('Password updated successfully.', 'success');
  });

  // Preferences form (stored locally — not critical user data)
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

  function hideMessage() {
    messageBox.style.display = 'none';
    messageBox.textContent = '';
  }

  function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }
});

async function loadProfileFromBackend() {
  const profile = await apiFetch('/profile');
  if (!profile || profile.error) return;

  const el = id => document.getElementById(id);
  if (el('displayName')) el('displayName').value = profile.name || '';
  if (el('university'))  el('university').value  = profile.university || '';
  if (el('bio'))         el('bio').value          = profile.bio || '';
}
