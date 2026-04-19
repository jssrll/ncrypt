// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL - HARDCODED (replace with your actual Apps Script URL)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw4LRXZnuHYD0HW-OcOdQVlfcDX7VWVIY-cat719iAwaBWriYIJMruUaHyG2v7mEMED/exec';

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