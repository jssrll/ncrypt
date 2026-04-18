// ============================================================
// CONVO MESSENGER - CHAT FUNCTIONALITY
// ============================================================

let searchDebounce;

/**
 * Handle search input
 */
function handleSearch(query, immediate = false) {
  clearTimeout(searchDebounce);
  query = query.trim();

  if (!query) {
    hideEl('search-results');
    return;
  }

  const DELAY = immediate ? 0 : 700;
  searchDebounce = setTimeout(async () => {
    if (!/^\d{9}$/.test(query)) {
      renderSearchResults([]);
      return;
    }
    if (query === String(STATE.currentUser.userId)) {
      showToast("That's your own ID!", 'info');
      return;
    }
    try {
      const res = await apiCall({ action: 'searchUser', userId: query });
      renderSearchResults(res.ok ? [res] : []);
    } catch (e) {
      renderSearchResults([]);
    }
  }, DELAY);
}

/**
 * Render search results
 */
function renderSearchResults(results) {
  const el = document.getElementById('search-results');
  if (!results.length) {
    el.innerHTML = `<div class="search-result-item" style="justify-content:center;color:var(--text-muted);font-size:13px;">No user found with that ID.</div>`;
    showEl('search-results');
    return;
  }
  el.innerHTML = results.map(r => `
    <div class="search-result-item" onclick="openChat('${r.userId}','${escHtml(r.name)}')">
      <div class="result-avatar av-purple">${initials(r.name)}</div>
      <div class="result-info">
        <p>${escHtml(r.name)}</p>
        <span>ID: ${r.userId}</span>
      </div>
    </div>
  `).join('');
  showEl('search-results');
}

/**
 * Load conversations list
 */
async function loadConversations() {
  try {
    const res = await apiCall({ action: 'getConvs', userId: STATE.currentUser.userId });
    if (res.ok) {
      STATE.conversations = res.conversations;
      renderConversations();
    }
  } catch (e) {
    // Silent fail
  }
}

/**
 * Render conversations list
 */
function renderConversations() {
  const list = document.getElementById('conversations-list');
  const convs = STATE.conversations;

  if (!convs.length) {
    list.innerHTML = `
      <div class="empty-convs">
        <span style="font-size:28px">💬</span>
        <p>No conversations yet.<br>Search for a user by their ID to start chatting.</p>
      </div>`;
    return;
  }

  const colors = ['av-purple', 'av-blue', 'av-green', 'av-pink', 'av-teal', 'av-orange'];

  list.innerHTML = convs.map((c, i) => {
    const active = STATE.activeChat && STATE.activeChat.userId === c.otherId ? 'active' : '';
    const color = colors[i % colors.length];
    return `
      <div class="conv-item ${active}" onclick="openChat('${c.otherId}','${escHtml(c.otherName)}')">
        <div class="conv-avatar ${color}">${initials(c.otherName)}</div>
        <div class="conv-info">
          <div class="conv-top">
            <span class="conv-name">${escHtml(c.otherName)}</span>
            <span class="conv-time">${formatTime(c.timestamp)}</span>
          </div>
          <div class="conv-preview">${escHtml(c.content)}</div>
        </div>
      </div>`;
  }).join('');
}

/**
 * Open a chat with a user
 */
function openChat(userId, name) {
  STATE.activeChat = { userId, name };

  document.getElementById('search-input').value = '';
  hideEl('search-results');

  document.getElementById('chat-name').textContent = name;
  document.getElementById('chat-id').textContent = `ID: ${userId}`;
  document.getElementById('chat-avatar').textContent = initials(name);

  showView('chat');
  renderConversations();
  loadMessages(userId);

  if (window.innerWidth <= 768) closeSidebar();
}

/**
 * Load messages for active chat
 */
async function loadMessages(otherUserId) {
  try {
    const res = await apiCall({
      action: 'getMessages',
      userId1: STATE.currentUser.userId,
      userId2: otherUserId
    });
    if (res.ok) {
      STATE.messages = res.messages;
      STATE.lastMsgCount = res.messages.length;
      renderMessages();
    }
  } catch (e) {
    // Silent fail
  }
}

/**
 * Render messages
 */
function renderMessages() {
  const area = document.getElementById('messages-area');
  const msgs = STATE.messages;
  const myId = String(STATE.currentUser.userId);

  if (!msgs.length) {
    area.innerHTML = `
      <div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:center;color:var(--text-muted);padding:40px 20px;text-align:center;">
        <div style="font-size:36px;margin-bottom:12px;">👋</div>
        <p style="font-size:14px;">Say hello! Start the conversation.</p>
      </div>`;
    return;
  }

  let lastDate = '';
  let html = '';

  msgs.forEach((m, i) => {
    const isSent = String(m.fromId) === myId;
    const mDate = new Date(m.timestamp).toDateString();

    if (mDate !== lastDate) {
      html += `<div class="msg-date-divider">${formatDate(m.timestamp)}</div>`;
      lastDate = mDate;
    }

    html += `
      <div class="msg-row ${isSent ? 'sent' : 'received'}">
        <div class="msg-bubble">${escHtml(m.content)}</div>
        <span class="msg-time">${formatTimeShort(m.timestamp)}</span>
      </div>`;
  });

  area.innerHTML = html;
  area.scrollTop = area.scrollHeight;
}

/**
 * Send a message
 */
async function sendMessage() {
  const input = document.getElementById('msg-input');
  const text = input.value.trim();
  if (!text || !STATE.activeChat) return;

  input.value = '';
  autoResize(input);

  const sendBtn = document.getElementById('send-btn');
  sendBtn.disabled = true;

  STATE.messages.push({
    fromId: STATE.currentUser.userId,
    toId: STATE.activeChat.userId,
    content: text,
    timestamp: new Date().toISOString()
  });
  renderMessages();

  try {
    await apiCall({
      action: 'sendMessage',
      fromId: STATE.currentUser.userId,
      toId: STATE.activeChat.userId,
      content: text
    });
    loadConversations();
  } catch (e) {
    showToast('Failed to send message.', 'error');
  }

  sendBtn.disabled = false;
  input.focus();
}

/**
 * Poll for new messages
 */
async function pollMessages() {
  if (!STATE.activeChat) {
    await loadConversations();
    return;
  }
  try {
    const res = await apiCall({
      action: 'getMessages',
      userId1: STATE.currentUser.userId,
      userId2: STATE.activeChat.userId
    });
    if (res.ok && res.messages.length !== STATE.lastMsgCount) {
      STATE.messages = res.messages;
      STATE.lastMsgCount = res.messages.length;
      renderMessages();
    }
    await loadConversations();
  } catch (e) {
    // Silent fail
  }
}

/**
 * Handle message input keydown
 */
function onMsgKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
}

console.log('✅ Convo Chat Loaded');