// ============================================================
//  MESSAGING & CONVERSATION LOGIC
// ============================================================

// Initialize messenger
function initializeMessenger() {
  if (!currentUser) return;
  
  // Update sidebar user info (remove @ symbol)
  updateSidebarUserInfo();
  
  // Load conversations
  loadConversations();
  
  // Set up event listeners
  setupMessengerEvents();
  
  // Start polling for new messages
  startMessagePolling();
  
  // Initialize profile and settings
  initProfile();
  initSettings();
}

// Update sidebar user info (without @ symbol)
function updateSidebarUserInfo() {
  document.getElementById('sidebar-name').textContent = currentUser.name;
  document.getElementById('sidebar-id').textContent = currentUser.id?.slice(0, 8) || '—';
  document.getElementById('sidebar-avatar').textContent = getInitials(currentUser.name);
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
  
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="no-results" style="padding: 32px 16px; text-align: center;">
        <span class="material-icons-round" style="font-size: 40px; color: var(--text-muted); margin-bottom: 12px;">chat</span>
        <p style="color: var(--text-secondary); font-size: 14px;">No conversations yet</p>
        <p style="color: var(--text-muted); font-size: 12px; margin-top: 4px;">Search for a user to start chatting</p>
      </div>
    `;
    return;
  }
  
  container.innerHTML = conversations.map(conv => {
    const otherUser = conv.otherUser || {};
    const lastMessage = conv.lastMessage || {};
    const isActive = activeConversation?.conversationId === conv.conversationId;
    
    return `
      <div class="conversation-item ${isActive ? 'active' : ''}" data-conversation-id="${conv.conversationId}">
        <div class="conv-avatar">${getInitials(otherUser.name)}</div>
        <div class="conv-info">
          <div class="conv-name">${escapeHtml(otherUser.name || 'Unknown')}</div>
          <div class="conv-last-message">${escapeHtml(lastMessage.content || 'No messages yet')}</div>
        </div>
        <div class="conv-meta">
          <span class="conv-time">${formatDate(lastMessage.timestamp)}</span>
          ${conv.unreadCount > 0 ? `<span class="conv-unread">${conv.unreadCount}</span>` : ''}
        </div>
      </div>
    `;
  }).join('');
  
  // Add click listeners
  container.querySelectorAll('.conversation-item').forEach(item => {
    item.addEventListener('click', () => {
      const convId = item.dataset.conversationId;
      const conversation = conversations.find(c => c.conversationId === convId);
      if (conversation) {
        openConversation(conversation);
      }
    });
  });
}

// Open a conversation
async function openConversation(conversation) {
  activeConversation = conversation;
  
  // Update UI
  document.getElementById('chat-empty-state').classList.add('hidden');
  document.getElementById('chat-active').classList.remove('hidden');
  
  // Update chat header
  const otherUser = conversation.otherUser || {};
  document.getElementById('chat-avatar').textContent = getInitials(otherUser.name);
  document.getElementById('chat-name').textContent = otherUser.name || 'Unknown';
  
  // Load messages
  await loadMessages(conversation.conversationId);
  
  // Update active state in sidebar
  renderConversationsList();
  
  // Scroll to bottom
  scrollToBottom();
  
  // Focus on message input
  document.getElementById('message-input').focus();
}

// Load messages for conversation
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
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div style="text-align: center; padding: 40px; color: var(--text-muted);">
        <span class="material-icons-round" style="font-size: 48px; margin-bottom: 12px;">chat_bubble_outline</span>
        <p>No messages yet. Say hello! 👋</p>
      </div>
    `;
    return;
  }
  
  // Group messages by date
  const groupedMessages = groupMessagesByDate(messages);
  let html = '';
  
  for (const [date, msgs] of groupedMessages) {
    // Add date separator
    html += `
      <div class="message-date-separator">
        <span>${date}</span>
      </div>
    `;
    
    // Add messages
    msgs.forEach(msg => {
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
  }
  
  container.innerHTML = html;
  
  scrollToBottom();
}

// Group messages by date
function groupMessagesByDate(messages) {
  const groups = new Map();
  
  messages.forEach(msg => {
    const date = new Date(msg.timestamp);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    let dateLabel;
    if (date.toDateString() === today.toDateString()) {
      dateLabel = 'Today';
    } else if (date.toDateString() === yesterday.toDateString()) {
      dateLabel = 'Yesterday';
    } else {
      dateLabel = date.toLocaleDateString('en-US', { 
        month: 'long', 
        day: 'numeric', 
        year: date.getFullYear() !== today.getFullYear() ? 'numeric' : undefined 
      });
    }
    
    if (!groups.has(dateLabel)) {
      groups.set(dateLabel, []);
    }
    groups.get(dateLabel).push(msg);
  });
  
  return groups;
}

// Send a message
async function handleSendMessage(e) {
  e.preventDefault();
  
  const input = document.getElementById('message-input');
  const content = input.value.trim();
  
  if (!content || !activeConversation) return;
  
  const btn = document.getElementById('send-message-btn');
  btn.disabled = true;
  
  try {
    const result = await sendMessage(activeConversation.conversationId, content);
    
    if (result.success) {
      input.value = '';
      
      // Add message to cache
      const messages = messagesCache.get(activeConversation.conversationId) || [];
      messages.push(result.message);
      messagesCache.set(activeConversation.conversationId, messages);
      
      // Re-render
      renderMessages(activeConversation.conversationId);
      
      // Refresh conversations list to update last message
      await loadConversations();
    } else {
      toast('Failed to send message.', 'error');
    }
  } catch (err) {
    console.error('Send message error:', err);
    toast('Failed to send message.', 'error');
  } finally {
    btn.disabled = false;
    input.focus();
  }
}

// Search users (triggered by button or debounced input)
async function handleUserSearch(query) {
  if (!query || query.length < 2) {
    document.getElementById('search-results').classList.add('hidden');
    return;
  }
  
  const result = await searchUsers(query);
  const resultsContainer = document.getElementById('search-results');
  
  if (!result.success || !result.users || result.users.length === 0) {
    resultsContainer.innerHTML = '<div class="no-results">No users found</div>';
    resultsContainer.classList.remove('hidden');
    return;
  }
  
  resultsContainer.innerHTML = result.users.map(user => `
    <div class="search-result-item" data-user-id="${user.id}">
      <div class="search-result-avatar">${getInitials(user.name)}</div>
      <div class="search-result-info">
        <div class="search-result-name">${escapeHtml(user.name)}</div>
        <div class="search-result-id">${user.id?.slice(0, 12) || '—'}</div>
      </div>
    </div>
  `).join('');
  
  resultsContainer.classList.remove('hidden');
  
  // Add click listeners
  resultsContainer.querySelectorAll('.search-result-item').forEach(item => {
    item.addEventListener('click', async () => {
      const userId = item.dataset.userId;
      await startConversationWithUser(userId);
      resultsContainer.classList.add('hidden');
      document.getElementById('user-search-input').value = '';
    });
  });
}

// Start conversation with user
async function startConversationWithUser(userId) {
  const result = await getOrCreateConversation(userId);
  
  if (result.success && result.conversation) {
    // Check if conversation already exists in list
    const existingConv = conversations.find(c => c.conversationId === result.conversation.conversationId);
    
    if (!existingConv) {
      conversations.unshift(result.conversation);
    }
    
    openConversation(result.conversation);
    renderConversationsList();
  } else {
    toast('Failed to start conversation.', 'error');
  }
}

// Close active chat
function closeChat() {
  activeConversation = null;
  document.getElementById('chat-empty-state').classList.remove('hidden');
  document.getElementById('chat-active').classList.add('hidden');
  renderConversationsList();
}

// Scroll messages to bottom
function scrollToBottom() {
  const container = document.getElementById('messages-container');
  setTimeout(() => {
    if (container) {
      container.scrollTop = container.scrollHeight;
    }
  }, 50);
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Setup messenger event listeners
function setupMessengerEvents() {
  // User search input (debounced)
  const searchInput = document.getElementById('user-search-input');
  searchInput.addEventListener('input', (e) => {
    clearTimeout(searchDebounceTimer);
    searchDebounceTimer = setTimeout(() => {
      handleUserSearch(e.target.value.trim());
    }, 300);
  });
  
  // Search button
  document.getElementById('search-btn').addEventListener('click', () => {
    const query = searchInput.value.trim();
    handleUserSearch(query);
  });
  
  // Press Enter in search input
  searchInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const query = searchInput.value.trim();
      handleUserSearch(query);
    }
  });
  
  // Hide search results when clicking outside
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.search-section')) {
      document.getElementById('search-results').classList.add('hidden');
    }
  });
  
  // Prevent search results from closing when clicking inside
  document.getElementById('search-results').addEventListener('click', (e) => {
    e.stopPropagation();
  });
  
  // Message form
  document.getElementById('message-form').addEventListener('submit', handleSendMessage);
  
  // Close chat
  document.getElementById('close-chat').addEventListener('click', closeChat);
  
  // Mobile back button (if applicable)
  window.addEventListener('popstate', (e) => {
    if (activeConversation) {
      closeChat();
    }
  });
}

