// ── index.js ──────────────────────────────────────────
// TODO: implement functions below when backend is ready

document.addEventListener('DOMContentLoaded', () => {
  // Page initialisation goes here
  console.log('index page loaded');
});

function handleSearch() {
  const query = document.getElementById('search-input').value;
  console.log('Search:', query);
  // TODO: apiFetch('/search?q=' + query) then render results
}

function toggleAdvanced() {
  const panel = document.getElementById('advanced-filters');
  panel.classList.toggle('open');
}
