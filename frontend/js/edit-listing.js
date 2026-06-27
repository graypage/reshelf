requireAuth();

let currentListingId = null;

document.addEventListener('DOMContentLoaded', async () => {
  currentListingId = getQueryParam('id');
  if (!currentListingId) {
    alert('No listing specified.');
    window.location.href = 'my-listings.html';
    return;
  }
  await loadListing();
});

async function loadListing() {
  const listing = await apiFetch(`/listings/${currentListingId}`);
  if (!listing || listing.error) {
    alert('Listing not found.');
    window.location.href = 'my-listings.html';
    return;
  }

  const user = getCurrentUser();
  if (listing.sellerId !== user.id) {
    alert('You do not own this listing.');
    window.location.href = 'my-listings.html';
    return;
  }

  document.getElementById('title').value       = listing.title || '';
  document.getElementById('author').value      = listing.author || '';
  document.getElementById('isbn').value        = listing.isbn || '';
  document.getElementById('price').value       = listing.price || '';
  document.getElementById('description').value = listing.description || '';

  setSelectValue('uni',       listing.university);
  setSelectValue('subject',   listing.subject);
  setSelectValue('type',      listing.type);
  setSelectValue('condition', listing.condition);
}

function setSelectValue(id, value) {
  const el = document.getElementById(id);
  if (!el || !value) return;
  for (const opt of el.options) {
    if (opt.value === value || opt.text === value) {
      el.value = opt.value;
      break;
    }
  }
}

async function handleSave() {
  const title       = document.getElementById('title').value.trim();
  const author      = document.getElementById('author').value.trim();
  const isbn        = document.getElementById('isbn').value.trim();
  const university  = document.getElementById('uni').value;
  const subject     = document.getElementById('subject').value;
  const type        = document.getElementById('type').value;
  const price       = document.getElementById('price').value;
  const condition   = document.getElementById('condition').value;
  const description = document.getElementById('description').value.trim();

  if (!title) { alert('Title is required'); return; }
  if (!price)  { alert('Price is required'); return; }

  const res = await apiFetch(`/listings/${currentListingId}`, {
    method: 'PUT',
    body: JSON.stringify({ title, author, isbn, university, subject, type, price, condition, description })
  });

  if (!res || res.error) {
    alert(res?.error || 'Failed to save changes');
    return;
  }

  alert('Listing updated!');
  window.location.href = `listing.html?id=${currentListingId}`;
}

async function handleMarkSold() {
  if (!confirm('Mark this listing as sold?')) return;

  const res = await apiFetch(`/listings/${currentListingId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'sold' })
  });

  if (!res || res.error) {
    alert(res?.error || 'Failed to update status');
    return;
  }

  alert('Listing marked as sold.');
  window.location.href = 'my-listings.html';
}

async function handleDelete() {
  if (!confirm('Are you sure you want to permanently delete this listing?')) return;

  const res = await apiFetch(`/listings/${currentListingId}`, { method: 'DELETE' });

  if (!res || res.error) {
    alert(res?.error || 'Failed to delete listing');
    return;
  }

  alert('Listing deleted.');
  window.location.href = 'my-listings.html';
}
