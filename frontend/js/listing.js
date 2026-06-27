// ── listing.js ───────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/listing.html
//
// WHAT IT DOES:
//   1. On page load, reads the listing ID from the URL (?id=5)
//   2. Fetches that listing from GET /api/listings/:id
//   3. Fills in every empty element in listing.html with real data
//   4. Builds the action buttons dynamically (so they always have
//      the listing data ready — no race condition)
//
// FUNCTIONS IN THIS FILE:
//   handleInterested(listing, btn) — called when "I'm interested" is clicked
//   handleMessage(listing)         — called when "Message seller" is clicked
//
// NOTE: There are no onclick= attributes in listing.html for these buttons.
// The buttons are created in JS below and get their click handlers attached
// directly. This means the listing data is always available when clicked.
// ─────────────────────────────────────────────────────────────────────────────

document.addEventListener('DOMContentLoaded', async () => {

  // Step 1: Get the listing ID from the URL, e.g. listing.html?id=3 → "3"
  const id = getQueryParam('id');
  if (!id) {
    document.getElementById('listing-title').innerText = 'No listing specified.';
    return;
  }

  // Step 2: Fetch the listing from the backend API
  // apiFetch is defined in utils.js and automatically adds the auth header
  const listing = await apiFetch(`/listings/${id}`);

  // If the listing doesn't exist or the server returned an error, show a message
  if (!listing || listing.error) {
    document.getElementById('listing-title').innerText = 'Listing not found.';
    return;
  }

  // Step 3: Fill in all the text fields with real data from the API response

  document.getElementById('listing-title').innerText = listing.title;
  document.getElementById('listing-price').innerText = 'AED ' + parseFloat(listing.price).toFixed(2);
  document.getElementById('listing-uni').innerText     = listing.university || '—';
  document.getElementById('listing-subject').innerText = listing.subject    || '—';
  document.getElementById('listing-type').innerText    = listing.type       || '—';
  document.getElementById('listing-desc').innerText    = listing.description || '';

  // timeAgo() is defined in utils.js — converts ISO date to "3 days ago" etc.
  const dateEl = document.getElementById('listing-date');
  if (dateEl) dateEl.innerText = 'Posted ' + timeAgo(listing.createdAt);

  // Status tag: "Active" shown in green, anything else shown in grey
  const tag = document.getElementById('listing-status-tag');
  if (tag) {
    if (listing.status === 'active') {
      tag.innerText   = 'Active';
      tag.className   = 'tag tag-active';
    } else {
      tag.innerText   = 'Sold';
      tag.className   = 'tag tag-dead';
    }
  }

  // Seller info: link to their profile page, and show their join date
  const sellerLink = document.getElementById('seller-name');
  if (sellerLink) {
    sellerLink.innerText = listing.sellerName || 'Unknown';
    sellerLink.href      = `profile.html?id=${listing.sellerId}`;
  }
  const sellerMeta = document.getElementById('seller-meta');
  if (sellerMeta) {
    sellerMeta.innerText = listing.sellerJoined ? `Member since ${listing.sellerJoined}` : '';
  }

  // If the listing has an image URL, show it; otherwise keep the placeholder text
  if (listing.image) {
    const imgEl = document.getElementById('listing-image');
    imgEl.innerHTML = `<img src="${listing.image}" alt="${listing.title}" style="width:100%;height:100%;object-fit:cover;border-radius:var(--radius);">`;
  }

  // Step 4: Build the action buttons now that we have the listing data.
  //
  // We build these in JS (not in HTML) so that handleInterested() and
  // handleMessage() always have access to the listing object when clicked.
  // If the buttons were hardcoded in HTML with onclick="handleMessage()",
  // clicking them before the API finished loading would do nothing.
  //
  // getCurrentUser() is defined in utils.js — reads the logged-in user from localStorage
  const user = getCurrentUser();
  const actionButtons = document.getElementById('action-buttons');

  if (user && listing.sellerId === user.id) {
    // The logged-in user owns this listing — show an Edit button instead
    actionButtons.innerHTML = `<a href="edit-listing.html?id=${listing.id}" class="btn btn-primary">Edit listing</a>`;

  } else if (listing.status !== 'active') {
    // The listing has been sold — hide the action buttons
    actionButtons.innerHTML = `<p style="color:var(--text-muted);font-size:14px;">This listing is no longer available.</p>`;

  } else {
    // Normal view: show "I'm interested" and "Message seller" buttons

    // Create the "I'm interested" button and attach its click handler
    const intBtn = document.createElement('button');
    intBtn.className = 'btn btn-primary';
    intBtn.id        = 'btn-interested';
    intBtn.innerText = "I'm interested";
    intBtn.addEventListener('click', () => handleInterested(listing, intBtn));

    // Create the "Message seller" button and attach its click handler
    const msgBtn = document.createElement('button');
    msgBtn.className = 'btn btn-outline';
    msgBtn.innerText = 'Message seller';
    msgBtn.addEventListener('click', () => handleMessage(listing));

    actionButtons.appendChild(intBtn);
    actionButtons.appendChild(msgBtn);

    // If the user is logged in, check whether they've already marked interest
    // so we can disable the button straight away
    if (user) {
      const interestRes = await apiFetch(`/interests/${listing.id}`);
      if (interestRes && interestRes.interested) {
        intBtn.innerText  = '✓ Interested';
        intBtn.disabled   = true;
      }
    }
  }
});

// ── handleInterested ─────────────────────────────────────────────────────────
// Called when the "I'm interested" button is clicked.
// Receives the listing object and the button element directly —
// no need to read from a global variable.
async function handleInterested(listing, btn) {

  // If not logged in, send the user to the login page
  if (!isLoggedIn()) {
    window.location.href = 'auth.html';
    return;
  }

  // POST to /api/interests with the listing ID
  // The backend uses the x-user-email header (added by apiFetch) to know who is interested
  const res = await apiFetch('/interests', {
    method: 'POST',
    body: JSON.stringify({ listingId: listing.id })
  });

  if (res && !res.error) {
    // Disable the button so it can't be clicked again
    btn.innerText = '✓ Interested';
    btn.disabled  = true;
  } else {
    alert(res?.error || 'Failed to mark interest. Please try again.');
  }
}

// ── handleMessage ─────────────────────────────────────────────────────────────
// Called when the "Message seller" button is clicked.
// Redirects to the conversation page, passing the seller ID and listing details
// in the URL so the conversation page knows the context.
function handleMessage(listing) {

  // If not logged in, send the user to the login page
  if (!isLoggedIn()) {
    window.location.href = 'auth.html';
    return;
  }

  // Build the URL for the conversation page with all the context it needs:
  //   ?id           = the seller's user ID (so we open the right conversation)
  //   ?listingId    = this listing's ID (shown in the conversation header)
  //   ?listingTitle = the listing title (shown in the conversation header)
  const url = new URL('conversation.html', window.location.href);
  url.searchParams.set('id',           listing.sellerId);
  url.searchParams.set('listingId',    listing.id);
  url.searchParams.set('listingTitle', listing.title);

  window.location.href = url.toString();
}
