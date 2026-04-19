// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL - HARDCODED (replace with your actual Apps Script URL)
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw0jn7hZDqjWb52D-yoHDBSKi26o3kC-7GV8Mrc6t3uIIEIG63ZhvDzZ_xVSm3v30H0/exec';

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