// Start polling for new messages
function startMessagePolling() {
  stopMessagePolling();
  
  messagePollingInterval = setInterval(async () => {
    if (!currentUser) return;
    
    // Refresh conversations list
    await loadConversations();
    
    // If there's an active conversation, check for new messages
    if (activeConversation) {
      const result = await getMessages(activeConversation.conversationId);
      if (result.success) {
        const currentMessages = messagesCache.get(activeConversation.conversationId) || [];
        const newMessages = result.messages || [];
        
        // Only update if there are new messages
        if (newMessages.length > currentMessages.length) {
          messagesCache.set(activeConversation.conversationId, newMessages);
          renderMessages(activeConversation.conversationId);
          
          // Show notification for new incoming messages
          const lastMsg = newMessages[newMessages.length - 1];
          if (lastMsg && lastMsg.senderId !== currentUser.id) {
            // Check if the chat is currently visible
            const container = document.getElementById('messages-container');
            const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;
            
            if (!isNearBottom) {
              // Show new message indicator
              showNewMessageIndicator();
            }
            
            // Play notification sound (optional)
            // playMessageSound();
          }
        }
      }
    }
  }, 3000);
}

// Show new message indicator
function showNewMessageIndicator() {
  const container = document.getElementById('messages-container');
  const existingIndicator = container.querySelector('.new-message-indicator');
  
  if (existingIndicator) return;
  
  const indicator = document.createElement('div');
  indicator.className = 'new-message-indicator';
  indicator.innerHTML = `
    <span class="material-icons-round">arrow_downward</span>
    <span>New messages</span>
  `;
  indicator.addEventListener('click', scrollToBottom);
  
  container.appendChild(indicator);
  
  // Auto-hide after scrolling
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        indicator.remove();
        observer.disconnect();
      }
    });
  });
  
  observer.observe(container.lastElementChild);
}

// Stop message polling
function stopMessagePolling() {
  if (messagePollingInterval) {
    clearInterval(messagePollingInterval);
    messagePollingInterval = null;
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopMessagePolling();
  if (qrStream) {
    qrStream.getTracks().forEach(track => track.stop());
  }
});

// Export functions for global use (if needed)
window.openConversation = openConversation;
window.closeChat = closeChat;
window.renderConversationsList = renderConversationsList;