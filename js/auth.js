// ========================================
// NCRYPT - AUTHENTICATION
// ========================================

let currentSession = null;
let currentUser = null;

// ========================================
// INITIALIZATION
// ========================================

async function initAuth() {
  const stored = localStorage.getItem(STORAGE_KEYS.USER);
  const storedSession = localStorage.getItem(STORAGE_KEYS.SESSION);
  
  if (stored && storedSession) {
    try {
      window.currentUser = JSON.parse(stored);
      currentUser = window.currentUser;
      currentSession = storedSession;
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('appContainer').style.display = 'flex';
      updateUserUI();
      if (typeof initChat === 'function') initChat();
    } catch(e) { 
      localStorage.removeItem(STORAGE_KEYS.USER);
      localStorage.removeItem(STORAGE_KEYS.SESSION);
    }
  }
}

function setupAuthListeners() {
  // Login button
  document.getElementById('loginBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target;
    const email = document.getElementById('loginEmail').value.trim();
    const password = document.getElementById('loginPassword').value;
    
    if (!email || !password) { 
      showToast('Please enter email and password', true); 
      return; 
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner"></span> Signing in...';
    
    const result = await callAPI('login', { email, password });
    
    btn.disabled = false; 
    btn.innerHTML = originalText;
    
    if (result.success) {
      window.currentUser = result.user;
      currentUser = result.user;
      currentSession = result.sessionToken;
      
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(currentUser));
      localStorage.setItem(STORAGE_KEYS.SESSION, currentSession);
      
      document.getElementById('authContainer').style.display = 'none';
      document.getElementById('appContainer').style.display = 'flex';
      
      updateUserUI();
      if (typeof initChat === 'function') initChat();
      
      showToast(`Welcome, ${currentUser.fullName}!`, false);
      
      // Clear form
      document.getElementById('loginEmail').value = '';
      document.getElementById('loginPassword').value = '';
    } else { 
      showToast(result.error || 'Invalid credentials', true); 
    }
  });

  // Register button
  document.getElementById('registerBtn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    const btn = e.target;
    const fullName = document.getElementById('regFullName').value.trim();
    const email = document.getElementById('regEmail').value.trim();
    const password = document.getElementById('regPassword').value;
    const confirm = document.getElementById('regConfirmPassword').value;
    
    if (!fullName || !email || !password) { 
      showToast('All fields required', true); 
      return; 
    }
    if (password !== confirm) { 
      showToast("Passwords don't match", true); 
      return; 
    }
    
    const originalText = btn.innerHTML;
    btn.disabled = true; 
    btn.innerHTML = '<span class="spinner"></span> Registering...';
    
    const result = await callAPI('register', { fullName, email, password });
    
    btn.disabled = false; 
    btn.innerHTML = originalText;
    
    if (result.success) {
      showToast(`Registration successful! Your ID: ${result.userId}`, false);
      document.getElementById('registerForm').style.display = 'none';
      document.getElementById('loginForm').style.display = 'block';
      document.getElementById('loginEmail').value = email;
      
      // Clear form
      document.getElementById('regFullName').value = '';
      document.getElementById('regEmail').value = '';
      document.getElementById('regPassword').value = '';
      document.getElementById('regConfirmPassword').value = '';
    } else { 
      showToast(result.error || 'Registration failed', true); 
    }
  });

  // Logout button
  document.getElementById('logoutBtn')?.addEventListener('click', async () => {
    if (currentSession) {
      await callAPI('logout', { sessionToken: currentSession });
    }
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.SESSION);
    window.currentUser = null;
    currentUser = null;
    currentSession = null;
    
    document.getElementById('authContainer').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('registerForm').style.display = 'none';
    
    showToast('Logged out', false);
  });

  // Switch forms
  document.getElementById('showRegisterLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('registerForm').style.display = 'block';
  });

  document.getElementById('showLoginLink')?.addEventListener('click', (e) => {
    e.preventDefault();
    document.getElementById('registerForm').style.display = 'none';
    document.getElementById('loginForm').style.display = 'block';
  });
}

function updateUserUI() {
  if (!currentUser) return;
  
  document.getElementById('sidebarUserName').textContent = currentUser.fullName || 'User';
  document.getElementById('sidebarUserId').textContent = currentUser.userId || '--------';
  document.getElementById('welcomeUserId').textContent = currentUser.userId || '--------';
  
  const avatar = document.getElementById('userAvatar');
  if (avatar) {
    avatar.innerHTML = `<span>${(currentUser.fullName || 'U').charAt(0).toUpperCase()}</span>`;
  }
}

function copyUserId() {
  if (!currentUser) return;
  navigator.clipboard?.writeText(currentUser.userId.toString()).then(() => {
    showToast('User ID copied!', false);
  }).catch(() => {
    showToast('Failed to copy', true);
  });
}

window.copyUserId = copyUserId;

console.log('✅ ncrypt Auth Loaded');