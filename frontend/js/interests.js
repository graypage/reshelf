// ── interests.js ──────────────────────────────────────────

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadInterests();
});

// Load the logged-in user's interested listings
async function loadInterests() {

  const listings = await apiFetch('/interests');

  const grid = document.getElementById('interests-grid');

  if (!listings || listings.length === 0) {

    grid.innerHTML = `
      <div class="empty-state">
        No interests yet.
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