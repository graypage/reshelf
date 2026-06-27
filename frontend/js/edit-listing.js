// ── edit-listing.js ───────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/edit-listing.html
//
// WHAT IT DOES:
//   1. Checks the user is logged in (redirects to auth.html if not)
//   2. Reads the listing ID from the URL (?id=…)
//   3. Fetches the listing from GET /api/listings/:id and pre-fills every field
//   4. Wires up image upload/replace/remove controls
//      - If the listing already has an image, shows it in the preview immediately
//      - "Change photo" lets the seller pick a new file
//      - "Remove photo" clears the image entirely
//   5. handleSave()      — sends updated fields (including new image) to PUT /api/listings/:id
//   6. handleMarkSold()  — PATCHes status to 'sold'
//   7. handleDelete()    — DELETEs the listing
// ─────────────────────────────────────────────────────────────────────────────

requireAuth();

let currentListingId = null;

// Tracks the image to be saved:
//   - undefined → not yet loaded (initial state, don't touch the image field)
//   - string    → either the original URL or a new base64 data-URL
//   - null      → seller removed the image; send null to the backend
let currentImage = undefined;

document.addEventListener('DOMContentLoaded', async () => {
  currentListingId = getQueryParam('id');
  if (!currentListingId) {
    alert('No listing specified.');
    window.location.href = 'my-listings.html';
    return;
  }

  await loadListing();
  wireImageControls();
});

// ── loadListing ───────────────────────────────────────────────────────────────
// Fetches the listing from the backend and populates every form field.
// Also populates the image preview if the listing already has an image.
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

  // Populate text/number fields
  document.getElementById('title').value       = listing.title       || '';
  document.getElementById('author').value      = listing.author      || '';
  document.getElementById('isbn').value        = listing.isbn        || '';
  document.getElementById('price').value       = listing.price       || '';
  document.getElementById('description').value = listing.description || '';

  // Populate select fields
  setSelectValue('uni',       listing.university);
  setSelectValue('type',      listing.type);
  setSelectValue('condition', listing.condition);

  // Subject is now a free-text input (consistent with create-listing)
  const subjectEl = document.getElementById('subject');
  if (subjectEl) subjectEl.value = listing.subject || '';

  // ── Image ──────────────────────────────────────────────────────────────────
  // If the listing has an image, show it immediately.
  currentImage = listing.image || null;
  if (currentImage) {
    showPreview(currentImage);
  }
}

// ── wireImageControls ─────────────────────────────────────────────────────────
// Attaches event listeners to the image upload, replace, and remove controls.
function wireImageControls() {
  const uploadArea     = document.getElementById('upload-area');
  const imageInput     = document.getElementById('image-input');       // initial upload input
  const replaceInput   = document.getElementById('image-replace-input'); // "Change photo" input
  const removeBtn      = document.getElementById('remove-image');

  // ── Initial upload ──
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;
    readAndShowImage(file, imageInput);
  });

  // ── Replace existing image ──
  replaceInput.addEventListener('change', () => {
    const file = replaceInput.files[0];
    if (!file) return;
    readAndShowImage(file, replaceInput);
  });

  // ── Remove image ──
  removeBtn.addEventListener('click', () => {
    currentImage = null;
    imageInput.value    = '';
    replaceInput.value  = '';
    document.getElementById('image-preview').src = '';
    document.getElementById('preview-wrap').style.display = 'none';
    uploadArea.style.display = 'block';
  });
}

// ── readAndShowImage ──────────────────────────────────────────────────────────
// Validates a File, converts it to base64, stores it in currentImage,
// and updates the preview. inputEl is cleared on failure.
function readAndShowImage(file, inputEl) {
  if (!file.type.startsWith('image/')) {
    alert('Please select an image file (JPG, PNG, WEBP…)');
    inputEl.value = '';
    return;
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Image must be under 5 MB.');
    inputEl.value = '';
    return;
  }

  const reader = new FileReader();
  reader.onload = (e) => {
    currentImage = e.target.result; // base64 data-URL
    showPreview(currentImage);
  };
  reader.readAsDataURL(file);
}

// ── showPreview ───────────────────────────────────────────────────────────────
// Displays the given image URL/base64 in the preview area and hides the upload zone.
function showPreview(src) {
  document.getElementById('image-preview').src       = src;
  document.getElementById('preview-wrap').style.display = 'block';
  document.getElementById('upload-area').style.display  = 'none';
}

// ── setSelectValue ────────────────────────────────────────────────────────────
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

// ── handleSave ────────────────────────────────────────────────────────────────
// Reads all form fields + the current image state and sends them to the backend.
async function handleSave() {
  const title       = document.getElementById('title').value.trim();
  const author      = document.getElementById('author').value.trim();
  const isbn        = document.getElementById('isbn').value.trim();
  const university  = document.getElementById('uni').value;
  const subject     = document.getElementById('subject').value.trim();
  const type        = document.getElementById('type').value;
  const price       = document.getElementById('price').value;
  const condition   = document.getElementById('condition').value;
  const description = document.getElementById('description').value.trim();

  if (!title) { alert('Title is required'); return; }
  if (!price) { alert('Price is required'); return; }

  const res = await apiFetch(`/listings/${currentListingId}`, {
    method: 'PUT',
    body: JSON.stringify({
      title, author, isbn, university, subject, type, price, condition, description,
      // currentImage is either a base64 string (new/existing) or null (removed)
      image: currentImage
    })
  });

  if (!res || res.error) {
    alert(res?.error || 'Failed to save changes');
    return;
  }

  alert('Listing updated!');
  window.location.href = `listing.html?id=${currentListingId}`;
}

// ── handleMarkSold ────────────────────────────────────────────────────────────
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

// ── handleDelete ──────────────────────────────────────────────────────────────
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
