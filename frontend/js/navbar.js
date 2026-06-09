// Detect if current page is at root or inside frontend/pages/
const inPages = window.location.pathname.includes('/pages/');
const toRoot  = inPages ? '../../' : '';
const toPages = inPages ? '' : 'frontend/pages/';

const navbarHTML = `
<nav class="navbar">
  <div class="container">
    <a class="nav-brand" href="${toRoot}index.html">re.shelf</a>
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
      <a href="${toPages}profile.html" class="btn btn-primary">${user.name}</a>
    `;
  } else {
    area.innerHTML = `<a href="${toPages}auth.html" class="btn btn-primary">Log in</a>`;
  }
}
