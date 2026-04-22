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

// ── File content parser (unchanged) ────────────────────────────
function parseFileContent(content) {
  if (!content || content[0] !== '{') return null;
  try {
    const data = JSON.parse(content);
    if (data._ncrypt_type && data._ncrypt_url) return data;
  } catch (_) {}
  return null;
}

function getDriveFileIdFromMsg(url) { /* unchanged */ }
function resolveDisplayUrl(driveUrl, type) { /* unchanged */ }

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
  // Parse reactions and reply from extended fields (if present in backend)
  if (msg.reactions) {
    try { msg.reactions = JSON.parse(msg.reactions); } catch(e) {}
  }
  if (msg.replyTo) {
    try { msg.replyTo = JSON.parse(msg.replyTo); } catch(e) {}
  }
  msg._enhanced = true;
  return msg;
}

// ── Conversations (unchanged) ──────────────────────────────────
async function loadConversations() { /* unchanged */ }

function renderConversationsList() { /* unchanged */ }

// ── Active status ──────────────────────────────────────────────
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

// ── Open conversation (optimized) ───────────────────────────────
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

  loadMessages(conversation.conversationId).then(() => {
    if (activeConversation?.conversationId === conversation.conversationId) {
      renderMessages(conversation.conversationId);
      scrollToBottom();
    }
  });

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

// ── Render messages (with reply preview & reactions) ────────────
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
      const repliedMsg = messages.find(m => m.id === msg.replyTo.id);
      if (repliedMsg) {
        const replySenderName = repliedMsg.senderId === currentUser.id ? 'You' : (activeConversation?.otherUser?.name?.split(' ')[0] || 'User');
        replyPreviewHtml = `
          <div class="reply-preview">
            <span class="reply-line"></span>
            <span class="reply-sender">${escapeHtml(replySenderName)}</span>
            <span class="reply-text">${escapeHtml(repliedMsg.content?.substring(0, 50) || 'Attachment')}</span>
          </div>
        `;
      }
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
      const fileId = getDriveFileIdFromMsg(driveUrl);
      const previewUrl = fileId ? `https://drive.google.com/file/d/${fileId}/preview` : '';
      contentHtml = `<div>${previewUrl ? `<iframe src="${escapeHtml(previewUrl)}" width="220" height="160" style="border:none;border-radius:8px;"></iframe>` : ''}<a href="${escapeHtml(driveUrl)}" target="_blank" style="font-size:12px;color:var(--accent);">▶ Open video</a></div>`;
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

// ── Long‑press menu ──────────────────────────────────────────────
function initLongPressMenu() {
  // Create context menu dynamically
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

// ── Context Actions ─────────────────────────────────────────────
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
  document.getElementById('reply-bar').classList.remove('hidden');
  document.getElementById('reply-preview-text').textContent = `${replyToMessage.senderName}: ${replyToMessage.content}`;
  document.getElementById('message-input').focus();
}

function clearReplyBar() {
  replyToMessage = null;
  document.getElementById('reply-bar').classList.add('hidden');
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
  // Build list of other conversations
  const otherConversations = conversations.filter(c => c.conversationId !== activeConversation?.conversationId);
  if (!otherConversations.length) {
    toast('No other conversations to forward to', 'info');
    return;
  }
  // Simple selection using prompt-like modal (you can expand to a proper picker)
  const convNames = otherConversations.map(c => c.otherUser?.name || 'Unknown').join('\n');
  const targetConv = prompt(`Forward to:\n${convNames}\nEnter exact name:`);
  if (!targetConv) return;
  const target = otherConversations.find(c => c.otherUser?.name === targetConv.trim());
  if (!target) {
    toast('Conversation not found', 'error');
    return;
  }
  // Send a copy of the message
  let contentToSend = msg.content;
  if (msg.type !== 'text') contentToSend = `📎 Forwarded attachment`;
  await sendMessage(target.conversationId, contentToSend);
  toast('Message forwarded', 'success');
}

// ── Reactions ───────────────────────────────────────────────────
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
  
  // Update cache and re-render
  messagesCache.set(activeConversation.conversationId, messagesCache.get(activeConversation.conversationId));
  renderMessages(activeConversation.conversationId);
  
  // Send reaction update to backend (simplified: send a special message type)
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

// ── Send message with reply support ──────────────────────────────
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

  sendMessageAsync(activeConversation.conversationId, msgData.content, tempId, msgData.replyTo);
}

async function sendMessageAsync(conversationId, content, tempId, replyTo = null) {
  try {
    const payload = { action: 'sendMessage', conversationId, senderId: currentUser.id, content: content.trim() };
    if (replyTo) payload.replyTo = JSON.stringify(replyTo);
    const result = await callAPI(payload);
    if (result.success) userLastActive.set(currentUser.id, Date.now());
    // Update cache...
  } catch (err) { /* ... */ }
}

// ── Other functions (unchanged) ──────────────────────────────────
function getDateLabel(timestamp) { /* unchanged */ }
function updateConversationLastMessage(convId, content) { /* unchanged */ }
async function handleUserSearch(query) { /* unchanged */ }
async function startConversationWithUser(userId) { /* unchanged */ }
function closeChat() { /* unchanged */ }
function scrollToBottom() { /* unchanged */ }
function escapeHtml(text) { /* unchanged */ }
function openContactInfo() { /* unchanged */ }
function setupMessengerEvents() { /* unchanged */ }
function startMessagePolling() { /* unchanged */ }
function stopMessagePolling() { /* unchanged */ }

// Exports
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;
window.addOptimisticMessage = addOptimisticMessage;