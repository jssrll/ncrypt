// ========================================
// NCRYPT - CHAT FUNCTIONALITY
// ========================================

let conversations = [];
let currentConversation = null;
let messages = [];
let refreshInterval = null;
let isLoading = false;

// ========================================
// INITIALIZATION
// ========================================

function initChat() {
  setupChatListeners();
  loadConversations();
  startAutoRefresh();
  
  // Set up copy ID button
  document.getElementById('copyIdBtn').addEventListener('click', copyUserId);
}

function setupChatListeners() {
  // Mobile menu
  document.getElementById('mobileMenuBtn').addEventListener('click', openSidebar);
  document.getElementById('closeSidebarBtn').addEventListener('click', closeSidebar);
  document.getElementById('mobileOverlay').addEventListener('click', closeSidebar);
  
  // Search
  document.getElementById('searchBtn').addEventListener('click', handleSearch);
  document.getElementById('searchInput').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') handleSearch();
  });
  
  // Refresh
  document.getElementById('refreshConversationsBtn').addEventListener('click', () => {
    loadConversations();
    showToast('Conversations refreshed', 'success');
  });
  
  document.getElementById('manualRefreshBtn').addEventListener('click', () => {
    if (currentConversation) {
      loadMessages(currentConversation.conversationId);
      showToast('Messages refreshed', 'success');
    }
  });
  
  // Message form
  document.getElementById('messageForm').addEventListener('submit', handleSendMessage);
  
  // Chat info
  document.getElementById('chatInfoBtn').addEventListener('click', () => {
    if (currentConversation) {
      showToast(`Chatting with ${currentConversation.otherUser.fullName}`, 'info');
    }
  });
}

// ========================================
// SIDEBAR CONTROL
// ========================================

function openSidebar() {
  document.getElementById('sidebar').classList.add('open');
  document.getElementById('mobileOverlay').style.display = 'block';
}

function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('mobileOverlay').style.display = 'none';
}

// ========================================
// AUTO REFRESH
// ========================================

function startAutoRefresh() {
  if (refreshInterval) clearInterval(refreshInterval);
  
  refreshInterval = setInterval(() => {
    // Refresh conversations list
    loadConversations(true);
    
    // Refresh messages if chat is open
    if (currentConversation) {
      loadMessages(currentConversation.conversationId, true);
      
      // Show spinner briefly
      const spinner = document.getElementById('refreshSpinner');
      spinner.style.display = 'inline-block';
      setTimeout(() => {
        spinner.style.display = 'none';
      }, 500);
    }
  }, CONFIG.REFRESH_INTERVAL);
}

// ========================================
// SEARCH
// ========================================

