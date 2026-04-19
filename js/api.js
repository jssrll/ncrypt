// ============================================================
//  API COMMUNICATION LAYER
// ============================================================

// Call Google Apps Script API
async function callAPI(payload) {
  if (typeof SCRIPT_URL === 'undefined' || !SCRIPT_URL) {
    throw new Error('Script URL not configured');
  }
  
  const res = await fetch(SCRIPT_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify(payload),
    redirect: 'follow'
  });
  
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}`);
  }
  
  return res.json();
}

// Search users by query
async function searchUsers(query) {
  if (!query || query.length < 2) {
    return { success: true, users: [] };
  }
  
  try {
    const result = await callAPI({
      action: 'searchUsers',
      userId: currentUser?.id,
      query
    });
    return result;
  } catch (err) {
    console.error('Search users error:', err);
    return { success: false, users: [] };
  }
}

// Get conversations for current user
async function getConversations() {
  if (!currentUser) return { success: false, conversations: [] };
  
  try {
    const result = await callAPI({
      action: 'getConversations',
      userId: currentUser.id
    });
    return result;
  } catch (err) {
    console.error('Get conversations error:', err);
    return { success: false, conversations: [] };
  }
}

// Get or create conversation with another user
async function getOrCreateConversation(otherUserId) {
  if (!currentUser) return { success: false };
  
  try {
    const result = await callAPI({
      action: 'getOrCreateConversation',
      userId: currentUser.id,
      otherUserId
    });
    return result;
  } catch (err) {
    console.error('Get/create conversation error:', err);
    return { success: false };
  }
}

// Get messages for a conversation
async function getMessages(conversationId) {
  if (!currentUser) return { success: false, messages: [] };
  
  try {
    const result = await callAPI({
      action: 'getMessages',
      conversationId
    });
    return result;
  } catch (err) {
    console.error('Get messages error:', err);
    return { success: false, messages: [] };
  }
}

// Send a message
async function sendMessage(conversationId, content) {
  if (!currentUser) return { success: false };
  
  try {
    const result = await callAPI({
      action: 'sendMessage',
      conversationId,
      senderId: currentUser.id,
      content: content.trim()
    });
    return result;
  } catch (err) {
    console.error('Send message error:', err);
    return { success: false };
  }
}

// Login user
async function loginUser(email, passwordHash) {
  try {
    const result = await callAPI({
      action: 'login',
      email,
      password: passwordHash
    });
    return result;
  } catch (err) {
    console.error('Login error:', err);
    throw err;
  }
}

// Register user
async function registerUser(name, email, passwordHash) {
  try {
    const result = await callAPI({
      action: 'register',
      name,
      email,
      password: passwordHash
    });
    return result;
  } catch (err) {
    console.error('Register error:', err);
    throw err;
  }
}

// Upload file to Google Drive
async function uploadFile(fileName, mimeType, fileData) {
  try {
    const result = await callAPI({
      action: 'uploadFile',
      userId: currentUser?.id,
      fileName,
      mimeType,
      fileData
    });
    return result;
  } catch (err) {
    console.error('Upload file error:', err);
    return { success: false, message: 'Upload failed' };
  }
}