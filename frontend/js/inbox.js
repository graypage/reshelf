// ── inbox.js ─────────────────────────────────────────────────────────────────
//
// WHERE THIS FILE IS USED:
//   Loaded by: frontend/pages/inbox.html
//
// WHAT IT DOES:
//   Handles the user inbox page.
//   Fetches all conversation threads, displays the latest message from each,
//   and shows unread indicators for conversations with new messages.
//
// FUNCTIONS AND WHERE THEY'RE CALLED FROM:
//   loadInbox() — called when page loads and every 5 seconds via polling
//
// HOW INBOX WORKS:
//   1. User opens the inbox page
//   2. The script verifies the user is logged in
//   3. loadInbox() requests all message threads from the backend
//   4. Each thread shows the other user, latest message, and timestamp
//   5. Unread conversations display a notification dot
//   6. Polling refreshes the inbox every 5 seconds for updates
// ─────────────────────────────────────────────────────────────────────────────


document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  if (!getCurrentUser()) return; // requireAuth() is redirecting to auth.html — stop here

  loadInbox();
  // Refresh periodically so new messages/threads show up without a manual reload
  setInterval(loadInbox, 5000);
});

// ── loadInbox ────────────────────────────────────────────────────────────────
// Fetches all conversation threads for the current user
// and renders them in the inbox UI.

async function loadInbox() {
  const user = getCurrentUser();
  if (!user) return;

  const res = await apiFetch('/messages');

  const listEl = document.getElementById('thread-list');

  if (!res || res.error) {
    listEl.innerHTML = `<div class="empty-state">Failed to load inbox.</div>`;
    return;
  }

  if (res.length === 0) {
    listEl.innerHTML = `<div class="empty-state">Your inbox is empty.</div>`;
    return;
  }

  let html = '';
  res.forEach(thread => {
    const oUser = thread.otherUser;
    const msg = thread.latestMessage;
    const initial = oUser.name ? oUser.name.charAt(0).toUpperCase() : '?';

    // A thread counts as unread if the latest message was sent TO us (not by us)
    // and is newer than the last time we opened that specific conversation.
    const isFromThem = msg.fromUserId !== user.id;
    const isUnread = isFromThem && msg.timestamp && new Date(msg.timestamp).getTime() > getLastRead(oUser.id);

    html += `
      <div class="thread-item" onclick="window.location.href='conversation.html?id=${oUser.id}'">
        <div class="thread-avatar">${escapeHtml(initial)}</div>
        <div class="thread-body">
          <div class="thread-name">${escapeHtml(oUser.name)}</div>
          <div class="thread-preview">${escapeHtml(msg.text)}</div>
        </div>
        <div class="thread-meta">
          <div class="thread-time">${timeAgo(msg.timestamp)}</div>
          ${msg.listingTitle ? `<div class="thread-listing">${escapeHtml(msg.listingTitle)}</div>` : ''}
          ${isUnread ? `<div class="unread-dot"></div>` : ''}
        </div>
      </div>
    `;
  });

  listEl.innerHTML = html;
}
