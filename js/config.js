// ============================================================
//  CONFIGURATION & STATE
// ============================================================

// Backend URL
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyIA4l-9gEeBo19otK1C5pMRn5hb1efAkOLrsliaA2avido6obFTwtyDfxSjKe-Neo/exec';

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