// ============================================================
//  MESSAGING - OPTIMIZED + ACTIVE STATUS
// ============================================================

// Track last active timestamps for users
const userLastActive = new Map(); // userId -> timestamp

function initializeMessenger() {
  if (!currentUser) return;
  loadConversations();
  setupMessengerEvents();
  startMessagePolling();
  initProfile();
  initSettings();
}

// ── File content parser ───────────────────────────────────────
function parseFileContent(content) {
  if (!content || content[0] !== '{') return null;
  try {
    const data = JSON.parse(content);
    if (data._ncrypt_type && data._ncrypt_url) return data;
  } catch (_) {}
  return null;
}

// Extracts Google Drive file ID from any Drive URL format
function getDriveFileIdFromMsg(url) {
  if (!url) return null;
  let m = url.match(/\/file\/d\/([^/?#]+)/);
  if (m) return m[1];
  m = url.match(/[?&]id=([^&]+)/);
  if (m) return m[1];
  m = url.match(/\/d\/([^/?#]+)/);
  if (m) return m[1];
  return null;
}

// Returns a browser-renderable URL for a Drive file
function resolveDisplayUrl(driveUrl, type) {
  const fileId = getDriveFileIdFromMsg(driveUrl);
  if (!fileId) return driveUrl;
  if (type === 'image') return `https://lh3.googleusercontent.com/d/${fileId}`;
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

// Enhances a raw server message with parsed type/URL fields
function enhanceMessage(msg) {
  if (msg._enhanced) return msg;

  const parsed = parseFileContent(msg.content);
  if (parsed) {
    msg.type = parsed._ncrypt_type;
    msg.fileName = parsed._ncrypt_name;
    msg._fileUrl = resolveDisplayUrl(parsed._ncrypt_url, parsed._ncrypt_type);
    msg._driveUrl = parsed._ncrypt_url;
  } else if (!msg.type || msg.type === 'text') {
    if (msg.content && msg.content.includes('drive.google.com')) {
      msg.type = 'file';
      msg._fileUrl = msg.content;
      msg._driveUrl = msg.content;
    } else {
      msg.type = 'text';
    }
  }

  msg._enhanced = true;
  return msg;
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

    let previewText = '';
    if (last.type === 'image') previewText = '📷 Image';
    else if (last.type === 'video') previewText = '🎬 Video';
    else if (last.type === 'audio') previewText = '🎤 Voice message';
    else if (last.type === 'file') previewText = `📎 ${last.fileName || 'File'}`;
    else {
      const parsed = parseFileContent(last.content);
      if (parsed) {
        const icons = { image: '📷', video: '🎬', audio: '🎤', file: '📎' };
        previewText = `${icons[parsed._ncrypt_type] || '📎'} ${parsed._ncrypt_name || 'File'}`;
      } else {
        previewText = last.content || 'No messages yet';
      }
    }

    return `
      <div class="conversation-item${active ? ' active' : ''}" data-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(other.name)}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(previewText)}</div>
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

// Helper: get the most recent message timestamp from a specific user
function getLastMessageTimeFromUser(userId) {
  let latest = 0;
  for (const messages of messagesCache.values()) {
    for (const msg of messages) {
      if (msg.senderId === userId) {
        const time = new Date(msg.timestamp).getTime();
        if (time > latest) latest = time;
      }
    }
  }
  return latest || null;
}

// Update active status display in chat header
function updateActiveStatus(conversation) {
  const otherId = conversation.otherUser?.id;
  if (!otherId) return;
  
  const lastActive = userLastActive.get(otherId) || getLastMessageTimeFromUser(otherId);
  const isActive = lastActive && (Date.now() - lastActive < 5 * 60 * 1000);
  
  const statusEl = document.getElementById('chat-status');
  if (statusEl) {
    statusEl.textContent = isActive ? 'Active now' : 'Inactive';
    statusEl.style.color = isActive ? '#16A34A' : 'var(--text-muted)';
  }
}

// Open a conversation – immediate UI, async message loading
async function openConversation(conversation) {
  activeConversation = conversation;

  // Show chat screen instantly
  document.getElementById('chat-screen').classList.remove('hidden');
  document.getElementById('conversations-screen').classList.add('hidden');

  const other = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(other.name);
  document.getElementById('chat-name').textContent = other.name || 'Unknown';
  
  updateActiveStatus(conversation);
  renderConversationsList();

  // Load from cache first
  const cachedMessages = messagesCache.get(conversation.conversationId);
  if (cachedMessages) {
    renderMessages(conversation.conversationId);
    scrollToBottom();
  } else {
    document.getElementById('messages-container').innerHTML = `
      <div style="flex:1;display:flex;align-items:center;justify-content:center;color:var(--text-muted);">
        <span class="spinner"></span>
      </div>`;
  }

  // Fetch fresh messages asynchronously
  loadMessages(conversation.conversationId).then(() => {
    if (activeConversation?.conversationId === conversation.conversationId) {
      renderMessages(conversation.conversationId);
      scrollToBottom();
    }
  });

  document.getElementById('message-input').focus();
}

// Load messages
async function loadMessages(conversationId) {
  const result = await getMessages(conversationId);
  if (result.success) {
    const enhanced = (result.messages || []).map(enhanceMessage);
    messagesCache.set(conversationId, enhanced);
    return enhanced;
  }
  return [];
}

// ── Render messages with full attachment support ───────────────
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
    const msgType = msg.type || 'text';

    const displayUrl = msg._fileUrl || msg.content;
    const driveUrl = msg._driveUrl || msg.content;
    const fileName = msg.fileName || 'File';

    let contentHtml = '';

    if (msgType === 'image') {
      contentHtml = `
        <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener">
          <img
            src="${escapeHtml(displayUrl)}"
            alt="${escapeHtml(fileName)}"
            style="max-width:220px;max-height:220px;border-radius:8px;display:block;margin-bottom:4px;cursor:pointer;"
            loading="lazy"
            onerror="this.parentElement.innerHTML='<div style=\\'padding:8px;font-size:12px;color:var(--text-muted);\\'>📷 Image — <a href=\\'${escapeHtml(driveUrl)}\\' target=\\'_blank\\'>Open in Drive</a></div>'"
          >
        </a>`;
    } else if (msgType === 'video') {
      const fileId = getDriveFileIdFromMsg(driveUrl);
      const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
      contentHtml = `
        <div style="margin-bottom:4px;">
          ${previewUrl
            ? `<iframe src="${escapeHtml(previewUrl)}" width="220" height="160"
                style="border:none;border-radius:8px;display:block;"
                allow="autoplay" allowfullscreen></iframe>`
            : `<video src="${escapeHtml(displayUrl)}" controls
                style="max-width:220px;max-height:160px;border-radius:8px;display:block;"
                onerror="this.style.display='none'">
              </video>`
          }
          <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener"
             style="font-size:12px;color:var(--accent);text-decoration:none;">
            ▶ Open video in Drive
          </a>
        </div>`;
    } else if (msgType === 'audio') {
      contentHtml = `
        <div style="margin-bottom:4px;">
          <audio
            src="${escapeHtml(displayUrl)}"
            controls
            style="max-width:230px;display:block;"
            onerror="this.outerHTML='<a href=\\'${escapeHtml(driveUrl)}\\' target=\\'_blank\\' style=\\'font-size:12px;color:var(--accent);\\'>🎤 Open voice message</a>'"
          ></audio>
          <div style="font-size:11px;color:var(--text-muted);margin-top:2px;">
            🎤 ${escapeHtml(fileName)}
          </div>
        </div>`;
    } else if (msgType === 'file') {
      const fileId = getDriveFileIdFromMsg(driveUrl);
      const downloadUrl = fileId
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : driveUrl;
      contentHtml = `
        <div style="display:flex;align-items:center;gap:10px;padding:10px 12px;background:rgba(0,0,0,0.04);border-radius:10px;margin-bottom:4px;min-width:160px;">
          <span class="material-icons-round" style="font-size:28px;color:var(--accent);flex-shrink:0;">insert_drive_file</span>
          <div style="flex:1;min-width:0;">
            <div style="font-weight:500;font-size:13px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${escapeHtml(fileName)}</div>
            <div style="display:flex;gap:8px;margin-top:2px;">
              <a href="${escapeHtml(downloadUrl)}" download="${escapeHtml(fileName)}" target="_blank"
                 style="color:var(--accent);font-size:12px;text-decoration:none;">Download</a>
              <a href="${escapeHtml(driveUrl)}" target="_blank" rel="noopener"
                 style="color:var(--text-muted);font-size:12px;text-decoration:none;">View</a>
            </div>
          </div>
        </div>`;
    } else {
      const displayContent = (msg.content && msg.content[0] === '{')
        ? '📎 Attachment'
        : escapeHtml(msg.content).replace(/\n/g, '<br>');
      contentHtml = displayContent;
    }

    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble ${bubbleClass}">
          ${contentHtml}
          <div class="message-time">
            ${formatMessageTime(msg.timestamp)}
            ${msg.pending ? ' · Sending...' : ''}
            ${msg.failed ? ' · Failed' : ''}
          </div>
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
    _fileUrl: msgData._fileUrl,
    _driveUrl: msgData._driveUrl,
    timestamp: new Date().toISOString(),
    pending: true,
    _enhanced: true
  };

  const messages = messagesCache.get(activeConversation.conversationId) || [];
  messages.push(tempMessage);
  messagesCache.set(activeConversation.conversationId, messages);
  renderMessages(activeConversation.conversationId);

  let preview = msgData.content;
  if (msgData.type === 'image') preview = '📷 Image';
  else if (msgData.type === 'video') preview = '🎬 Video';
  else if (msgData.type === 'audio') preview = '🎤 Voice message';
  else if (msgData.type === 'file') preview = `📎 ${msgData.fileName || 'File'}`;
  updateConversationLastMessage(activeConversation.conversationId, preview);

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
    if (result.success) {
      userLastActive.set(currentUser.id, Date.now());
    }
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    if (result.success) {
      if (index !== -1) {
        const local = messages[index];
        messages[index] = {
          ...result.message,
          pending: false,
          type: local.type,
          fileName: local.fileName,
          _fileUrl: local._fileUrl,
          _driveUrl: local._driveUrl,
          _enhanced: true
        };
        messagesCache.set(conversationId, messages);
      }
      await loadConversations();
      if (activeConversation) updateActiveStatus(activeConversation);
    } else {
      if (index !== -1) {
        messages[index].pending = false;
        messages[index].failed = true;
      }
      toast('Failed to send', 'error');
    }
    renderMessages(conversationId);
  } catch (err) {
    console.error('Send error:', err);
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    if (index !== -1) {
      messages[index].pending = false;
      messages[index].failed = true;
    }
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
        <div class="search-result-id" style="font-size:11px;word-break:break-all;color:var(--text-muted);">${escapeHtml(user.id) || '—'}</div>
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

// Open contact info modal
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

  document.getElementById('send-message-btn').addEventListener('click', handleSendMessage);
  document.getElementById('message-input').addEventListener('keypress', e => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendMessage(); }
  });

  document.getElementById('back-to-conversations').addEventListener('click', closeChat);
  document.getElementById('chat-profile-btn').addEventListener('click', openContactInfo);
  document.getElementById('chat-user-info-click').addEventListener('click', openContactInfo);
}

// Polling for new messages
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
          const enhanced = fresh.map(enhanceMessage);
          messagesCache.set(activeConversation.conversationId, enhanced);
          renderMessages(activeConversation.conversationId);
        }
        // Update active status based on fresh messages
        const otherId = activeConversation.otherUser?.id;
        if (otherId) {
          const lastMsgTime = getLastMessageTimeFromUser(otherId);
          if (lastMsgTime) userLastActive.set(otherId, lastMsgTime);
          updateActiveStatus(activeConversation);
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

window.addEventListener('beforeunload', () => {
  stopMessagePolling();
});

// Exports
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;
window.addOptimisticMessage = addOptimisticMessage;