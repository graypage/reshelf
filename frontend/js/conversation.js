// ── conversation.js ──────────────────────────────────────────
// TODO: implement functions below when backend is ready

document.addEventListener('DOMContentLoaded', () => {
  // Page initialisation goes here
  console.log('conversation page loaded');
});

function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text) return;
  console.log('Send message:', text);
  // TODO: apiFetch('/messages', { method:'POST', body: JSON.stringify({text}) })
  input.value = '';
}