async function handleSearch() {
  const searchInput = document.getElementById('searchInput');
  const searchId = searchInput.value.trim();
  
  if (!searchId) {
    showToast('Please enter a 9-digit ID', 'error');
    return;
  }
  
  if (searchId === currentUser.userId.toString()) {
    showToast('You cannot search for yourself', 'error');
    return;
  }
  
  const resultsDiv = document.getElementById('searchResults');
  resultsDiv.innerHTML = '<div class="empty-state"><i class="fas fa-spinner fa-spin"></i><p>Searching...</p></div>';
  resultsDiv.style.display = 'block';
  
  const result = await callAPI('searchUser', {
    sessionToken: currentSession,
    searchId: searchId
  });
  
  if (result.success) {
    displaySearchResult(result.user);
  } else {
    resultsDiv.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-user-slash"></i>
        <p>User not found</p>
        <span>Check the ID and try again</span>
      </div>
    `;
  }
  
  searchInput.value = '';
}

function displaySearchResult(user) {
  const resultsDiv = document.getElementById('searchResults');
  
  resultsDiv.innerHTML = `
    <div class="search-result-item" onclick="startConversation('${user.userId}')">
      <div class="avatar small" style="background: ${getAvatarColor(user.userId.toString())}">
        <span>${user.fullName.charAt(0).toUpperCase()}</span>
      </div>
      <div class="search-result-info">
        <h5>${escapeHtml(user.fullName)}</h5>
        <p>ID: ${user.userId}</p>
      </div>
      <i class="fas fa-comment-dots" style="margin-left: auto; color: var(--accent);"></i>
    </div>
  `;
}

async function startConversation(userId) {
  closeSidebar();
  document.getElementById('searchResults').style.display = 'none';
  
  showToast('Starting conversation...', 'info');
  
  // Send a dummy message to create conversation
  const result = await callAPI('sendMessage', {
    sessionToken: currentSession,
    receiverId: userId,
    message: '👋 Hello!'
  });
  
  if (result.success) {
    showToast('Conversation started!', 'success');
    loadConversations();
    
    // Find and open the conversation
    setTimeout(() => {
      const conv = conversations.find(c => c.otherUser.userId == userId);
      if (conv) {
        openConversation(conv);
      }
    }, 500);
  } else {
    showToast(result.error || 'Failed to start conversation', 'error');
  }
}

// ========================================
// CONVERSATIONS
// ========================================

async function loadConversations(silent = false) {
  if (!currentSession) return;
  
  const result = await callAPI('getConversations', {
    sessionToken: currentSession
  });
  
  if (result.success) {
    conversations = result.conversations || [];
    renderConversationsList();
  } else if (!silent) {
    showToast(result.error || 'Failed to load conversations', 'error');
  }
}

function renderConversationsList() {
  const container = document.getElementById('conversationsList');
  
  if (conversations.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <i class="fas fa-comments"></i>
        <p>No conversations yet</p>
        <span>Search for a user to start chatting</span>
      </div>
    `;
    return;
  }
  
  let html = '';
  conversations.forEach(conv => {
    const isActive = currentConversation?.conversationId === conv.conversationId;
    const avatarColor = getAvatarColor(conv.otherUser.userId.toString());
    
    html += `
      <div class="conversation-item ${isActive ? 'active' : ''}" onclick="openConversationById('${conv.conversationId}')">
        <div class="avatar small" style="background: ${avatarColor}">
          <span>${conv.otherUser.fullName.charAt(0).toUpperCase()}</span>
        </div>
        <div class="conversation-info">
          <div class="conversation-name">${escapeHtml(conv.otherUser.fullName)}</div>
          <div class="conversation-preview">Tap to view messages</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
}

function openConversationById(conversationId) {
  const conv = conversations.find(c => c.conversationId === conversationId);
  if (conv) {
    openConversation(conv);
    closeSidebar();
  }
}

function openConversation(conversation) {
  currentConversation = conversation;
  
  // Save to storage
  localStorage.setItem(STORAGE_KEYS.CURRENT_CONVERSATION, JSON.stringify(conversation));
  
  // Update UI
  document.getElementById('welcomeScreen').style.display = 'none';
  document.getElementById('chatArea').style.display = 'flex';
  document.getElementById('chatInfoBtn').style.display = 'block';
  
  // Update header
  document.getElementById('chatHeaderName').textContent = conversation.otherUser.fullName;
  document.getElementById('chatHeaderStatus').textContent = `ID: ${conversation.otherUser.userId}`;
  
  // Update active state in sidebar
  renderConversationsList();
  
  // Load messages
  loadMessages(conversation.conversationId);
  
  // Focus input
  document.getElementById('messageInput').focus();
}

async function loadMessages(conversationId, silent = false) {
  if (!currentSession) return;
  
  const result = await callAPI('getMessages', {
    sessionToken: currentSession,
    conversationId: conversationId
  });
  
  if (result.success) {
    messages = result.messages || [];
    renderMessages();
  } else if (!silent) {
    showToast(result.error || 'Failed to load messages', 'error');
  }
}

function renderMessages() {
  const container = document.getElementById('messagesList');
  
  if (messages.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="padding: 40px 20px;">
        <i class="fas fa-comment-dots"></i>
        <p>No messages yet</p>
        <span>Send a message to start the conversation</span>
      </div>
    `;
    return;
  }
  
  let html = '';
  messages.forEach(msg => {
    const isOwn = msg.isOwn;
    const time = formatMessageTime(msg.timestamp);
    
    html += `
      <div class="message-item ${isOwn ? 'sent' : 'received'}">
        <div class="message-bubble">
          <div class="message-text">${escapeHtml(msg.message)}</div>
          <div class="message-time">${time}</div>
        </div>
      </div>
    `;
  });
  
  container.innerHTML = html;
  
  // Scroll to bottom
  setTimeout(() => {
    document.getElementById('scrollAnchor').scrollIntoView({ behavior: 'smooth' });
  }, 100);
}

// ========================================
// SEND MESSAGE
// ========================================

async function handleSendMessage(e) {
  e.preventDefault();
  
  if (!currentConversation) {
    showToast('No conversation selected', 'error');
    return;
  }
  
  const input = document.getElementById('messageInput');
  const message = input.value.trim();
  
  if (!message) return;
  
  const btn = document.getElementById('sendMessageBtn');
  btn.disabled = true;
  input.value = '';
  
  const result = await callAPI('sendMessage', {
    sessionToken: currentSession,
    receiverId: currentConversation.otherUser.userId,
    message: message
  });
  
  btn.disabled = false;
  
  if (result.success) {
    // Reload messages
    await loadMessages(currentConversation.conversationId);
    
    // Refresh conversations to update order
    loadConversations(true);
  } else {
    showToast(result.error || 'Failed to send message', 'error');
    input.value = message; // Restore message
  }
  
  input.focus();
}

// ========================================
// CLEANUP
// ========================================

function stopAutoRefresh() {
  if (refreshInterval) {
    clearInterval(refreshInterval);
    refreshInterval = null;
  }
}

// Clean up on page unload
window.addEventListener('beforeunload', () => {
  stopAutoRefresh();
});

console.log('✅ ncrypt Chat Loaded');

// ========================================
// INITIALIZE EVERYTHING
// ========================================

document.addEventListener('DOMContentLoaded', () => {
  setupAuthListeners();
  initAuth();
});