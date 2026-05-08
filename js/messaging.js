// ============================================================
//  MESSAGING – OPTIMIZED + LONG‑PRESS ACTIONS
// ============================================================

const userLastActive = new Map();
let longPressTimer = null;
let currentLongPressMessage = null;
let replyToMessage = null; // { id, content, senderName }

function initializeMessenger() {
  if (!currentUser) return;
  loadConversations();
  setupMessengerEvents();
  startMessagePolling();
  initProfile();
  initSettings();
  initLongPressMenu();
}

// ── File content parser ────────────────────────────
function parseFileContent(content) {
  if (!content || content[0] !== '{') return null;
  try {
    const data = JSON.parse(content);
    if (data._ncrypt_type && data._ncrypt_url) return data;
  } catch (_) {}
  return null;
}

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

function resolveDisplayUrl(driveUrl, type) {
  const fileId = getDriveFileIdFromMsg(driveUrl);
  if (!fileId) return driveUrl;
  if (type === 'image') {
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  if (type === 'video' || type === 'audio') {
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

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
  if (msg.reactions) {
    try { msg.reactions = JSON.parse(msg.reactions); } catch(e) { msg.reactions = {}; }
  }
  if (msg.replyTo) {
    try { msg.replyTo = JSON.parse(msg.replyTo); } catch(e) { msg.replyTo = null; }
  }
  msg._enhanced = true;
  return msg;
}

// ── Conversations ──────────────────────────────────
async function loadConversations() {
  if (!currentUser) return;
  
  const result = await getConversations();
  if (result.success) {
    conversations = result.conversations || [];
    renderConversationsList();
  }
}

function renderConversationsList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  
  if (!conversations.length) {
    container.innerHTML = `
      <div style="padding: 40px; text-align: center; color: var(--text-muted);">
        <span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px;">chat_bubble_outline</span>
        <p>No conversations yet</p>
        <p style="font-size: 13px; margin-top: 8px;">Search for users to start messaging</p>
      </div>
    `;
    return;
  }
  
  const fragment = document.createDocumentFragment();
  conversations.forEach(conv => {
    const otherUser = conv.otherUser || {};
    const lastMsg = conv.lastMessage || {};
    const isActive = activeConversation?.conversationId === conv.conversationId;
    
    const div = document.createElement('div');
    div.className = `conversation-item ${isActive ? 'active' : ''}`;
    div.setAttribute('data-conv-id', conv.conversationId);
    
    let lastMsgContent = lastMsg.content || 'No messages yet';
    if (lastMsgContent.length > 50) lastMsgContent = lastMsgContent.substring(0, 47) + '...';
    
    div.innerHTML = `
      <div class="conv-avatar">${getInitials(otherUser.name || '?')}</div>
      <div class="conv-info">
        <div class="conv-name">${escapeHtml(otherUser.name || 'Unknown')}</div>
        <div class="conv-last-message">${escapeHtml(lastMsgContent)}</div>
      </div>
      <div class="conv-meta">
        <div class="conv-time">${formatDate(lastMsg.timestamp)}</div>
        ${conv.unreadCount ? `<div class="conv-unread">${conv.unreadCount}</div>` : ''}
      </div>
    `;
    
    div.addEventListener('click', () => openConversation(conv));
    fragment.appendChild(div);
  });
  
  container.innerHTML = '';
  container.appendChild(fragment);
}

// ── Active status ─────────────────────────────────
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

// ── Open conversation ─────────────────────────────
async function openConversation(conversation) {
  activeConversation = conversation;
  document.getElementById('chat-screen').classList.remove('hidden');
  document.getElementById('conversations-screen').classList.add('hidden');
  const other = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(other.name);
  document.getElementById('chat-name').textContent = other.name || 'Unknown';
  updateActiveStatus(conversation);
  renderConversationsList();

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

  await loadMessages(conversation.conversationId);
  if (activeConversation?.conversationId === conversation.conversationId) {
    renderMessages(conversation.conversationId);
    scrollToBottom();
  }

  document.getElementById('message-input').focus();
  clearReplyBar();
}

async function loadMessages(conversationId) {
  const result = await getMessages(conversationId);
  if (result.success) {
    const enhanced = (result.messages || []).map(enhanceMessage);
    messagesCache.set(conversationId, enhanced);
    return enhanced;
  }
  return [];
}

// ── Render messages ───────────────────────────────
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

    // Reply preview
    let replyPreviewHtml = '';
    if (msg.replyTo) {
      replyPreviewHtml = `
        <div class="reply-preview">
          <span class="reply-line"></span>
          <span class="reply-sender">${escapeHtml(msg.replyTo.senderName || 'User')}</span>
          <span class="reply-text">${escapeHtml(msg.replyTo.content?.substring(0, 50) || 'Attachment')}</span>
        </div>
      `;
    }

    // Reactions
    let reactionsHtml = '';
    if (msg.reactions && Object.keys(msg.reactions).length) {
      reactionsHtml = '<div class="message-reactions">';
      for (const [emoji, users] of Object.entries(msg.reactions)) {
        const active = users.includes(currentUser.id);
        reactionsHtml += `<span class="reaction ${active ? 'active' : ''}" data-emoji="${emoji}">${emoji} ${users.length}</span>`;
      }
      reactionsHtml += '</div>';
    }

    let contentHtml = '';
    if (msgType === 'image') {
      contentHtml = `<a href="${escapeHtml(driveUrl)}" target="_blank"><img src="${escapeHtml(displayUrl)}" alt="${escapeHtml(fileName)}" style="max-width:220px;max-height:220px;border-radius:8px;display:block;margin-bottom:4px;" loading="lazy"></a>`;
    } else if (msgType === 'video') {
      contentHtml = `<div><a href="${escapeHtml(driveUrl)}" target="_blank" style="font-size:12px;color:var(--accent);">▶ Open video</a></div>`;
    } else if (msgType === 'audio') {
      contentHtml = `<audio src="${escapeHtml(displayUrl)}" controls style="max-width:230px;"></audio><div style="font-size:11px;">🎤 ${escapeHtml(fileName)}</div>`;
    } else if (msgType === 'file') {
      contentHtml = `<div style="display:flex;gap:10px;"><span class="material-icons-round">insert_drive_file</span><div><div>${escapeHtml(fileName)}</div><a href="${escapeHtml(driveUrl)}" download>Download</a></div></div>`;
    } else {
      contentHtml = escapeHtml(msg.content).replace(/\n/g, '<br>');
    }

    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}" data-message-id="${msg.id}">
        <div class="message-bubble ${bubbleClass}">
          ${replyPreviewHtml}
          ${contentHtml}
          ${reactionsHtml}
          <div class="message-time">${formatMessageTime(msg.timestamp)}${msg.pending ? ' · Sending...' : ''}${msg.failed ? ' · Failed' : ''}</div>
        </div>
      </div>`;
  });

  tempDiv.innerHTML = html;
  while (tempDiv.firstChild) fragment.appendChild(tempDiv.firstChild);
  container.innerHTML = '';
  container.appendChild(fragment);
  attachMessageLongPressListeners();
  attachReactionListeners();
  scrollToBottom();
}

// ── Long‑press menu ───────────────────────────────
function initLongPressMenu() {
  const menu = document.createElement('div');
  menu.id = 'message-context-menu';
  menu.className = 'message-context-menu hidden';
  menu.innerHTML = `
    <div class="context-menu-item" data-action="reply"><span class="material-icons-round">reply</span>Reply</div>
    <div class="context-menu-item" data-action="translate"><span class="material-icons-round">translate</span>Translate</div>
    <div class="context-menu-item" data-action="forward"><span class="material-icons-round">forward</span>Forward</div>
    <div class="context-menu-reactions">
      <span data-emoji="👍">👍</span><span data-emoji="❤️">❤️</span><span data-emoji="😆">😆</span>
      <span data-emoji="😮">😮</span><span data-emoji="😢">😢</span><span data-emoji="😡">😡</span>
    </div>
  `;
  document.body.appendChild(menu);

  document.addEventListener('click', () => menu.classList.add('hidden'));
  menu.addEventListener('click', (e) => {
    const action = e.target.closest('[data-action]')?.dataset.action;
    const emoji = e.target.closest('[data-emoji]')?.dataset.emoji;
    if (action && currentLongPressMessage) {
      handleContextAction(action, currentLongPressMessage);
      menu.classList.add('hidden');
    } else if (emoji && currentLongPressMessage) {
      toggleReaction(currentLongPressMessage, emoji);
      menu.classList.add('hidden');
    }
  });
}

function attachMessageLongPressListeners() {
  document.querySelectorAll('.message-bubble').forEach(bubble => {
    const row = bubble.closest('.message-row');
    if (!row) return;
    const messageId = row.dataset.messageId;
    if (!messageId) return;

    row.addEventListener('touchstart', (e) => startLongPress(e, messageId));
    row.addEventListener('touchend', cancelLongPress);
    row.addEventListener('touchmove', cancelLongPress);
    row.addEventListener('mousedown', (e) => startLongPress(e, messageId));
    row.addEventListener('mouseup', cancelLongPress);
    row.addEventListener('mouseleave', cancelLongPress);
  });
}

function startLongPress(e, messageId) {
  cancelLongPress();
  longPressTimer = setTimeout(() => {
    const messages = messagesCache.get(activeConversation?.conversationId) || [];
    const msg = messages.find(m => m.id === messageId);
    if (msg) {
      currentLongPressMessage = msg;
      showContextMenu(e);
    }
  }, 500);
}

function cancelLongPress() {
  if (longPressTimer) {
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }
}

function showContextMenu(e) {
  const menu = document.getElementById('message-context-menu');
  if (!menu) return;
  const x = e.clientX || (e.touches ? e.touches[0].clientX : 0);
  const y = e.clientY || (e.touches ? e.touches[0].clientY : 0);
  menu.style.left = Math.min(x, window.innerWidth - 200) + 'px';
  menu.style.top = Math.min(y, window.innerHeight - 200) + 'px';
  menu.classList.remove('hidden');
  e.preventDefault();
}

function handleContextAction(action, msg) {
  switch (action) {
    case 'reply':
      setReplyToMessage(msg);
      break;
    case 'translate':
      translateMessage(msg);
      break;
    case 'forward':
      forwardMessage(msg);
      break;
  }
}

function setReplyToMessage(msg) {
  replyToMessage = {
    id: msg.id,
    content: msg.content?.substring(0, 100) || 'Attachment',
    senderName: msg.senderId === currentUser.id ? 'You' : (activeConversation?.otherUser?.name?.split(' ')[0] || 'User')
  };
  let replyBar = document.getElementById('reply-bar');
  if (!replyBar) {
    const container = document.querySelector('.message-input-container');
    replyBar = document.createElement('div');
    replyBar.id = 'reply-bar';
    replyBar.className = 'reply-bar hidden';
    replyBar.innerHTML = `
      <span class="material-icons-round">reply</span>
      <div class="reply-preview-text" id="reply-preview-text"></div>
      <span class="material-icons-round" id="cancel-reply">close</span>
    `;
    container?.parentNode?.insertBefore(replyBar, container);
    document.getElementById('cancel-reply')?.addEventListener('click', clearReplyBar);
  }
  replyBar.classList.remove('hidden');
  const previewText = document.getElementById('reply-preview-text');
  if (previewText) previewText.textContent = `${replyToMessage.senderName}: ${replyToMessage.content}`;
  document.getElementById('message-input').focus();
}

function clearReplyBar() {
  replyToMessage = null;
  const replyBar = document.getElementById('reply-bar');
  if (replyBar) replyBar.classList.add('hidden');
}

async function translateMessage(msg) {
  if (msg.type !== 'text') {
    toast('Only text messages can be translated', 'info');
    return;
  }
  try {
    const res = await fetch(`https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=t&q=${encodeURIComponent(msg.content)}`);
    const data = await res.json();
    const translation = data[0].map(part => part[0]).join('');
    toast(translation, 'info', 10000);
  } catch (err) {
    toast('Translation failed', 'error');
  }
}

async function forwardMessage(msg) {
  const otherConversations = conversations.filter(c => c.conversationId !== activeConversation?.conversationId);
  if (!otherConversations.length) {
    toast('No other conversations to forward to', 'info');
    return;
  }
  const convNames = otherConversations.map((c, i) => `${i + 1}. ${c.otherUser?.name || 'Unknown'}`).join('\n');
  const targetIndex = prompt(`Forward to:\n${convNames}\n\nEnter number (1-${otherConversations.length}):`);
  if (!targetIndex) return;
  const idx = parseInt(targetIndex) - 1;
  if (isNaN(idx) || idx < 0 || idx >= otherConversations.length) {
    toast('Invalid selection', 'error');
    return;
  }
  const target = otherConversations[idx];
  let contentToSend = msg.content;
  if (msg.type !== 'text') contentToSend = `📎 Forwarded: ${msg.fileName || 'Attachment'}`;
  await sendMessage(target.conversationId, contentToSend);
  toast('Message forwarded', 'success');
}

// ── Reactions ─────────────────────────────────────
function attachReactionListeners() {
  document.querySelectorAll('.reaction').forEach(el => {
    el.addEventListener('click', (e) => {
      e.stopPropagation();
      const emoji = el.dataset.emoji;
      const row = el.closest('.message-row');
      const msgId = row?.dataset.messageId;
      const messages = messagesCache.get(activeConversation?.conversationId) || [];
      const msg = messages.find(m => m.id === msgId);
      if (msg) toggleReaction(msg, emoji);
    });
  });
}

function toggleReaction(msg, emoji) {
  if (!msg.reactions) msg.reactions = {};
  if (!msg.reactions[emoji]) msg.reactions[emoji] = [];
  
  const userId = currentUser.id;
  const index = msg.reactions[emoji].indexOf(userId);
  if (index > -1) {
    msg.reactions[emoji].splice(index, 1);
    if (msg.reactions[emoji].length === 0) delete msg.reactions[emoji];
  } else {
    msg.reactions[emoji].push(userId);
  }
  
  messagesCache.set(activeConversation.conversationId, messagesCache.get(activeConversation.conversationId));
  renderMessages(activeConversation.conversationId);
  sendReactionUpdate(msg.id, msg.reactions);
}

async function sendReactionUpdate(messageId, reactions) {
  try {
    await callAPI({
      action: 'updateMessageReactions',
      messageId,
      reactions: JSON.stringify(reactions)
    });
  } catch (err) {
    console.warn('Reaction sync failed', err);
  }
}

// ── Send message ──────────────────────────────────
async function handleSendMessage() {
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  if (!content || !activeConversation) return;

  const msgData = { content, type: 'text' };
  if (replyToMessage) {
    msgData.replyTo = replyToMessage;
    clearReplyBar();
  }

  input.value = '';
  addOptimisticMessage(msgData);
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
    replyTo: msgData.replyTo,
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
  scrollToBottom();

  sendMessageAsync(activeConversation.conversationId, msgData.content, tempId, msgData.replyTo);
}

async function sendMessageAsync(conversationId, content, tempId, replyTo = null) {
  try {
    const payload = { action: 'sendMessage', conversationId, senderId: currentUser.id, content: content.trim() };
    if (replyTo) payload.replyTo = JSON.stringify(replyTo);
    const result = await callAPI(payload);
    
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    
    if (index !== -1) {
      if (result.success) {
        messages[index].pending = false;
        messages[index].id = result.message?.id || messages[index].id;
        messages[index].timestamp = result.message?.timestamp || messages[index].timestamp;
      } else {
        messages[index].failed = true;
        messages[index].content = 'Failed to send';
      }
      messagesCache.set(conversationId, messages);
      renderMessages(conversationId);
    }
    
    userLastActive.set(currentUser.id, Date.now());
    await loadConversations();
  } catch (err) {
    console.error('Send error:', err);
    const messages = messagesCache.get(conversationId) || [];
    const index = messages.findIndex(m => m.id === tempId);
    if (index !== -1) {
      messages[index].failed = true;
      messages[index].content = 'Failed to send';
      renderMessages(conversationId);
    }
    toast('Failed to send message', 'error');
  }
}

// ── Polling ───────────────────────────────────────
function startMessagePolling() {
  if (messagePollingInterval) clearInterval(messagePollingInterval);
  
  messagePollingInterval = setInterval(async () => {
    if (!currentUser) return;
    await loadConversations();
    
    if (activeConversation) {
      const oldMessages = messagesCache.get(activeConversation.conversationId) || [];
      const newMessages = await loadMessages(activeConversation.conversationId);
      
      if (newMessages.length !== oldMessages.length) {
        renderMessages(activeConversation.conversationId);
        scrollToBottom();
      }
      updateActiveStatus(activeConversation);
    }
  }, 3000);
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
}

// ── Search and conversation start ─────────────────
async function handleUserSearch(query) {
  const resultsContainer = document.getElementById('search-results');
  if (!query || query.length < 2) {
    resultsContainer.classList.add('hidden');
    return;
  }
  
  const result = await searchUsers(query);
  if (!result.success || !result.users.length) {
    resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
    resultsContainer.classList.remove('hidden');
    return;
  }
  
  resultsContainer.innerHTML = '';
  result.users.forEach(user => {
    const div = document.createElement('div');
    div.className = 'search-result-item';
    div.innerHTML = `
      <div class="search-result-avatar">${getInitials(user.name)}</div>
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(user.name)}</div>
        <div class="search-result-id">${escapeHtml(user.id)}</div>
      </div>
    `;
    div.addEventListener('click', () => startConversationWithUser(user.id));
    resultsContainer.appendChild(div);
  });
  resultsContainer.classList.remove('hidden');
}

async function startConversationWithUser(userId) {
  const result = await getOrCreateConversation(userId);
  if (result.success && result.conversation) {
    document.getElementById('search-results').classList.add('hidden');
    document.getElementById('user-search-input').value = '';
    await loadConversations();
    openConversation(result.conversation);
  } else {
    toast('Could not start conversation', 'error');
  }
}

// ── UI Helpers ────────────────────────────────────
function closeChat() {
  activeConversation = null;
  document.getElementById('chat-screen').classList.add('hidden');
  document.getElementById('conversations-screen').classList.remove('hidden');
  clearReplyBar();
}

function scrollToBottom() {
  const container = document.getElementById('messages-container');
  if (container) {
    container.scrollTop = container.scrollHeight;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function getDateLabel(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  
  if (date.toDateString() === today.toDateString()) return 'Today';
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function updateConversationLastMessage(convId, content) {
  const conversation = conversations.find(c => c.conversationId === convId);
  if (conversation) {
    conversation.lastMessage = { content, timestamp: new Date().toISOString() };
    renderConversationsList();
  }
}

function openContactInfo() {
  if (!activeConversation?.otherUser) return;
  const user = activeConversation.otherUser;
  document.getElementById('contact-avatar').textContent = getInitials(user.name);
  document.getElementById('contact-name').textContent = user.name || '—';
  document.getElementById('contact-info-name').textContent = user.name || '—';
  document.getElementById('contact-info-id').textContent = user.id || '—';
  document.getElementById('contact-info-email').textContent = user.email || '—';
  openModal('contact-modal');
}

function setupMessengerEvents() {
  const sendBtn = document.getElementById('send-message-btn');
  const messageInput = document.getElementById('message-input');
  
  if (sendBtn) sendBtn.addEventListener('click', handleSendMessage);
  if (messageInput) {
    messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    });
  }
  
  const backBtn = document.getElementById('back-to-conversations');
  if (backBtn) backBtn.addEventListener('click', closeChat);
  
  const searchInput = document.getElementById('user-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      if (searchDebounceTimer) clearTimeout(searchDebounceTimer);
      searchDebounceTimer = setTimeout(() => handleUserSearch(e.target.value), 300);
    });
  }
  
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn) {
    searchBtn.addEventListener('click', () => {
      const query = searchInput?.value.trim();
      if (query) handleUserSearch(query);
    });
  }
  
  const chatUserInfo = document.getElementById('chat-user-info-click');
  if (chatUserInfo) chatUserInfo.addEventListener('click', openContactInfo);
  
  const chatProfileBtn = document.getElementById('chat-profile-btn');
  if (chatProfileBtn) chatProfileBtn.addEventListener('click', openContactInfo);
}

// Exports
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;
window.addOptimisticMessage = addOptimisticMessage;