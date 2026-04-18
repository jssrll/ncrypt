// ============================================================
// CONVO MESSENGER - UTILITY FUNCTIONS (JSONP VERSION)
// ============================================================

/**
 * Show toast notification
 */
function showToast(msg, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

/**
 * Get element value
 */
function val(id) {
  return document.getElementById(id).value.trim();
}

/**
 * Show element
 */
function showEl(id) {
  document.getElementById(id).classList.remove('hidden');
}

/**
 * Hide element
 */
function hideEl(id) {
  document.getElementById(id).classList.add('hidden');
}

/**
 * Delay function
 */
function delay(ms) {
  return new Promise(r => setTimeout(r, ms));
}

/**
 * Validate email format
 */
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Generate 9-digit user ID
 */
function generateUserId() {
  return String(Math.floor(100000000 + Math.random() * 900000000));
}

/**
 * Get initials from name
 */
function initials(name) {
  return (name || '?').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
}

/**
 * Escape HTML
 */
function escHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/**
 * Format timestamp for conversation list
 */
function formatTime(ts) {
  const d = new Date(ts);
  const now = new Date();
  const diff = now - d;
  if (diff < 60000) return 'Just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m`;
  if (diff < 86400000) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diff < 604800000) return d.toLocaleDateString([], { weekday: 'short' });
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

/**
 * Format time for messages (HH:MM)
 */
function formatTimeShort(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

/**
 * Format date for message dividers
 */
function formatDate(ts) {
  const d = new Date(ts);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return 'Today';
  const yest = new Date(now);
  yest.setDate(yest.getDate() - 1);
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });
}

/**
 * Show error on form field
 */
function showError(inputId, errId) {
  document.getElementById(inputId).classList.add('error');
  document.getElementById(errId).classList.add('show');
}

/**
 * Clear all form errors
 */
function clearErrors(inputIds) {
  inputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) el.classList.remove('error');
  });
  document.querySelectorAll('.error-msg').forEach(e => e.classList.remove('show'));
}

/**
 * Set button loading state
 */
function setLoading(btnId, loading) {
  const btn = document.getElementById(btnId);
  btn.disabled = loading;
  
  if (btnId === 'login-btn') {
    btn.innerHTML = loading ? '<span class="spinner"></span>' : 'Sign In';
  } else if (btnId === 'reg-btn') {
    btn.innerHTML = loading ? '<span class="spinner"></span>' : 'Create Account';
  }
}

/**
 * Auto-resize textarea
 */
function autoResize(el) {
  el.style.height = 'auto';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

/**
 * API call using JSONP (bypasses CORS completely)
 */
function apiCall(params) {
  return new Promise((resolve, reject) => {
    // Create unique callback name
    const callbackName = 'jsonp_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
    
    // Build URL with parameters
    const urlParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      urlParams.append(key, String(value));
    }
    urlParams.append('callback', callbackName);
    
    const url = STATE.scriptUrl + '?' + urlParams.toString();
    
    console.log('JSONP Call:', params.action, url);
    
    // Create script tag
    const script = document.createElement('script');
    script.src = url;
    
    // Set timeout (10 seconds)
    const timeout = setTimeout(() => {
      cleanup();
      reject(new Error('Request timeout'));
    }, 10000);
    
    // Cleanup function
    const cleanup = () => {
      clearTimeout(timeout);
      delete window[callbackName];
      if (script.parentNode) script.parentNode.removeChild(script);
    };
    
    // Define callback
    window[callbackName] = (result) => {
      console.log('JSONP Response:', result);
      cleanup();
      resolve(result);
    };
    
    // Handle errors
    script.onerror = () => {
      console.error('JSONP Script Error');
      cleanup();
      reject(new Error('Network error'));
    };
    
    // Append to document
    document.head.appendChild(script);
  });
}

console.log('✅ Convo Utils Loaded (JSONP Mode)');