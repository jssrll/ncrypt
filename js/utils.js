// ========================================
// NCRYPT - UTILITY FUNCTIONS
// ========================================

/**
 * Show toast notification
 */
function showToast(message, type = 'info') {
  console.log('Toast:', message, type);
  
  const container = document.getElementById('toastContainer');
  if (!container) {
    console.error('Toast container not found!');
    alert(message);
    return;
  }
  
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  
  let icon = 'info-circle';
  if (type === 'success') icon = 'check-circle';
  if (type === 'error') icon = 'exclamation-circle';
  
  toast.innerHTML = `
    <i class="fas fa-${icon}"></i>
    <span>${escapeHtml(message)}</span>
  `;
  
  container.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (toast.parentNode) {
        toast.parentNode.removeChild(toast);
      }
    }, 300);
  }, 4000);
}

/**
 * Escape HTML to prevent XSS
 */
function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

/**
 * Format timestamp to readable time
 */
function formatTime(timestamp) {
  if (!timestamp) return '';
  
  const date = new Date(timestamp);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

/**
 * Format time for messages (HH:MM)
 */
function formatMessageTime(timestamp) {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
}

/**
 * Generate random avatar color based on string
 */
function getAvatarColor(str) {
  if (!str) return '#0f172a';
  let hash = 0;
  const strValue = String(str);
  for (let i = 0; i < strValue.length; i++) {
    hash = strValue.charCodeAt(i) + ((hash << 5) - hash);
  }
  const hue = Math.abs(hash) % 360;
  return `hsl(${hue}, 70%, 45%)`;
}

/**
 * API Call wrapper - FIXED VERSION
 */
async function callAPI(action, data = {}) {
  try {
    // Build URL with parameters
    const urlParams = new URLSearchParams();
    urlParams.append('action', action);
    
    // Add all data parameters
    for (const [key, value] of Object.entries(data)) {
      if (value !== undefined && value !== null) {
        urlParams.append(key, String(value));
      }
    }
    
    const url = `${CONFIG.API_URL}?${urlParams.toString()}`;
    
    console.log('API Call:', action, data);
    console.log('Full URL:', url);
    
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',
      credentials: 'omit'
    });
    
    const text = await response.text();
    console.log('API Raw Response:', text);
    
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return { success: false, error: 'Invalid server response' };
    }
    
    console.log('API Parsed Result:', result);
    return result;
    
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}

/**
 * Debounce function
 */
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

console.log('✅ ncrypt Utils Loaded');