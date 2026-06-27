// ── index.js ──────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: homepage / listings page
//
// WHAT IT DOES:
//   Handles displaying all book listings.
//   Fetches listings from the backend, renders listing cards,
//   and supports search + advanced filtering.
//
// FUNCTIONS AND WHERE THEY'RE CALLED FROM:
//   loadListings()   — called on page load and after search/filter changes
//   handleSearch()   — called by the search button or search form
//   toggleAdvanced() — called by the advanced filter toggle button
//
// HOW LISTING SEARCH WORKS:
//   1. Page loads and requests all listings from the backend
//   2. Listings are displayed as clickable cards
//   3. Users can search by keyword or apply filters
//   4. Filters are converted into query parameters
//   5. Backend returns only matching listings
// ─────────────────────────────────────────────────────────────────────────────



document.addEventListener('DOMContentLoaded', () => {
  loadListings();
});

async function loadListings(params = {}) {
  const grid = document.getElementById('listings-grid');
  grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Loading...</p>';

  const qs = new URLSearchParams(params).toString();
  const listings = await apiFetch('/listings' + (qs ? '?' + qs : ''));

  if (!listings || listings.error) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">Failed to load listings.</p>';
    return;
  }

  if (listings.length === 0) {
    grid.innerHTML = '<p style="color:var(--text-muted);text-align:center;padding:40px 0;">No listings found.</p>';
    return;
  }

  grid.innerHTML = listings.map(l => `
    <div class="listing-card" onclick="window.location.href='frontend/pages/listing.html?id=${l.id}'">
      ${l.image
        ? `<img src="${l.image}" alt="${l.title}" style="width:100%;height:160px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0;">`
        : `<div class="listing-card-img-placeholder">No image</div>`}
      <div class="listing-card-body">
        <div class="listing-card-title">${l.title}</div>
        <div class="listing-card-sub">${[l.university, l.subject].filter(Boolean).join(' · ')}</div>
        <div class="listing-card-meta">
          <span class="listing-card-price">AED ${parseFloat(l.price).toFixed(2)}</span>
          <span class="tag tag-active">${l.type || ''}</span>
        </div>
      </div>
    </div>
  `).join('');
}

function handleSearch() {
  const q       = document.getElementById('search-input').value.trim();
  const uni     = document.getElementById('filter-uni')?.value || '';
  const subject = document.getElementById('filter-subject')?.value || '';
  const type    = document.getElementById('filter-type')?.value || '';

  const params = {};
  if (q)       params.q       = q;
  if (uni)     params.uni     = uni;
  if (subject) params.subject = subject;
  if (type)    params.type    = type;

  loadListings(params);
}

function toggleAdvanced() {
  const panel = document.getElementById('advanced-filters');
  panel.classList.toggle('open');
}
