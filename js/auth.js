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
  const sidebarUserName = document.getElementById('sidebarUserName');
  const sidebarUserId = document.getElementById('sidebarUserId');
  if (sidebarUserName) {
    sidebarUserName.textContent = currentUser.fullName || 'User';
  }
  if (sidebarUserId) {
    sidebarUserId.textContent = currentUser.userId || '--------';
  }
  
  // Welcome screen
  const welcomeUserId = document.getElementById('welcomeUserId');
  if (welcomeUserId) {
    welcomeUserId.textContent = currentUser.userId || '--------';
  }
  
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
  const loginForm = document.getElementById('loginForm');
  if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleLogin();
    });
  }
  
  // Register form
  const registerForm = document.getElementById('registerForm');
  if (registerForm) {
    registerForm.addEventListener('submit', async (e) => {
      e.preventDefault();
      await handleRegister();
    });
  }
  
  // Switch forms
  const showRegisterLink = document.getElementById('showRegisterLink');
  if (showRegisterLink) {
    showRegisterLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('loginForm').style.display = 'none';
      document.getElementById('registerForm').style.display = 'block';
    });
  }
  
  const showLoginLink = document.getElementById('showLoginLink');
  if (showLoginLink) {
    showLoginLink.addEventListener('click', (e) => {
      e.preventDefault();
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
    });
  }
  
  // Logout
  const logoutBtn = document.getElementById('logoutBtn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', async () => {
      if (currentSession) {
        await callAPI('logout', { sessionToken: currentSession });
      }
      clearSession();
      showAuth();
      showToast('Signed out successfully', 'success');
    });
  }
}

// ========================================
// HANDLERS
// ========================================

async function handleLogin() {
  const emailInput = document.getElementById('loginEmail');
  const passwordInput = document.getElementById('loginPassword');
  
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  
  console.log('Login form data:', { email });
  
  if (!email || !password) {
    showToast('Please enter email and password', 'error');
    return;
  }
  
  const btn = document.getElementById('loginBtn');
  const originalText = btn.innerHTML;
  
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> Signing in...';
  
  console.log('Calling API login with:', { email });
  
  try {
    const result = await callAPI('login', { 
      email: email, 
      password: password 
    });
    
    console.log('Login API result:', result);
    
    if (result.success) {
      currentSession = result.sessionToken;
      currentUser = result.user;
      
      localStorage.setItem(STORAGE_KEYS.SESSION, currentSession);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      
      showToast(`Welcome, ${currentUser.fullName}!`, 'success');
      showApp();
      
      // Clear form
      emailInput.value = '';
      passwordInput.value = '';
    } else {
      showToast(result.error || 'Login failed', 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Login error:', error);
    showToast('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

async function handleRegister() {
  const fullNameInput = document.getElementById('regFullName');
  const emailInput = document.getElementById('regEmail');
  const passwordInput = document.getElementById('regPassword');
  const confirmInput = document.getElementById('regConfirmPassword');
  
  const fullName = fullNameInput?.value.trim() || '';
  const email = emailInput?.value.trim() || '';
  const password = passwordInput?.value || '';
  const confirm = confirmInput?.value || '';
  
  console.log('Register form data:', { fullName, email, password: password ? '***' : '' });
  
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
  btn.innerHTML = '<span class="spinner"></span> Creating account...';
  
  console.log('Calling API register with:', { fullName, email });
  
  try {
    const result = await callAPI('register', { 
      fullName: fullName, 
      email: email, 
      password: password 
    });
    
    console.log('Register API result:', result);
    
    if (result.success) {
      showToast(`Account created! Your ID: ${result.userId}`, 'success');
      
      // Switch to login
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
      
      const loginEmailInput = document.getElementById('loginEmail');
      if (loginEmailInput) {
        loginEmailInput.value = email;
      }
      
      // Clear register form
      fullNameInput.value = '';
      emailInput.value = '';
      passwordInput.value = '';
      confirmInput.value = '';
      
      // Re-enable button
      btn.disabled = false;
      btn.innerHTML = originalText;
    } else {
      showToast(result.error || 'Registration failed', 'error');
      btn.disabled = false;
      btn.innerHTML = originalText;
    }
  } catch (error) {
    console.error('Registration error:', error);
    showToast('Network error. Please try again.', 'error');
    btn.disabled = false;
    btn.innerHTML = originalText;
  }
}

// ========================================
// COPY ID FUNCTION
// ========================================

function copyUserId() {
  if (!currentUser) return;
  
  const userId = currentUser.userId.toString();
  
  // Try modern clipboard API first
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(userId).then(() => {
      showToast('User ID copied to clipboard!', 'success');
    }).catch(() => {
      fallbackCopy(userId);
    });
  } else {
    fallbackCopy(userId);
  }
}

function fallbackCopy(text) {
  const input = document.createElement('input');
  input.value = text;
  input.style.position = 'fixed';
  input.style.opacity = '0';
  document.body.appendChild(input);
  input.select();
  input.setSelectionRange(0, 99999);
  
  try {
    document.execCommand('copy');
    showToast('User ID copied!', 'success');
  } catch (err) {
    showToast('Failed to copy. Please copy manually.', 'error');
  }
  
  document.body.removeChild(input);
}

// ========================================
// EXPOSE TO WINDOW
// ========================================

window.copyUserId = copyUserId;

console.log('✅ ncrypt Auth Loaded');