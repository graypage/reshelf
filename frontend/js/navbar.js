const navbarHTML = `
<nav class="navbar">
  <div class="container">
    <a class="nav-brand" href="../pages/index.html">re.shelf</a>
    <div class="nav-links">
      <a href="../pages/index.html">Browse</a>
      <a href="../pages/about.html">About</a>
      <a href="../pages/faq.html">FAQ</a>
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
      <a href="../pages/inbox.html" class="btn btn-outline">Inbox</a>
      <a href="../pages/profile.html" class="btn btn-primary">${user.name}</a>
    `;
  } else {
    area.innerHTML = `<a href="../pages/auth.html" class="btn btn-primary">Log in</a>`;
  }
}
