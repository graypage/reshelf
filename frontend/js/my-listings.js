// ── my-listings.js ───────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/my-listings.html
//
// WHAT IT DOES:
//   Handles the "My Listings" page.
//   Displays all listings created by the logged-in user,
//   separating them into active and old (sold/deleted) listings.
//
// FUNCTIONS AND WHERE THEY'RE CALLED FROM:
//   switchTab(tab)                           — called when user switches tabs
//   loadListings()                           — called when page loads
//   displayListings(listings, container)     — called by loadListings()
//
// HOW MY LISTINGS WORK:
//   1. User opens My Listings page
//   2. Script verifies authentication
//   3. User’s listings are fetched from backend
//   4. Listings are divided into active and old categories
//   5. User can switch between tabs to view each category
//



requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadListings();
});

function switchTab(tab) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));

  if (tab === 'active') {
    document.querySelectorAll('.tab')[0].classList.add('active');
    document.getElementById('tab-active').classList.add('active');
  } else {
    document.querySelectorAll('.tab')[1].classList.add('active');
    document.getElementById('tab-old').classList.add('active');
  }
}
window.switchTab = switchTab;

async function loadListings() {
  const data = await apiFetch('/my-listings');
  if (!data) { alert('Unable to load listings.'); return; }

  displayListings(data.active, document.getElementById('active-listings'), 'No active listings yet.');
  displayListings(data.old,    document.getElementById('old-listings'),    'No sold/deleted listings.');
}

function displayListings(listings, container, emptyMessage) {
  if (!listings || listings.length === 0) {
    container.innerHTML = `<div class="empty-state">${emptyMessage}</div>`;
    return;
  }

  container.innerHTML = listings.map(l => `
    <div class="listing-card" onclick="window.location.href='listing.html?id=${l.id}'" style="cursor:pointer;">
      ${l.image
        ? `<img src="${l.image}" alt="${l.title}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0;">`
        : `<div class="listing-card-img-placeholder">No image</div>`}
      <div class="listing-card-body">
        <div class="listing-card-title">${l.title}</div>
        <div class="listing-card-sub">${l.type || ''} · ${l.condition || ''}</div>
        <div class="listing-card-meta">
          <span class="listing-card-price">AED ${parseFloat(l.price).toFixed(2)}</span>
          <span class="tag ${l.status === 'active' ? 'tag-active' : 'tag-dead'}">${l.status}</span>
        </div>
        ${l.status === 'active'
          ? `<a href="edit-listing.html?id=${l.id}" class="btn btn-outline" style="margin-top:10px;display:block;text-align:center;" onclick="event.stopPropagation()">Edit</a>`
          : ''}
      </div>
    </div>
  `).join('');
}
