document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  loadInbox();
});

async function loadInbox() {
  const user = getCurrentUser();
  if (!user) return;
  
  const res = await apiFetch('/messages', {
    headers: { 'X-User-Email': user.email }
  });

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
    
    html += `
      <div class="thread-item" onclick="window.location.href='conversation.html?id=${oUser.id}'">
        <div class="thread-avatar">${initial}</div>
        <div class="thread-body">
          <div class="thread-name">${oUser.name}</div>
          <div class="thread-preview">${msg.text}</div>
        </div>
        <div class="thread-meta">
          <div class="thread-time">${timeAgo(msg.timestamp)}</div>
          ${msg.listingTitle ? `<div class="thread-listing">${msg.listingTitle}</div>` : ''}
        </div>
      </div>
    `;
  });
  
  listEl.innerHTML = html;
}
