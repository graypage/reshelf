requireAuth();

document.addEventListener('DOMContentLoaded', () => {
  loadInterests();
});

async function loadInterests() {
  const listings = await apiFetch('/interests');
  const grid = document.getElementById('interests-grid');

  if (!listings || listings.length === 0) {
    grid.innerHTML = `<div class="empty-state">No interests yet. Browse listings and click "I'm interested"!</div>`;
    return;
  }

  grid.innerHTML = listings.map(l => `
    <div class="listing-card" onclick="window.location.href='listing.html?id=${l.id}'" style="cursor:pointer;">
      ${l.image
        ? `<img src="${l.image}" alt="${l.title}" style="width:100%;height:140px;object-fit:cover;border-radius:var(--radius) var(--radius) 0 0;">`
        : `<div class="listing-card-img-placeholder">No image</div>`}
      <div class="listing-card-body">
        <div class="listing-card-title">${l.title}</div>
        <div class="listing-card-sub">${[l.university, l.subject].filter(Boolean).join(' · ')}</div>
        <div class="listing-card-meta">
          <span class="listing-card-price">AED ${parseFloat(l.price).toFixed(2)}</span>
          <span class="tag tag-active">${l.type || ''}</span>
        </div>
        <button class="btn btn-outline" style="margin-top:10px;width:100%;"
          onclick="event.stopPropagation(); removeInterest(${l.id}, this)">Remove</button>
      </div>
    </div>
  `).join('');
}

async function removeInterest(listingId, btn) {
  if (!confirm('Remove from interests?')) return;
  const res = await apiFetch(`/interests/${listingId}`, { method: 'DELETE' });
  if (res && !res.error) {
    btn.closest('.listing-card').remove();
    const grid = document.getElementById('interests-grid');
    if (!grid.querySelector('.listing-card')) {
      grid.innerHTML = `<div class="empty-state">No interests yet. Browse listings and click "I'm interested"!</div>`;
    }
  } else {
    alert('Failed to remove interest');
  }
}
