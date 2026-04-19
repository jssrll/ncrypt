// ============================================================
//  MESSAGING - MOBILE OPTIMIZED
// ============================================================

function initializeMessenger() {
  if (!currentUser) return;
  
  updateSidebarUserInfo();
  loadConversations();
  setupMessengerEvents();
  startMessagePolling();
  
  initProfile();
  initSettings();
}

function updateSidebarUserInfo() {
  // No sidebar user info anymore - removed
}

function loadConversations() {
  getConversations().then(result => {
    if (result.success) {
      conversations = result.conversations || [];
      renderConversationsList();
    }
  });
}

function renderConversationsList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  
  if (!conversations.length) {
    container.innerHTML = `
      <div style="padding:32px 16px;text-align:center;">
        <span class="material-icons-round" style="font-size:48px;color:var(--text-muted);margin-bottom:12px;">chat</span>
        <p style="color:var(--text-secondary);">No conversations</p>
        <p style="color:var(--text-muted);font-size:12px;margin-top:4px;">Search to start chatting</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = conversations.map(conv => {
    const other = conv.otherUser || {};
    const last = conv.lastMessage || {};
    
    return `
      <div class="conversation-item" data-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(other.name)}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(last.content || '')}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${formatDate(last.timestamp)}</span>
          ${conv.unreadCount ? `<span class="conv-unread">${conv.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  container.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = conversations.find(c => c.conversationId === item.dataset.id);
      if (conv) openConversation(conv);
    });
  });
}

// Cache for instant loading
const messageCache = new Map();

function openConversation(conversation) {
  activeConversation = conversation;
  
  // Update header
  const other = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(other.name);
  document.getElementById('chat-name').textContent = other.name || 'Unknown';
  
  // Check cache first
  if (messageCache.has(conversation.conversationId)) {
    renderMessagesFromCache(conversation.conversationId);
  } else {
    loadMessages(conversation.conversationId);
  }
  
  // Navigate to chat screen
  document.getElementById('conversations-screen').classList.add('hidden');
  document.getElementById('chat-screen').classList.remove('hidden');
  document.getElementById('message-input').focus();
}

function renderMessagesFromCache(conversationId) {
  const messages = messageCache.get(conversationId) || [];
  renderMessagesArray(messages);
}

function loadMessages(conversationId) {
  getMessages(conversationId).then(result => {
    if (result.success) {
      messageCache.set(conversationId, result.messages || []);
      renderMessagesArray(result.messages || []);
    }
  });
}

function renderMessagesArray(messages) {
  const container = document.getElementById('messages-container');
  
  if (!messages.length) {
    container.innerHTML = `
      <div style="text-align:center;padding:40px;color:var(--text-muted);">
        <span class="material-icons-round" style="font-size:48px;margin-bottom:12px;">chat_bubble_outline</span>
        <p>Say hello! 👋</p>
      </div>
    `;
    return;
  }
  
  let html = '';
  let lastDate = '';
  
  messages.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let label = msgDate === today ? 'Today' : msgDate === yesterday ? 'Yesterday' : 
        new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      html += `<div class="message-date-separator"><span>${label}</span></div>`;
    }
    
    const isOutgoing = msg.senderId === currentUser.id;
    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble">
          ${escapeHtml(msg.content)}
          <div class="message-time">${formatMessageTime(msg.timestamp)}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  setTimeout(() => container.scrollTop = container.scrollHeight, 50);
}

function handleSendMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content || !activeConversation) return;
  
  input.value = '';
  
  // Optimistic update
  const tempMsg = {
    id: 'temp_' + Date.now(),
    conversationId: activeConversation.conversationId,
    senderId: currentUser.id,
    content: content,
    timestamp: new Date().toISOString()
  };
  
  const cached = messageCache.get(activeConversation.conversationId) || [];
  cached.push(tempMsg);
  messageCache.set(activeConversation.conversationId, cached);
  renderMessagesArray(cached);
  
  // Update conversation list
  const conv = conversations.find(c => c.conversationId === activeConversation.conversationId);
  if (conv) {
    conv.lastMessage = { content, timestamp: new Date().toISOString() };
    renderConversationsList();
  }
  
  // Send to server
  sendMessage(activeConversation.conversationId, content).then(result => {
    if (result.success) {
      const idx = cached.findIndex(m => m.id === tempMsg.id);
      if (idx !== -1) cached[idx] = result.message;
      messageCache.set(activeConversation.conversationId, cached);
      renderMessagesArray(cached);
      loadConversations();
    }
  });
}

function goBackToConversations() {
  document.getElementById('chat-screen').classList.add('hidden');
  document.getElementById('conversations-screen').classList.remove('hidden');
  activeConversation = null;
  renderConversationsList();
}

async function handleUserSearch(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').classList.add('hidden');
    return;
  }
  
  const result = await searchUsers(query);
  const container = document.getElementById('search-results');
  
  if (!result.users?.length) {
    container.innerHTML = '<div class="no-results">No users found</div>';
    container.classList.remove('hidden');
    return;
  }
  
  container.innerHTML = result.users.map(user => `
    <div class="search-result-item" data-id="${user.id}">
      <div class="search-result-avatar">${getInitials(user.name)}</div>
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(user.name)}</div>
        <div class="search-result-id">${user.id?.slice(0,12)}</div>
      </div>
    </div>
  `).join('');
  
  container.classList.remove('hidden');
  
  container.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      container.classList.add('hidden');
      document.getElementById('user-search-input').value = '';
      
      const result = await getOrCreateConversation(item.dataset.id);
      if (result.success && result.conversation) {
        if (!conversations.find(c => c.conversationId === result.conversation.conversationId)) {
          conversations.unshift(result.conversation);
        }
        openConversation(result.conversation);
        renderConversationsList();
      }
    });
  });
}

function setupMessengerEvents() {
  const searchInput = document.getElementById('user-search-input');
  let debounce;
  
  searchInput.addEventListener('input', (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => handleUserSearch(e.target.value.trim()), 200);
  });
  
  document.getElementById('search-btn').addEventListener('click', () => {
    handleUserSearch(searchInput.value.trim());
  });
  
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });
  
  document.getElementById('message-form').addEventListener('submit', handleSendMessage);
  document.getElementById('back-to-conversations').addEventListener('click', goBackToConversations);
}

function startMessagePolling() {
  setInterval(async () => {
    if (!currentUser) return;
    await loadConversations();
    
    if (activeConversation) {
      const result = await getMessages(activeConversation.conversationId);
      if (result.success) {
        const cached = messageCache.get(activeConversation.conversationId) || [];
        if (result.messages.length > cached.length) {
          messageCache.set(activeConversation.conversationId, result.messages);
          renderMessagesArray(result.messages);
        }
      }
    }
  }, 2000);
}

function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[c]));
}

function formatDate(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatMessageTime(iso) {
  if (!iso) return '';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}