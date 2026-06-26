// ── listing.js ──────────────────────────────────────────

// Added by antigravity: mock data until backend is ready
const MOCK_LISTINGS = {
  '1': {
    title: 'Calculus: Early Transcendentals',
    price: 'AED 80',
    uni: 'AUS',
    subject: 'Engineering',
    type: 'Textbook',
    status: 'Active',
    desc: 'Good condition, minimal highlights. Used for one semester only. Includes all original pages.',
    sellerName: 'Ahmed K.',
    sellerLocation: 'Sharjah area',
    sellerId: '1'
  },
  '2': {
    title: 'Principles of Marketing',
    price: 'AED 60',
    uni: 'UOS',
    subject: 'Business',
    type: 'Textbook',
    status: 'Dead listing',
    desc: 'Slightly worn cover, but pages are intact. Great for the intro business course.',
    sellerName: 'Sara M.',
    sellerLocation: 'Dubai area',
    sellerId: '2'
  },
  '3': {
    title: 'Organic Chemistry Notes',
    price: 'AED 30',
    uni: 'KU',
    subject: 'Medicine',
    type: 'Notes',
    status: 'Active',
    desc: 'Comprehensive handwritten notes covering the entire syllabus. Very neat and legible.',
    sellerName: 'Ali R.',
    sellerLocation: 'Abu Dhabi area',
    sellerId: '3'
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // Page initialisation goes here
  console.log('listing page loaded');

  // Added by antigravity to populate listing based on id
  const id = new URLSearchParams(window.location.search).get('id');
  const listing = MOCK_LISTINGS[id];
  
  if (listing) {
    document.getElementById('listing-title').innerText = listing.title;
    document.getElementById('listing-price').innerText = listing.price;
    document.getElementById('listing-uni').innerText = listing.uni;
    document.getElementById('listing-subject').innerText = listing.subject;
    document.getElementById('listing-type').innerText = listing.type;
    document.getElementById('listing-desc').innerText = listing.desc;
    
    // Update status tag
    const tag = document.querySelector('.listing-info .tag');
    if (tag) {
      tag.innerText = listing.status;
      if (listing.status === 'Active') {
        tag.className = 'tag tag-active';
      } else {
        tag.className = 'tag tag-dead';
      }
    }
    
    // Update seller info
    const sellerLink = document.getElementById('seller-name');
    if (sellerLink) {
      sellerLink.innerText = listing.sellerName;
      sellerLink.href = `profile.html?id=${listing.sellerId}`;
      const sellerMeta = sellerLink.nextElementSibling;
      if (sellerMeta) {
        sellerMeta.innerText = `${listing.sellerLocation} · Member since 2024`;
      }
    }
  } else if (id) {
    document.getElementById('listing-title').innerText = 'Listing not found';
    document.getElementById('listing-desc').innerText = '';
  }
});

// Function modified by antigravity to pass seller and listing details to conversation page
function handleMessage() {
  // Extract seller ID from the seller link href
  const sellerLink = document.getElementById('seller-name');
  let sellerId = '1'; // Default
  if (sellerLink && sellerLink.href) {
    const url = new URL(sellerLink.href);
    sellerId = url.searchParams.get('id') || '1';
  }

  // Extract listing title
  const titleEl = document.getElementById('listing-title');
  const listingTitle = titleEl ? titleEl.innerText : '';

  // Extract listing ID from current URL
  const listingId = new URLSearchParams(window.location.search).get('id') || '1';

  // Construct URL with query parameters
  const targetUrl = new URL('conversation.html', window.location.href);
  targetUrl.searchParams.set('id', sellerId);
  targetUrl.searchParams.set('listingId', listingId);
  if (listingTitle) {
    targetUrl.searchParams.set('listingTitle', listingTitle);
  }

  // Redirect to conversation page
  window.location.href = targetUrl.toString();
}
