// ── my-listings.js ──────────────────────────────────────────
// TODO: implement functions below when backend is ready

document.addEventListener('DOMContentLoaded', () => {
  // Page initialisation goes here
  console.log('my-listings page loaded');
});

function switchTab(name) {
  document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
  document.querySelectorAll('.tab-panel').forEach(p => p.classList.remove('active'));
  event.target.classList.add('active');
  document.getElementById('tab-' + name).classList.add('active');
}
