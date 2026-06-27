// Detect if current page is at root or inside frontend/pages/
const inPages = window.location.pathname.includes('/pages/');
const toRoot  = inPages ? '../../' : '';  // If in pages, links to other pages should go up one level
const toPages = inPages ? '' : 'frontend/pages/';

const navbarHTML = `
<nav class="navbar">
  <div class="container">
  
    <a class="nav-brand" href="${toRoot}index.html">
  <img src="/frontend/assets/images/reshelf_logo.png" alt="Reshelf Logo">
  <span class="nav-brand-name">Reshelf</span>
</a>
    <div class="nav-links">
      <a href="${toRoot}index.html">Browse</a>
      <a href="${toPages}about.html">About</a>
      <a href="${toPages}faq.html">FAQ</a>
    </div>
    <div class="nav-auth" id="nav-auth-area"></div>
  </div>
</nav>
`;

document.addEventListener('DOMContentLoaded', () => {
  const el = document.getElementById('navbar');
  if (el) {
    el.innerHTML = navbarHTML;
    updateNavAuth();
  }
});

function updateNavAuth() {
  const area = document.getElementById('nav-auth-area');
  if (!area) return;
  const user = getCurrentUser();
  if (user) {
    area.innerHTML = `
      <a href="${toPages}inbox.html" class="btn btn-outline">Inbox</a>
      <a href="${toPages}interests.html" class="btn btn-outline">Interests</a>
      <a href="${toPages}my-listings.html" class="btn btn-outline">My listings</a>
      <a href="${toPages}create-listing.html" class="btn btn-outline">+ List item</a>
      <a href="${toPages}settings.html" class="btn btn-primary">
        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></svg>
        ${user.name}
      </a>
      <button onclick="handleLogout()" class="btn btn-outline" style="margin-left: 8px;">Log out</button>
    `;
  } else {
    area.innerHTML = `<a href="${toPages}auth.html" class="btn btn-primary">
      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align: middle; margin-right: 4px;"><path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4"></path><polyline points="10 17 15 12 10 7"></polyline><line x1="15" y1="12" x2="3" y2="12"></line></svg>
      Log in
    </a>`;
  }
}

function handleLogout() {
  clearCurrentUser();
  window.location.href = window.location.pathname.includes('/pages/') ? '../../index.html' : 'index.html';
}
