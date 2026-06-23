let currentOtherId = null;
let pollInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  requireAuth();
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
  const res = await apiFetch(`/messages/${currentOtherId}`, {
    headers: { 'X-User-Email': user.email }
  });

  if (!res || res.error) {
    document.getElementById('messages-area').innerHTML = `<div class="empty-state">Error loading conversation.</div>`;
    return;
  }

  const { otherUser, messages } = res;
  document.getElementById('convo-with').textContent = otherUser.name || 'Unknown User';
  
  const area = document.getElementById('messages-area');
  
  // To prevent scrolling issues during polling, only auto-scroll if we are already at the bottom
  // or if it's the first load
  const isScrolledToBottom = area.scrollHeight - area.clientHeight <= area.scrollTop + 50;
  const isFirstLoad = area.innerHTML.trim() === '';

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
          <div class="message-bubble">${msg.text}</div>
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

  const res = await apiFetch('/messages', {
    method: 'POST',
    headers: { 'X-User-Email': user.email },
    body: JSON.stringify({
      toUserId: currentOtherId,
      text: text
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
