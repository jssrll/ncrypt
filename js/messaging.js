// ============================================================
//  MESSAGING - FIXED & COMPLETE
// ============================================================

function initializeMessenger() {
  if (!currentUser) return;
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
  if (!container) return;

  if (!conversations.length) {
    container.innerHTML = `
      <div style="padding:48px 16px;text-align:center;">
        <span class="material-icons-round" style="font-size:48px;color:var(--text-muted);display:block;margin-bottom:12px;">chat_bubble_outline</span>
        <p style="color:var(--text-secondary);font-size:15px;font-weight:600;margin-bottom:4px;">No conversations yet</p>
        <p style="color:var(--text-muted);font-size:13px;">Search for someone to start chatting</p>
      </div>`;
    return;
  }

  const html = conversations.map(conv => {
    const other = conv.otherUser || {};
    const last = conv.lastMessage || {};
    const active = activeConversation?.conversationId === conv.conversationId;

    return `
      <div class="conversation-item${active ? ' active' : ''}" data-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(other.name)}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(last.content || 'No messages yet')}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${formatDate(last.timestamp)}</span>
          ${conv.unreadCount ? `<span class="conv-unread">${conv.unreadCount}</span>` : ''}
        </div>
      </div>`;
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

  // Show chat screen, hide conversations on mobile
  document.getElementById('chat-screen').classList.remove('hidden');
  document.getElementById('conversations-screen').classList.add('hidden');

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
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:40px;color:var(--text-muted);">
        <span class="material-icons-round" style="font-size:52px;margin-bottom:12px;">waving_hand</span>
        <p style="font-size:15px;font-weight:600;color:var(--text-secondary);">Say hello!</p>
        <p style="font-size:13px;margin-top:4px;">Start the conversation 👋</p>
      </div>`;
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

    // Handle different message types
    let contentHtml = '';
    if (msg.type === 'image') {
      contentHtml = `<img src="${msg.content}" style="max-width:200px;max-height:200px;border-radius:8px;display:block;margin-bottom:4px;" loading="lazy">`;
    } else if (msg.type === 'video') {
      contentHtml = `<video src="${msg.content}" controls style="max-width:200px;border-radius:8px;display:block;margin-bottom:4px;"></video>`;
    } else if (msg.type === 'audio') {
      contentHtml = `<audio src="${msg.content}" controls style="max-width:220px;display:block;margin-bottom:4px;"></audio>`;
    } else if (msg.type === 'file') {
      contentHtml = `<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;"><span class="material-icons-round">insert_drive_file</span><span style="font-size:13px;">${escapeHtml(msg.fileName || 'File')}</span></div>`;
    } else {
      contentHtml = escapeHtml(msg.content);
    }

    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble ${bubbleClass}">
          ${contentHtml}
          <div class="message-time">${formatMessageTime(msg.timestamp)}${msg.pending ? ' · Sending...' : msg.failed ? ' · Failed' : ''}</div>
        </div>
      </div>`;
  });

  tempDiv.innerHTML = html;
  while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
  container.innerHTML = '';
  container.appendChild(fragment);
  scrollToBottom();
}

function getDateLabel(timestamp) {
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// Send text message
async function handleSendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content || !activeConversation) return;

  input.value = '';
  addOptimisticMessage({ content, type: 'text' });
}

function addOptimisticMessage(msgData) {
  const tempId = 'temp_' + Date.now();
  const tempMessage = {
    id: tempId,
    conversationId: activeConversation.conversationId,
    senderId: currentUser.id,
    content: msgData.content,
    type: msgData.type || 'text',
    fileName: msgData.fileName,
    timestamp: new Date().toISOString(),
    pending: true
  };

  const messages = messagesCache.get(activeConversation.conversationId) || [];
  messages.push(tempMessage);
  messagesCache.set(activeConversation.conversationId, messages);
  renderMessages(activeConversation.conversationId);
  updateConversationLastMessage(activeConversation.conversationId, msgData.content || '[Attachment]');

  sendMessageAsync(activeConversation.conversationId, msgData.content, tempId);
}

function updateConversationLastMessage(convId, content) {
  const conv = conversations.find(c => c.conversationId === convId);
  if (conv) {
    conv.lastMessage = { content, timestamp: new Date().toISOString() };
    conv.updatedAt = new Date().toISOString();
    renderConversationsList();
  }
}

async function sendMessageAsync(conversationId, content, tempId) {
  try {
    const result = await sendMessage(conversationId, content);
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    if (result.success) {
      if (index !== -1) {
        messages[index] = { ...result.message, pending: false };
        messagesCache.set(conversationId, messages);
      }
      await loadConversations();
    } else {
      if (index !== -1) { messages[index].pending = false; messages[index].failed = true; }
      toast('Failed to send', 'error');
    }
    renderMessages(conversationId);
  } catch (err) {
    console.error('Send error:', err);
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    if (index !== -1) { messages[index].pending = false; messages[index].failed = true; }
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
    </div>`).join('');

  container.classList.remove('hidden');
  container.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      await startConversationWithUser(item.dataset.id);
      container.classList.add('hidden');
      document.getElementById('user-search-input').value = '';
    });
  });
}

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

// Close chat / back to conversations
function closeChat() {
  activeConversation = null;
  document.getElementById('chat-screen').classList.add('hidden');
  document.getElementById('conversations-screen').classList.remove('hidden');
  renderConversationsList();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    const c = document.getElementById('messages-container');
    if (c) c.scrollTop = c.scrollHeight;
  });
}

function escapeHtml(text) {
  if (!text) return '';
  return String(text).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c])
  );
}

// Open contact info modal for the active conversation's other user
function openContactInfo() {
  if (!activeConversation) return;
  const other = activeConversation.otherUser || {};
  document.getElementById('contact-avatar').textContent = getInitials(other.name);
  document.getElementById('contact-name').textContent = other.name || 'Unknown';
  document.getElementById('contact-info-name').textContent = other.name || '—';
  document.getElementById('contact-info-id').textContent = other.id || '—';
  document.getElementById('contact-info-email').textContent = other.email || '—';
  openModal('contact-modal');
}

// Setup messenger events
function setupMessengerEvents() {
  const searchInput = document.getElementById('user-search-input');

  searchInput.addEventListener('input', e => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => handleUserSearch(e.target.value.trim()), 250);
  });

  document.getElementById('search-btn').addEventListener('click', () => {
    handleUserSearch(searchInput.value.trim());
  });

  searchInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') { e.preventDefault(); handleUserSearch(searchInput.value.trim()); }
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-section') && !e.target.closest('#search-results')) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });

  // Send button
  document.getElementById('send-message-btn').addEventListener('click', handleSendMessage);
  document.getElementById('message-input').addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  });

  // Back button (mobile + desktop)
  document.getElementById('back-to-conversations').addEventListener('click', closeChat);

  // Info/contact button
  document.getElementById('chat-profile-btn').addEventListener('click', openContactInfo);
  document.getElementById('chat-user-info-click').addEventListener('click', openContactInfo);
}

// Polling
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
  if (messagePollingInterval) { clearInterval(messagePollingInterval); messagePollingInterval = null; }
}

window.addEventListener('beforeunload', () => {
  stopMessagePolling();
  if (typeof qrStream !== 'undefined' && qrStream) qrStream.getTracks().forEach(t => t.stop());
});

// Exports
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;
window.addOptimisticMessage = addOptimisticMessage;