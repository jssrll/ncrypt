// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycby5dxU-lgR9MkO62MvrdxO0nr-uEevBzjGVSucrSfravmFk-QH1zZMa2SXs4okWYmsD/exec';

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