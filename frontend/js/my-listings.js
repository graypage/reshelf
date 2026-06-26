// ── my-listings.js ──────────────────────────────────────────

requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadListings();
});

// Switch between tabs
function switchTab(tab) {

  document.querySelectorAll('.tab').forEach(t =>
    t.classList.remove('active')
  );

  document.querySelectorAll('.tab-panel').forEach(panel =>
    panel.classList.remove('active')
  );

  if (tab === 'active') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('tab-active').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('tab-old').classList.add('active');
  }

}

// Make function available to HTML
window.switchTab = switchTab;

// Load listings from backend
async function loadListings() {

  const data = await apiFetch('/my-listings');

  if (!data) {
    alert('Unable to load listings.');
    return;
  }

  displayListings(
    data.active,
    document.getElementById('active-listings'),
    'No active listings.'
  );

  displayListings(
    data.old,
    document.getElementById('old-listings'),
    'No old/sold listings.'
  );

}

// Display listings inside a grid
function displayListings(listings, container, emptyMessage) {

  if (!listings || listings.length === 0) {

    container.innerHTML = `
      <div class="empty-state">
        ${emptyMessage}
      </div>
    `;

    return;
  }

  container.innerHTML = '';

  listings.forEach(listing => {

    container.innerHTML += `
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