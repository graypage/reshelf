// ── create-listing.js ────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/create-listing.html
//
// WHAT IT DOES:
//   1. Checks the user is logged in (redirects to auth.html if not)
//   2. Fetches the user's profile from GET /api/profile and pre-fills
//      their university in the university dropdown
//   3. Wires up the image upload/preview/remove controls
//   4. handleCreateListing() is called when the "Post listing" button is clicked —
//      it reads all the form fields (including the selected image as base64)
//      and sends them to POST /api/listings
//
// WHERE handleCreateListing() IS CALLED FROM:
//   The "Post listing" button in create-listing.html:
//   <button onclick="handleCreateListing()">Post listing</button>
// ─────────────────────────────────────────────────────────────────────────────

requireAuth();

// Holds the base64 data-URL of the chosen image, or null if none was selected.
let selectedImageBase64 = null;

document.addEventListener('DOMContentLoaded', async () => {

  // ── Pre-fill university from profile ──────────────────────────────────────
  const profile = await apiFetch('/profile');
  if (profile && !profile.error && profile.university) {
    const uniSelect = document.getElementById('uni');
    for (const opt of uniSelect.options) {
      if (opt.value === profile.university || opt.text === profile.university) {
        uniSelect.value = opt.value;
        break;
      }
    }
  }

  // ── Image upload wiring ───────────────────────────────────────────────────
  const imageInput  = document.getElementById('image-input');
  const uploadArea  = document.getElementById('upload-area');
  const previewWrap = document.getElementById('preview-wrap');
  const previewImg  = document.getElementById('image-preview');
  const removeBtn   = document.getElementById('remove-image');

  // When a file is chosen, validate it, read it as base64, show the preview
  imageInput.addEventListener('change', () => {
    const file = imageInput.files[0];
    if (!file) return;

    // Guard: images only, max 5 MB
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file (JPG, PNG, WEBP…)');
      imageInput.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be under 5 MB.');
      imageInput.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      selectedImageBase64 = e.target.result; // data:image/jpeg;base64,...
      previewImg.src = selectedImageBase64;
      uploadArea.style.display  = 'none';
      previewWrap.style.display = 'block';
    };
    reader.readAsDataURL(file);
  });

  // "✕" button clears the chosen image and shows the upload area again
  removeBtn.addEventListener('click', () => {
    selectedImageBase64 = null;
    imageInput.value    = '';
    previewImg.src      = '';
    previewWrap.style.display = 'none';
    uploadArea.style.display  = 'block';
  });
});

// ── handleCreateListing ───────────────────────────────────────────────────────
// Called by the "Post listing" button in create-listing.html.
// Reads every form field, validates required ones, and sends the data
// to the backend. On success, redirects to the homepage.
async function handleCreateListing() {

  // Read all form field values
  const title       = document.getElementById('title').value.trim();
  const author      = document.getElementById('author').value.trim();
  const isbn        = document.getElementById('isbn').value.trim();
  const university  = document.getElementById('uni').value;
  const subject     = document.getElementById('subject').value.trim();
  const type        = document.getElementById('type').value;
  const price       = document.getElementById('price').value;
  const condition   = document.getElementById('condition').value;
  const description = document.getElementById('description').value.trim();

  // Validate required fields before sending to the server
  if (!title)      { alert('Please enter a title'); return; }
  if (!price)      { alert('Please enter a price'); return; }
  if (!university) { alert('Please select a university'); return; }

  // POST to /api/listings — include the image as a base64 string if one was chosen.
  // The backend stores whatever is passed as `image` on the listing object.
  const res = await apiFetch('/listings', {
    method: 'POST',
    body: JSON.stringify({
      title, author, isbn, university, subject, type, price, condition, description,
      image: selectedImageBase64 || null
    })
  });

  if (!res || res.error) {
    alert(res?.error || 'Failed to create listing. Please try again.');
    return;
  }

  alert('Listing posted!');
  window.location.href = '../../index.html';
}
