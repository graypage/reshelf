// ── profile.js ──────────────────────────────────────────

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadProfile();
  loadListings();
});

// Load the logged-in user's profile
async function loadProfile() {

  const user = await apiFetch('/profile');

  if (!user) {
    alert('Unable to load profile.');
    return;
  }

  document.getElementById('profile-avatar').textContent =
    user.name.charAt(0).toUpperCase();

  document.getElementById('profile-name').textContent =
    user.name;

  document.getElementById('profile-uni').textContent =
    user.university || '';

  document.getElementById('profile-location').textContent =
    user.location || '';

  document.getElementById('profile-joined').textContent =
    user.joined ? `Joined ${user.joined}` : '';

  document.getElementById('profile-bio').textContent =
    user.bio || '';

}

// Load the user's active listings
async function loadListings() {

  const listings = await apiFetch('/profile/listings');

  const grid = document.getElementById('profile-listings');

  if (!listings || listings.length === 0) {

    grid.innerHTML = `
      <div class="empty-state">
        No listings yet.
      </div>
    `;

    return;
  }

  grid.innerHTML = '';

  listings.forEach(listing => {

    grid.innerHTML += `
      <div class="listing-card">

        <img src="${listing.image}" alt="${listing.title}">

        <div class="listing-content">

          <h3>${listing.title}</h3>

          <p>${formatPrice(listing.price)}</p>

        </div>

      </div>
    `;

  });

}