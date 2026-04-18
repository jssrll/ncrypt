// ============================================================
// CONVO MESSENGER - MAIN APPLICATION
// ============================================================

// Global state
const STATE = {
  scriptUrl: '',
  currentUser: null,
  activeChat: null,
  conversations: [],
  messages: [],
  pollTimer: null,
  lastMsgCount: 0
};

/**
 * Save Apps Script URL and continue to auth
 */
function saveScriptUrl() {
  const url = document.getElementById('setup-url').value.trim();
  if (!url.startsWith('https://script.google.com')) {
    showToast('Enter a valid Apps Script URL.', 'error');
    return;
  }
  STATE.scriptUrl = url;
  localStorage.setItem(STORAGE_KEYS.SCRIPT_URL, url);
  hideEl('setup-screen');
  showEl('auth-screen');
}

/**
 * Show script modal
 */
function showScriptModal() {
  document.getElementById('script-code-block').textContent = APPS_SCRIPT_CODE;
  showEl('script-modal');
}

/**
 * Close script modal
 */
function closeScriptModal() {
  hideEl('script-modal');
}

/**
 * Copy script code to clipboard
 */
function copyScriptCode() {
  navigator.clipboard.writeText(APPS_SCRIPT_CODE)
    .then(() => showToast('Code copied to clipboard!', 'success'))
    .catch(() => showToast('Copy failed — please copy manually.', 'error'));
}

/**
 * Show main app
 */
function showApp() {
  showEl('app-screen');
  const u = STATE.currentUser;
  document.getElementById('my-name').textContent = u.name;
  document.getElementById('my-id').textContent = `ID: ${u.userId}`;
  document.getElementById('my-avatar').textContent = initials(u.name);

  loadConversations();
  STATE.pollTimer = setInterval(pollMessages, CONFIG.POLL_INTERVAL);
}

/**
 * Switch between empty state and chat view
 */
function showView(view) {
  const empty = document.getElementById('empty-state');
  const chat = document.getElementById('chat-view');
  if (view === 'chat') {
    empty.style.display = 'none';
    chat.classList.remove('hidden');
    chat.style.display = 'flex';
  } else {
    empty.style.display = 'flex';
    chat.classList.add('hidden');
    chat.style.display = 'none';
  }
}

/**
 * Toggle sidebar (mobile)
 */
function toggleSidebar() {
  const sb = document.getElementById('sidebar');
  const ov = document.getElementById('sidebar-overlay');
  sb.classList.toggle('open');
  ov.classList.toggle('show');
}

/**
 * Close sidebar
 */
function closeSidebar() {
  document.getElementById('sidebar').classList.remove('open');
  document.getElementById('sidebar-overlay').classList.remove('show');
}

/**
 * Initialize app
 */
async function init() {
  document.getElementById('script-code-block').textContent = APPS_SCRIPT_CODE;
  
  await delay(600);
  hideEl('loading-overlay');

  const url = localStorage.getItem(STORAGE_KEYS.SCRIPT_URL);
  const user = localStorage.getItem(STORAGE_KEYS.USER);

  if (!url) {
    showEl('setup-screen');
    return;
  }
  STATE.scriptUrl = url;

  if (user) {
    STATE.currentUser = JSON.parse(user);
    showApp();
  } else {
    showEl('auth-screen');
  }
}

// Event listeners
document.addEventListener('DOMContentLoaded', init);

document.addEventListener('click', e => {
  const sr = document.getElementById('search-results');
  const si = document.getElementById('search-input');
  if (sr && !sr.contains(e.target) && e.target !== si) {
    hideEl('search-results');
  }
});

document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    closeScriptModal();
    hideEl('search-results');
  }
});

console.log('✅ Convo App Loaded');