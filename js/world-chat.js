// ============================================================
//  WORLD CHAT - PUBLIC CHANNEL
// ============================================================

let worldMessagesCache = [];
let worldChatPollingInterval = null;

function initWorldChat() {
  const worldChatBtn = document.getElementById('sidebar-world-chat');
  if (worldChatBtn) {
    worldChatBtn.addEventListener('click', openWorldChat);
  }
  
  document.getElementById('back-from-world-chat')?.addEventListener('click', closeWorldChat);
  document.getElementById('send-world-message-btn')?.addEventListener('click', sendWorldMessage);
  document.getElementById('world-message-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendWorldMessage();
    }
  });
}

function openWorldChat() {
  document.getElementById('world-chat-screen').classList.remove('hidden');
  document.getElementById('conversations-screen').classList.add('hidden');
  document.getElementById('chat-screen').classList.add('hidden');
  
  loadWorldMessages();
  startWorldChatPolling();
  document.getElementById('world-message-input').focus();
}

function closeWorldChat() {
  document.getElementById('world-chat-screen').classList.add('hidden');
  document.getElementById('conversations-screen').classList.remove('hidden');
  stopWorldChatPolling();
}

async function loadWorldMessages() {
  try {
    const result = await callAPI({ action: 'getWorldMessages' });
    if (result.success) {
      worldMessagesCache = result.messages || [];
      renderWorldMessages();
      scrollWorldToBottom();
    }
  } catch (err) {
    console.error('Failed to load world messages:', err);
  }
}

function renderWorldMessages() {
  const container = document.getElementById('world-messages-container');
  
  if (!worldMessagesCache.length) {
    container.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;color:var(--text-muted);">
        <span class="material-icons-round" style="font-size:52px;margin-bottom:12px;">public</span>
        <p style="font-size:15px;font-weight:600;color:var(--text-secondary);">World Chat</p>
        <p style="font-size:13px;margin-top:4px;">Be the first to say something!</p>
      </div>`;
    return;
  }

  let html = '';
  let lastDate = '';

  worldMessagesCache.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      html += `<div class="message-date-separator"><span>${getDateLabel(msg.timestamp)}</span></div>`;
    }

    const isOutgoing = msg.senderId === currentUser.id;
    const senderName = isOutgoing ? 'You' : (msg.senderName || 'User');
    
    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble">
          <div class="world-message-sender">${escapeHtml(senderName)}</div>
          <div class="world-message-content">${escapeHtml(msg.content).replace(/\n/g, '<br>')}</div>
          <div class="message-time">${formatMessageTime(msg.timestamp)}</div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function sendWorldMessage() {
  const input = document.getElementById('world-message-input');
  const content = input.value.trim();
  if (!content) return;

  input.value = '';
  
  // Optimistic UI
  const tempId = 'temp_world_' + Date.now();
  const tempMsg = {
    id: tempId,
    senderId: currentUser.id,
    senderName: currentUser.name,
    content,
    timestamp: new Date().toISOString(),
    pending: true
  };
  worldMessagesCache.push(tempMsg);
  renderWorldMessages();
  scrollWorldToBottom();

  try {
    const result = await callAPI({
      action: 'sendWorldMessage',
      senderId: currentUser.id,
      senderName: currentUser.name,
      content
    });
    
    if (result.success) {
      const index = worldMessagesCache.findIndex(m => m.id === tempId);
      if (index !== -1) {
        worldMessagesCache[index] = { ...result.message, pending: false };
      }
    } else {
      const index = worldMessagesCache.findIndex(m => m.id === tempId);
      if (index !== -1) worldMessagesCache[index].failed = true;
      toast('Failed to send', 'error');
    }
    renderWorldMessages();
    scrollWorldToBottom();
  } catch (err) {
    console.error('Send world message error:', err);
    const index = worldMessagesCache.findIndex(m => m.id === tempId);
    if (index !== -1) worldMessagesCache[index].failed = true;
    renderWorldMessages();
  }
}

function startWorldChatPolling() {
  stopWorldChatPolling();
  worldChatPollingInterval = setInterval(async () => {
    const result = await callAPI({ action: 'getWorldMessages' });
    if (result.success) {
      const fresh = result.messages || [];
      if (fresh.length > worldMessagesCache.length) {
        worldMessagesCache = fresh;
        renderWorldMessages();
        scrollWorldToBottom();
      }
    }
  }, 2000);
}

function stopWorldChatPolling() {
  if (worldChatPollingInterval) {
    clearInterval(worldChatPollingInterval);
    worldChatPollingInterval = null;
  }
}

function scrollWorldToBottom() {
  requestAnimationFrame(() => {
    const c = document.getElementById('world-messages-container');
    if (c) c.scrollTop = c.scrollHeight;
  });
}

// Initialize on DOM ready
document.addEventListener('DOMContentLoaded', initWorldChat);