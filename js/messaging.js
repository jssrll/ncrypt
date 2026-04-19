// ============================================================
//  MESSAGING - OPTIMIZED FOR SPEED
// ============================================================

// Initialize messenger
function initializeMessenger() {
  if (!currentUser) return;

  // sidebar-name / sidebar-id / sidebar-avatar don't exist in HTML — removed
  loadConversations();
  setupMessengerEvents();
  startMessagePolling();

  initProfile();
  initSettings();
}

// Load conversations
async function loadConversations() {
  const result = await getConversations();

  if (result.success) {
    conversations = result.conversations || [];
    renderConversationsList();
  }
}

// Render conversations list
function renderConversationsList() {
  const container = document.getElementById('conversations-list');

  if (!conversations.length) {
    container.innerHTML = `
      <div class="no-results" style="padding: 32px 16px; text-align: center;">
        <span class="material-icons-round" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;">chat</span>
        <p style="color: var(--text-secondary); font-size: 14px;">No conversations yet</p>
        <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">Search for a user to start chatting</p>
      </div>
    `;
    return;
  }

  const html = conversations.map(conv => {
    const other = conv.otherUser || {};
    const last = conv.lastMessage || {};
    const active = activeConversation?.conversationId === conv.conversationId;

    return `
      <div class="conversation-item ${active ? 'active' : ''}" data-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(other.name)}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(last.content || '') || 'No messages'}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${formatDate(last.timestamp)}</span>
          ${conv.unreadCount ? `<span class="conv-unread">${conv.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');

  container.innerHTML = html;

  container.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = conversations.find(c => c.conversationId === item.dataset.id);
      if (conv) openConversation(conv);
    });
  });
}

// Open a conversation
async function openConversation(conversation) {
  activeConversation = conversation;

  // FIX: HTML has no chat-empty-state / chat-active split.
  // Instead show the chat-screen and hide conversations-screen on mobile.
  const chatScreen = document.getElementById('chat-screen');
  const convsScreen = document.getElementById('conversations-screen');
  chatScreen.classList.remove('hidden');
  convsScreen.classList.add('hidden');

  const other = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(other.name);
  document.getElementById('chat-name').textContent = other.name || 'Unknown';
  document.getElementById('chat-status').textContent = 'Online';

  await loadMessages(conversation.conversationId);
  renderConversationsList();
  scrollToBottom();
  document.getElementById('message-input').focus();
}

// Load messages
async function loadMessages(conversationId) {
  const result = await getMessages(conversationId);

  if (result.success) {
    messagesCache.set(conversationId, result.messages || []);
    renderMessages(conversationId);
  }
}

// Render messages
function renderMessages(conversationId) {
  const container = document.getElementById('messages-container');
  const messages = messagesCache.get(conversationId) || [];

  if (!messages.length) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px;">chat_bubble_outline</span>
        <p>No messages yet. Say hello! 👋</p>
      </div>
    `;
    return;
  }

  const fragment = document.createDocumentFragment();
  const tempDiv = document.createElement('div');

  let html = '';
  let lastDate = '';

  messages.forEach(msg => {
    const msgDate = new Date(msg.timestamp).toDateString();
    if (msgDate !== lastDate) {
      lastDate = msgDate;
      html += `<div class="message-date-separator"><span>${getDateLabel(msg.timestamp)}</span></div>`;
    }

    const isOutgoing = msg.senderId === currentUser.id;
    const bubbleClass = msg.pending ? 'pending' : msg.failed ? 'failed' : '';
    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble ${bubbleClass}">
          ${escapeHtml(msg.content)}
          <div class="message-time">${formatMessageTime(msg.timestamp)}</div>
        </div>
      </div>
    `;
  });

  tempDiv.innerHTML = html;
  while (tempDiv.firstChild) {
    fragment.appendChild(tempDiv.firstChild);
  }

  container.innerHTML = '';
  container.appendChild(fragment);
  scrollToBottom();
}

// Get date label
function getDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Send message
async function handleSendMessage(e) {
  e.preventDefault();

  const input = document.getElementById('message-input');
  const content = input.value.trim();

  if (!content || !activeConversation) return;

  input.value = '';

  const tempId = 'temp_' + Date.now();
  const tempMessage = {
    id: tempId,
    conversationId: activeConversation.conversationId,
    senderId: currentUser.id,
    content: content,
    timestamp: new Date().toISOString(),
    read: false,
    pending: true
  };

  const messages = messagesCache.get(activeConversation.conversationId) || [];
  messages.push(tempMessage);
  messagesCache.set(activeConversation.conversationId, messages);
  renderMessages(activeConversation.conversationId);

  updateConversationLastMessage(activeConversation.conversationId, content);

  sendMessageAsync(activeConversation.conversationId, content, tempId);
}

