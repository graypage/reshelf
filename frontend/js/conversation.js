let currentOtherId = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
  if (!getCurrentUser()) return; // requireAuth() is redirecting to auth.html — stop here

  currentOtherId = getQueryParam('id');
  if (currentOtherId) {
    loadConversation();
    // Poll for new messages every 3 seconds
    pollInterval = setInterval(loadConversation, 3000);
  } else {
    document.getElementById('messages-area').innerHTML = `<div class="empty-state">No conversation selected.</div>`;
  }

  // Allow pressing Enter to send message
  const input = document.getElementById('message-input');
  if (input) {
    input.addEventListener('keypress', function(e) {
      if (e.key === 'Enter') {
        sendMessage();
      }
    });
  }
});

async function loadConversation() {
  const user = getCurrentUser();
  if (!user) return;

  const res = await apiFetch(`/messages/${currentOtherId}`);

  if (!res || res.error) {
    document.getElementById('messages-area').innerHTML = `<div class="empty-state">Error loading conversation.</div>`;
    return;
  }

  const { otherUser, messages } = res;
  document.getElementById('convo-with').textContent = otherUser.name || 'Unknown User';

  // Mark this conversation as "read" now — clears the unread dot in the inbox
  setLastRead(currentOtherId);
  
  // Added by antigravity to populate listing title and view listing link dynamically
  const listingTitleParam = getQueryParam('listingTitle');
  const listingIdParam = getQueryParam('listingId');
  
  // Prioritize URL parameters if the user just clicked "Message seller" from a specific listing
  let activeListingTitle = listingTitleParam;
  let activeListingId = listingIdParam;
  
  // If not in URL (e.g., opened from Inbox), get it from the MOST RECENT message
  if (!activeListingTitle) {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].listingTitle) {
        activeListingTitle = messages[i].listingTitle;
        activeListingId = messages[i].listingId;
        break;
      }
    }
  }

  const infoEl = document.querySelector('.convo-listing-info');
  const viewListingLink = document.getElementById('view-listing-link');

  if (activeListingTitle) {
    document.getElementById('convo-listing').textContent = activeListingTitle;
    if (infoEl) infoEl.style.display = 'block';
  } else {
    if (infoEl) infoEl.style.display = 'none';
  }

  if (activeListingId && viewListingLink) {
    viewListingLink.href = `listing.html?id=${activeListingId}`;
    viewListingLink.style.display = 'inline';
  } else if (viewListingLink) {
    viewListingLink.style.display = 'none';
  }

  const area = document.getElementById('messages-area');
  
  // To prevent scrolling issues during polling, only auto-scroll if we are already at the bottom
  // or if it's the first load
  const isScrolledToBottom = area.scrollHeight - area.clientHeight <= area.scrollTop + 50;
  const isFirstLoad = area.innerHTML.trim() === '';

  // Added by antigravity to prefill the message input if we came from a specific listing
  const listingTitle = getQueryParam('listingTitle');
  if (messages.length === 0 && listingTitle && isFirstLoad) {
    const input = document.getElementById('message-input');
    if (input && !input.value) {
      input.value = `Hi, I'm interested in your listing "${listingTitle}".`;
    }
  }

  if (messages.length === 0) {
    area.innerHTML = `<div class="empty-state">No messages yet. Send a message to start!</div>`;
    return;
  }

  let html = '';
  messages.forEach(msg => {
    const isMine = msg.fromUserId === user.id;
    const typeClass = isMine ? 'mine' : 'theirs';
    
    const d = new Date(msg.timestamp);
    const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    html += `
      <div class="message ${typeClass}">
        <div>
          <div class="message-bubble">${escapeHtml(msg.text)}</div>
          <div class="message-time">${timeStr}</div>
        </div>
      </div>
    `;
  });

  area.innerHTML = html;
  
  if (isFirstLoad || isScrolledToBottom) {
    area.scrollTop = area.scrollHeight;
  }
}

async function sendMessage() {
  const input = document.getElementById('message-input');
  const text = input.value.trim();
  if (!text || !currentOtherId) return;

  const user = getCurrentUser();
  input.value = '';

  // Added by antigravity to pass listing info with the message
  const listingId = getQueryParam('listingId');
  const listingTitle = getQueryParam('listingTitle');

  const res = await apiFetch('/messages', {
    method: 'POST',
    body: JSON.stringify({
      toUserId: currentOtherId,
      text: text,
      listingId: listingId || null,
      listingTitle: listingTitle || null
    })
  });

  if (res && !res.error) {
    loadConversation();
    setTimeout(() => {
      const area = document.getElementById('messages-area');
      area.scrollTop = area.scrollHeight;
    }, 50);
  } else {
    alert("Failed to send message");
  }
}
