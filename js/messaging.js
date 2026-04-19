// ============================================================
//  MESSAGING - OPTIMIZED WITH RETURN BUTTON
// ============================================================

// Initialize messenger
function initializeMessenger() {
  if (!currentUser) return;
  
  // Load conversations
  loadConversations();
  
  // Set up event listeners
  setupMessengerEvents();
  
  // Start polling for new messages
  startMessagePolling();
  
  // Initialize profile and settings
  if (typeof initProfile === 'function') initProfile();
  if (typeof initSettings === 'function') initSettings();
}

// Load conversations
async function loadConversations() {
  try {
    const result = await getConversations();
    
    if (result.success) {
      conversations = result.conversations || [];
      renderConversationsList();
    }
  } catch (err) {
    console.error('Load conversations error:', err);
  }
}

// Render conversations list (optimized)
function renderConversationsList() {
  const container = document.getElementById('conversations-list');
  if (!container) return;
  
  if (!conversations || !conversations.length) {
    container.innerHTML = `
      <div style="padding: 40px 16px; text-align: center;">
        <span class="material-icons-round" style="font-size: 48px; color: var(--text-muted); margin-bottom: 12px;">chat</span>
        <p style="color: var(--text-secondary); font-size: 15px; font-weight: 500;">No conversations yet</p>
        <p style="color: var(--text-muted); font-size: 13px; margin-top: 4px;">Search for a user to start chatting</p>
      </div>
    `;
    return;
  }
  
  // Sort conversations by last message time (newest first)
  const sortedConversations = [...conversations].sort((a, b) => {
    const timeA = a.lastMessage?.timestamp || a.updatedAt || a.createdAt || '';
    const timeB = b.lastMessage?.timestamp || b.updatedAt || b.createdAt || '';
    return timeB.localeCompare(timeA);
  });
  
  const html = sortedConversations.map(conv => {
    const other = conv.otherUser || {};
    const last = conv.lastMessage || {};
    const isActive = activeConversation?.conversationId === conv.conversationId;
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(other.name || '?')}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(other.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(last.content || 'No messages yet')}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${formatDate(last.timestamp || conv.updatedAt)}</span>
          ${conv.unreadCount ? `<span class="conv-unread">${conv.unreadCount > 99 ? '99+' : conv.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  container.innerHTML = html;
  
  // Add click listeners using event delegation for better performance
  container.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const conv = conversations.find(c => c.conversationId === item.dataset.id);
      if (conv) openConversation(conv);
    });
  });
}

// Message cache for instant loading
const messageCache = new Map();

// Open a conversation
function openConversation(conversation) {
  if (!conversation) return;
  
  activeConversation = conversation;
  
  // Update header
  const other = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(other.name || '?');
  document.getElementById('chat-name').textContent = other.name || 'Unknown';
  document.getElementById('chat-status').textContent = 'Online';
  
  // Make chat header clickable to view profile
  const chatUserInfo = document.getElementById('chat-user-info-click');
  if (chatUserInfo) {
    chatUserInfo.onclick = () => viewOtherUserProfile(other);
  }
  
  // Profile button in chat header
  const chatProfileBtn = document.getElementById('chat-profile-btn');
  if (chatProfileBtn) {
    chatProfileBtn.onclick = () => viewOtherUserProfile(other);
  }
  
  // Check cache first for instant display
  if (messageCache.has(conversation.conversationId)) {
    renderMessagesFromCache(conversation.conversationId);
  } else {
    // Show loading skeleton
    showMessageSkeleton();
    loadMessages(conversation.conversationId);
  }
  
  // Navigate to chat screen (mobile slide)
  const conversationsScreen = document.getElementById('conversations-screen');
  const chatScreen = document.getElementById('chat-screen');
  
  if (conversationsScreen && chatScreen) {
    conversationsScreen.classList.add('hidden');
    chatScreen.classList.remove('hidden');
  }
  
  // Focus on input
  setTimeout(() => {
    const input = document.getElementById('message-input');
    if (input) input.focus();
  }, 100);
  
  // Mark conversation as read
  markConversationAsRead(conversation.conversationId);
}

// Show message loading skeleton
function showMessageSkeleton() {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  container.innerHTML = `
    <div style="padding: 16px;">
      <div style="display: flex; gap: 12px; margin-bottom: 16px;">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text" style="width: 60%;"></div>
          <div class="skeleton skeleton-text-sm" style="width: 40%;"></div>
        </div>
      </div>
      <div style="display: flex; gap: 12px; margin-bottom: 16px; justify-content: flex-end;">
        <div style="flex: 1; max-width: 70%;">
          <div class="skeleton skeleton-text" style="width: 100%;"></div>
          <div class="skeleton skeleton-text-sm" style="width: 30%; margin-left: auto;"></div>
        </div>
      </div>
      <div style="display: flex; gap: 12px;">
        <div class="skeleton skeleton-avatar"></div>
        <div style="flex: 1;">
          <div class="skeleton skeleton-text" style="width: 80%;"></div>
          <div class="skeleton skeleton-text-sm" style="width: 50%;"></div>
        </div>
      </div>
    </div>
  `;
}

// View other user's profile
function viewOtherUserProfile(user) {
  if (!user) return;
  
  // Create a simple profile view
  const profileHtml = `
    <div style="text-align: center; padding: 20px;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, var(--accent), var(--accent-dark)); display: flex; align-items: center; justify-content: center; color: #fff; font-size: 28px; font-weight: 700; margin: 0 auto 16px;">
        ${getInitials(user.name)}
      </div>
      <h3 style="font-size: 18px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(user.name)}</h3>
      <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 8px;">${escapeHtml(user.email || 'No email')}</p>
      <p style="color: var(--text-muted); font-size: 12px; font-family: monospace;">ID: ${user.id?.slice(0, 16) || '—'}</p>
    </div>
  `;
  
  // Show in a modal or alert
  // For now, show basic toast with info
  toast(`${user.name} • ID: ${user.id?.slice(0, 8) || '—'}`, 'info');
  
  // You can also store this to show in a proper modal
  console.log('View profile:', user);
}

// Mark conversation as read
async function markConversationAsRead(conversationId) {
  try {
    // Update local unread count
    const conv = conversations.find(c => c.conversationId === conversationId);
    if (conv) {
      conv.unreadCount = 0;
      renderConversationsList();
    }
    
    // Call API to mark as read (if implemented)
    if (typeof callAPI === 'function') {
      await callAPI({
        action: 'markAsRead',
        conversationId,
        userId: currentUser.id
      });
    }
  } catch (err) {
    console.error('Mark as read error:', err);
  }
}

// Render messages from cache
function renderMessagesFromCache(conversationId) {
  const messages = messageCache.get(conversationId) || [];
  renderMessagesArray(messages);
}

// Load messages from server
async function loadMessages(conversationId) {
  try {
    const result = await getMessages(conversationId);
    
    if (result.success) {
      const messages = result.messages || [];
      messageCache.set(conversationId, messages);
      renderMessagesArray(messages);
    } else {
      showEmptyMessages();
    }
  } catch (err) {
    console.error('Load messages error:', err);
    showEmptyMessages();
  }
}

// Show empty messages state
function showEmptyMessages() {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  container.innerHTML = `
    <div style="text-align: center; padding: 40px; color: var(--text-muted);">
      <span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px;">chat_bubble_outline</span>
      <p style="font-size: 15px; font-weight: 500;">No messages yet</p>
      <p style="font-size: 13px; margin-top: 4px;">Say hello! 👋</p>
    </div>
  `;
}

// Render messages array (optimized)
function renderMessagesArray(messages) {
  const container = document.getElementById('messages-container');
  if (!container) return;
  
  if (!messages || !messages.length) {
    showEmptyMessages();
    return;
  }
  
  // Sort messages by timestamp
  const sortedMessages = [...messages].sort((a, b) => 
    (a.timestamp || '').localeCompare(b.timestamp || '')
  );
  
  let html = '';
  let lastDate = '';
  let lastSender = '';
  let lastTime = '';
  
  sortedMessages.forEach((msg, index) => {
    const msgDate = new Date(msg.timestamp).toDateString();
    const msgTime = formatMessageTime(msg.timestamp);
    const isOutgoing = msg.senderId === currentUser.id;
    const showDate = msgDate !== lastDate;
    
    // Date separator
    if (showDate) {
      lastDate = msgDate;
      const today = new Date().toDateString();
      const yesterday = new Date(Date.now() - 86400000).toDateString();
      let label = msgDate === today ? 'Today' : msgDate === yesterday ? 'Yesterday' : 
        new Date(msg.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      
      html += `<div class="message-date-separator"><span>${label}</span></div>`;
    }
    
    // Message bubble
    const pendingClass = msg.pending ? 'pending' : '';
    const failedClass = msg.failed ? 'failed' : '';
    
    html += `
      <div class="message-row ${isOutgoing ? 'outgoing' : 'incoming'}">
        <div class="message-bubble ${pendingClass} ${failedClass}">
          ${escapeHtml(msg.content)}
          <div class="message-time">
            ${formatMessageTime(msg.timestamp)}
            ${msg.pending ? ' • Sending...' : ''}
            ${msg.failed ? ' • Failed' : ''}
          </div>
        </div>
      </div>
    `;
    
    lastSender = msg.senderId;
    lastTime = msgTime;
  });
  
  container.innerHTML = html;
  
  // Scroll to bottom
  scrollToBottom();
}

// Send message (optimistic update)
async function handleSendMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (!content || !activeConversation) return;
  
  // Clear input immediately for instant feel
  input.value = '';
  
  // Create optimistic message
  const tempId = 'temp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5);
  const tempMessage = {
    id: tempId,
    conversationId: activeConversation.conversationId,
    senderId: currentUser.id,
    content: content,
    timestamp: new Date().toISOString(),
    pending: true
  };
  
  // Add to cache and render immediately
  const cached = messageCache.get(activeConversation.conversationId) || [];
  cached.push(tempMessage);
  messageCache.set(activeConversation.conversationId, cached);
  renderMessagesArray(cached);
  
  // Update conversation list optimistically
  updateConversationLastMessage(activeConversation.conversationId, content);
  
  // Send to server
  try {
    const result = await sendMessage(activeConversation.conversationId, content);
    
    if (result.success) {
      // Replace temp message with real one
      const messages = messageCache.get(activeConversation.conversationId) || [];
      const index = messages.findIndex(m => m.id === tempId);
      
      if (index !== -1) {
        messages[index] = { ...result.message, pending: false };
        messageCache.set(activeConversation.conversationId, messages);
        renderMessagesArray(messages);
      }
      
      // Refresh conversations list
      await loadConversations();
    } else {
      // Mark as failed
      markMessageAsFailed(activeConversation.conversationId, tempId);
      toast('Failed to send message', 'error');
    }
  } catch (err) {
    console.error('Send message error:', err);
    markMessageAsFailed(activeConversation.conversationId, tempId);
    
    // If offline, save for later
    if (!navigator.onLine && typeof saveOfflineMessage === 'function') {
      saveOfflineMessage('/api/messages', {
        conversationId: activeConversation.conversationId,
        content: content
      });
    }
  }
  
  // Refocus input
  setTimeout(() => input.focus(), 50);
}

// Mark message as failed
function markMessageAsFailed(conversationId, messageId) {
  const messages = messageCache.get(conversationId) || [];
  const index = messages.findIndex(m => m.id === messageId);
  
  if (index !== -1) {
    messages[index].pending = false;
    messages[index].failed = true;
    messageCache.set(conversationId, messages);
    renderMessagesArray(messages);
  }
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
    
    // Move to top of list
    conversations = conversations.filter(c => c.conversationId !== convId);
    conversations.unshift(conv);
    
    renderConversationsList();
  }
}

// Go back to conversations (return button)
function goBackToConversations() {
  const chatScreen = document.getElementById('chat-screen');
  const conversationsScreen = document.getElementById('conversations-screen');
  
  if (chatScreen && conversationsScreen) {
    chatScreen.classList.add('hidden');
    conversationsScreen.classList.remove('hidden');
  }
  
  activeConversation = null;
  renderConversationsList();
}

// Search users
async function handleUserSearch(query) {
  if (!query || query.length < 2) {
    const results = document.getElementById('search-results');
    if (results) results.classList.add('hidden');
    return;
  }
  
  try {
    const result = await searchUsers(query);
    const container = document.getElementById('search-results');
    
    if (!container) return;
    
    if (!result.success || !result.users || !result.users.length) {
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
    
    // Add click listeners
    container.querySelectorAll('.search-result-item').forEach(item => {
      item.addEventListener('click', async () => {
        container.classList.add('hidden');
        const searchInput = document.getElementById('user-search-input');
        if (searchInput) searchInput.value = '';
        
        await startConversationWithUser(item.dataset.id);
      });
    });
  } catch (err) {
    console.error('Search error:', err);
  }
}

// Start conversation with user
async function startConversationWithUser(userId) {
  try {
    const result = await getOrCreateConversation(userId);
    
    if (result.success && result.conversation) {
      // Check if conversation exists
      const existingConv = conversations.find(c => c.conversationId === result.conversation.conversationId);
      
      if (!existingConv) {
        conversations.unshift(result.conversation);
      }
      
      openConversation(result.conversation);
      renderConversationsList();
    } else {
      toast('Failed to start conversation', 'error');
    }
  } catch (err) {
    console.error('Start conversation error:', err);
    toast('Failed to start conversation', 'error');
  }
}

// Scroll to bottom
function scrollToBottom() {
  requestAnimationFrame(() => {
    const container = document.getElementById('messages-container');
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  });
}

// Setup messenger events
function setupMessengerEvents() {
  // Search input
  const searchInput = document.getElementById('user-search-input');
  let searchDebounce;
  
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      clearTimeout(searchDebounce);
      searchDebounce = setTimeout(() => {
        handleUserSearch(e.target.value.trim());
      }, 250);
    });
    
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        clearTimeout(searchDebounce);
        handleUserSearch(searchInput.value.trim());
      }
    });
  }
  
  // Search button
  const searchBtn = document.getElementById('search-btn');
  if (searchBtn && searchInput) {
    searchBtn.addEventListener('click', () => {
      handleUserSearch(searchInput.value.trim());
    });
  }
  
  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    const searchSection = e.target.closest('.search-section');
    const searchResults = document.getElementById('search-results');
    
    if (!searchSection && searchResults) {
      searchResults.classList.add('hidden');
    }
  });
  
  // Message form
  const messageForm = document.getElementById('message-form');
  if (messageForm) {
    messageForm.addEventListener('submit', handleSendMessage);
  }
  
  // Back button
  const backBtn = document.getElementById('back-to-conversations');
  if (backBtn) {
    backBtn.addEventListener('click', goBackToConversations);
  }
  
  // Attach button
  const attachBtn = document.getElementById('attach-btn');
  if (attachBtn) {
    attachBtn.addEventListener('click', () => {
      toast('File sharing coming soon', 'info');
    });
  }
  
  // Prevent search results from closing when clicking inside
  const searchResults = document.getElementById('search-results');
  if (searchResults) {
    searchResults.addEventListener('click', (e) => {
      e.stopPropagation();
    });
  }
}

// Message polling (lightweight)
let messagePollingInterval = null;

function startMessagePolling() {
  stopMessagePolling();
  
  messagePollingInterval = setInterval(async () => {
    if (!currentUser) return;
    if (document.hidden) return; // Don't poll when tab is hidden
    
    try {
      // Refresh conversations list
      await loadConversations();
      
      // Check for new messages in active conversation
      if (activeConversation) {
        const result = await getMessages(activeConversation.conversationId);
        
        if (result.success) {
          const cached = messageCache.get(activeConversation.conversationId) || [];
          const fresh = result.messages || [];
          
          // Only update if there are new messages
          if (fresh.length > cached.length) {
            messageCache.set(activeConversation.conversationId, fresh);
            
            // Only re-render if we're still in this conversation
            if (activeConversation?.conversationId === result.conversationId) {
              renderMessagesArray(fresh);
            }
            
            // Show notification for new incoming messages
            const lastMsg = fresh[fresh.length - 1];
            if (lastMsg && lastMsg.senderId !== currentUser.id) {
              showNewMessageNotification(lastMsg);
            }
          }
        }
      }
    } catch (err) {
      console.error('Polling error:', err);
    }
  }, 3000);
}

// Show new message notification
function showNewMessageNotification(message) {
  const conv = conversations.find(c => c.conversationId === message.conversationId);
  if (!conv) return;
  
  const other = conv.otherUser || {};
  
  // Use PWA notification if available and permitted
  if (Notification && Notification.permission === 'granted' && document.hidden) {
    new Notification(`ncrypt — ${other.name}`, {
      body: message.content,
      icon: '/icons/icon-192x192.png',
      badge: '/icons/icon-72x72.png',
      vibrate: [200, 100, 200],
      tag: `msg-${message.conversationId}`,
      renotify: true
    });
  } else {
    // Fallback to toast
    toast(`${other.name}: ${message.content.slice(0, 30)}${message.content.length > 30 ? '...' : ''}`, 'info');
  }
}

function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
}

// Escape HTML
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Format date
function formatDate(iso) {
  if (!iso) return '';
  
  const d = new Date(iso);
  const now = new Date();
  const diffMs = now - d;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format message time
function formatMessageTime(iso) {
  if (!iso) return '';
  
  return new Date(iso).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
}

// Get initials
function getInitials(name) {
  if (!name) return '?';
  
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopMessagePolling();
});

// Handle visibility change
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // Tab hidden - slow down polling
    stopMessagePolling();
    messagePollingInterval = setInterval(async () => {
      if (!currentUser) return;
      await loadConversations();
    }, 10000); // 10 seconds when hidden
  } else {
    // Tab visible - resume normal polling
    stopMessagePolling();
    startMessagePolling();
    if (currentUser) loadConversations();
  }
});

// Expose functions globally
window.openConversation = openConversation;
window.goBackToConversations = goBackToConversations;
window.renderConversationsList = renderConversationsList;
window.loadConversations = loadConversations;
window.startConversationWithUser = startConversationWithUser;