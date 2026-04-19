// ============================================================
//  UTILITY FUNCTIONS
// ============================================================

// SHA-256 hashing
async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// Get initials from name
function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

// Format date
function formatDate(isoString) {
  if (!isoString) return '—';
  try {
    const date = new Date(isoString);
    const now = new Date();
    const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
    } else if (diffDays === 1) {
      return 'Yesterday';
    } else if (diffDays < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  } catch {
    return isoString;
  }
}

// Format message time
function formatMessageTime(isoString) {
  if (!isoString) return '';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

// Validate email
function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

// Set button loading state
function setBtnLoading(btn, loading, originalText = '') {
  if (loading) {
    btn.dataset.originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner"></span>';
    btn.disabled = true;
  } else {
    btn.innerHTML = originalText || btn.dataset.originalText;
    btn.disabled = false;
  }
}

// Toast notification
function toast(message, type = 'info') {
  const icons = { success: 'check_circle', error: 'error', info: 'info' };
  const container = document.getElementById('toast-container');
  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="material-icons-round" style="font-size:17px;flex-shrink:0;">${icons[type]}</span>${message}`;
  container.appendChild(el);
  
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, 3800);
}

// Generate unique ID
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}