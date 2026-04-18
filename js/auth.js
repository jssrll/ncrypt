// ========================================
// NCRYPT - AUTHENTICATION
// ========================================

let currentSession = null;
let currentUser = null;

// ========================================
// INITIALIZATION
// ========================================

function initAuth() {
  const savedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
  const savedUser = localStorage.getItem(STORAGE_KEYS.USER);
  
  if (savedSession && savedUser) {
    try {
      currentSession = savedSession;
      currentUser = JSON.parse(savedUser);
      showApp();
    } catch (e) {
      clearSession();
      showAuth();
    }
  } else {
    showAuth();
  }
}

function showAuth() {
  document.getElementById('authContainer').style.display = 'flex';
  document.getElementById('appContainer').style.display = 'none';
}

function showApp() {
  document.getElementById('authContainer').style.display = 'none';
  document.getElementById('appContainer').style.display = 'flex';
  
  // Update UI with user info
  updateUserUI();
  
  // Initialize chat
  if (typeof initChat === 'function') {
    initChat();
  }
}

function clearSession() {
  localStorage.removeItem(STORAGE_KEYS.SESSION);
  localStorage.removeItem(STORAGE_KEYS.USER);
  localStorage.removeItem(STORAGE_KEYS.CURRENT_CONVERSATION);
  currentSession = null;
  currentUser = null;
}

function updateUserUI() {
  if (!currentUser) return;
  
  // Sidebar
  document.getElementById('sidebarUserName').textContent = currentUser.fullName || 'User';
  document.getElementById('sidebarUserId').textContent = currentUser.userId || '--------';
  
  // Welcome screen
  document.getElementById('welcomeUserId').textContent = currentUser.userId || '--------';
  
  // Avatar initial
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    avatar.style.background = getAvatarColor(currentUser.userId?.toString() || 'user');
    avatar.innerHTML = `<span>${(currentUser.fullName || 'U').charAt(0).toUpperCase()}</span>`;
  }
}

// ========================================
// EVENT LISTENERS
// ========================================

function setupAuthListeners() {
  // Login form
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleLogin();
  });
  
  // Register form
  document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    await handleRegister();
  });
  
  // Switch forms
  document.getElementById('showRegisterLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  });
  
  document.getElementById('showLoginLink').addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  });
  
  // Logout
  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (currentSession) {
      await callAPI('logout', { sessionToken: currentSession });
    }
    clearSession();
    showAuth();
    showToast('Signed out successfully', 'success');
  });
}

// ========================================
// HANDLERS
// ========================================

async function handleLogin() {
  const email = document.getElementById('loginEmail').value.trim();
  const password = document.getElementById('loginPassword').value;
  
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  const btn = document.getElementById('loginBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  
  const result = await callAPI('login', { email, password });
  
  btn.disabled = false;
  btn.innerHTML = originalText;
  
  if (result.success) {
    currentSession = result.sessionToken;
    currentUser = result.user;
    
    localStorage.setItem(STORAGE_KEYS.SESSION, currentSession);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
    
    showToast(`Welcome, ${currentUser.fullName}!`, 'success');
    showApp();
    
    // Clear form
    document.getElementById('loginEmail').value = '';
    document.getElementById('loginPassword').value = '';
  } else {
    showToast(result.error || 'Login failed', 'error');
  }
}

async function handleRegister() {
  const fullName = document.getElementById('regFullName').value.trim();
  const email = document.getElementById('regEmail').value.trim();
  const password = document.getElementById('regPassword').value;
  const confirm = document.getElementById('regConfirmPassword').value;
  
  if (!fullName || !email || !password || !confirm) {
    showToast('All fields are required', 'error');
    return;
  }
  
  if (password !== confirm) {
    showToast('Passwords do not match', 'error');
    return;
  }
  
  if (password.length < 4) {
    showToast('Password must be at least 4 characters', 'error');
    return;
  }
  
  const btn = document.getElementById('registerBtn');
  const originalText = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  
  const result = await callAPI('register', { fullName, email, password });
  
  btn.disabled = false;
  btn.innerHTML = originalText;
  
  if (result.success) {
    showToast(`Account created! Your ID: ${result.userId}`, 'success');
    
    // Switch to login
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('loginEmail').value = email;
    
    // Clear register form
    document.getElementById('regFullName').value = '';
    document.getElementById('regEmail').value = '';
    document.getElementById('regPassword').value = '';
    document.getElementById('regConfirmPassword').value = '';
  } else {
    showToast(result.error || 'Registration failed', 'error');
  }
}

// ========================================
// COPY ID FUNCTION
// ========================================

function copyUserId() {
  if (!currentUser) return;
  
  navigator.clipboard?.writeText(currentUser.userId.toString()).then(() => {
    showToast('User ID copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback
    const input = document.createElement('input');
    input.value = currentUser.userId;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('User ID copied!', 'success');
  });
}

console.log('✅ ncrypt Auth Loaded');