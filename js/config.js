// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzAJ3mPjWCu3x5SOxyiBOmzpuTBUjNuzR3d4nWgCsT8dHsEaWbTJ8h3DG8gjq6HlJeG/exec';

// Current authenticated user
let currentUser = null;

// Conversations list
let conversations = [];

// Currently active conversation
let activeConversation = null;

// Messages cache
let messagesCache = new Map();

// Debounce timer for search
let searchDebounceTimer = null;

// Polling interval for new messages
let messagePollingInterval = null;

// App name
const APP_NAME = 'ncrypt';