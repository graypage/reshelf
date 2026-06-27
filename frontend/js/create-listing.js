// ── create-listing.js ────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/create-listing.html
//
// WHAT IT DOES:
//   1. Checks the user is logged in (redirects to auth.html if not)
//   2. Fetches the user's profile from GET /api/profile and pre-fills
//      their university in the university dropdown
//   3. handleCreateListing() is called when the "Post listing" button is clicked —
//      it reads all the form fields and sends them to POST /api/listings
//
// WHERE handleCreateListing() IS CALLED FROM:
//   The "Post listing" button in create-listing.html:
//   <button onclick="handleCreateListing()">Post listing</button>
// ─────────────────────────────────────────────────────────────────────────────

// requireAuth() is in utils.js — if the user isn't logged in it immediately
// redirects them to auth.html so they can't access this page without an account
requireAuth();

document.addEventListener('DOMContentLoaded', async () => {

  // Fetch the logged-in user's profile so we can pre-fill their university.
  // apiFetch automatically sends their email in the header so the server
  // knows who is asking.
  const profile = await apiFetch('/profile');

  if (profile && !profile.error && profile.university) {
    // Find the matching <option> in the university dropdown and select it
    const uniSelect = document.getElementById('uni');
    for (const opt of uniSelect.options) {
      if (opt.value === profile.university || opt.text === profile.university) {
        uniSelect.value = opt.value;
        break;
      }
    }
  }
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

  // POST to /api/listings — the backend creates the listing in listings.json
  // and returns the newly created listing object
  const res = await apiFetch('/listings', {
    method: 'POST',
    body: JSON.stringify({ title, author, isbn, university, subject, type, price, condition, description })
  });

  if (!res || res.error) {
    alert(res?.error || 'Failed to create listing. Please try again.');
    return;
  }

  // Success — redirect to the homepage where the new listing will appear
  alert('Listing posted!');
  window.location.href = '../../index.html';
}
