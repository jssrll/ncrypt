// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbwPtyZVdU6J35o4MtI5DkRth0nHBF5OcAUQ3PO3r8cWuBzJL2Fcjz-J5TSo2B_O1R5b/exec';

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