// Update conversation last message optimistically
function updateConversationLastMessage(convId, content) {
  const conv = conversations.find(c => c.conversationId === convId);
  if (conv) {
    conv.lastMessage = {
      content: content,
      timestamp: new Date().toISOString()
    };
    conv.updatedAt = new Date().toISOString();
    renderConversationsList();
  }
}

// Send message async
async function sendMessageAsync(conversationId, content, tempId) {
  try {
    const result = await sendMessage(conversationId, content);

    if (result.success) {
      const messages = messagesCache.get(conversationId) || [];
      const index = messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        messages[index] = { ...result.message, pending: false };
        messagesCache.set(conversationId, messages);
        renderMessages(conversationId);
      }
      await loadConversations();
    } else {
      markMessageFailed(conversationId, tempId);
      toast('Failed to send', 'error');
    }
  } catch (err) {
    console.error('Send error:', err);
    markMessageFailed(conversationId, tempId);
  }
}

function markMessageFailed(conversationId, tempId) {
  const messages = messagesCache.get(conversationId) || [];
  const index = messages.findIndex(m => m.id === tempId);
  if (index !== -1) {
    messages[index].failed = true;
    messages[index].pending = false;
    messagesCache.set(conversationId, messages);
    renderMessages(conversationId);
  }
}

// Search users
async function handleUserSearch(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').classList.add('hidden');
    return;
  }

  const result = await searchUsers(query);
  const container = document.getElementById('search-results');

  if (!result.success || !result.users?.length) {
    container.innerHTML = '<div class="no-results">No users found</div>';
    container.classList.remove('hidden');
    return;
  }

  container.innerHTML = result.users.map(user => `
    <div class="search-result-item" data-id="${user.id}">
      <div class="search-result-avatar">${getInitials(user.name)}</div>
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(user.name)}</div>
        <div class="search-result-id">${user.id?.slice(0, 12) || '—'}</div>
      </div>
    </div>
  `).join('');

  container.classList.remove('hidden');

  container.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      await startConversationWithUser(item.dataset.id);
      container.classList.add('hidden');
      document.getElementById('user-search-input').value = '';
    });
  });
}

// Start conversation with user
async function startConversationWithUser(userId) {
  const result = await getOrCreateConversation(userId);

  if (result.success && result.conversation) {
    if (!conversations.find(c => c.conversationId === result.conversation.conversationId)) {
      conversations.unshift(result.conversation);
    }
    openConversation(result.conversation);
    renderConversationsList();
  } else {
    toast('Failed to start chat', 'error');
  }
}

// Go back to conversations list (mobile)
function closeChat() {
  activeConversation = null;
  stopMessagePolling();

  const chatScreen = document.getElementById('chat-screen');
  const convsScreen = document.getElementById('conversations-screen');
  chatScreen.classList.add('hidden');
  convsScreen.classList.remove('hidden');

  renderConversationsList();
  startMessagePolling();
}

// Scroll to bottom
function scrollToBottom() {
  requestAnimationFrame(() => {
    const container = document.getElementById('messages-container');
    if (container) container.scrollTop = container.scrollHeight;
  });
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  return text.replace(/[&<>"']/g, (char) => {
    const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
    return map[char];
  });
}

// Setup events
function setupMessengerEvents() {
  const searchInput = document.getElementById('user-search-input');

  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => handleUserSearch(e.target.value.trim()), 250);
  });

  document.getElementById('search-btn').addEventListener('click', () => {
    handleUserSearch(searchInput.value.trim());
  });

  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleUserSearch(searchInput.value.trim());
    }
  });

  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });

  document.getElementById('message-form').addEventListener('submit', handleSendMessage);

  // FIX: was 'close-chat' which doesn't exist — correct ID is 'back-to-conversations'
  document.getElementById('back-to-conversations').addEventListener('click', closeChat);

  // Wire up chat-profile-btn to open profile modal for the other user
  document.getElementById('chat-profile-btn').addEventListener('click', () => {
    if (activeConversation) openProfileModal();
  });

  // Wire up chat-user-info-click
  document.getElementById('chat-user-info-click').addEventListener('click', () => {
    if (activeConversation) openProfileModal();
  });
}

// Message polling
function startMessagePolling() {
  stopMessagePolling();

  messagePollingInterval = setInterval(async () => {
    if (!currentUser) return;

    await loadConversations();

    if (activeConversation) {
      const result = await getMessages(activeConversation.conversationId);
      if (result.success) {
        const current = messagesCache.get(activeConversation.conversationId) || [];
        const fresh = result.messages || [];

        const hasPending = current.some(m => m.pending);
        if (fresh.length > current.length && !hasPending) {
          messagesCache.set(activeConversation.conversationId, fresh);
          renderMessages(activeConversation.conversationId);
        }
      }
    }
  }, 2000);
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
}

// Cleanup
window.addEventListener('beforeunload', () => {
  stopMessagePolling();
  if (typeof qrStream !== 'undefined' && qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
  }
});

// Exports
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;