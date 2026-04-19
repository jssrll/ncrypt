// ============================================================
//  AUTHENTICATION LOGIC
// ============================================================

// Initialize auth event listeners
function initAuth() {
  // Setup form
  document.getElementById('setup-form').addEventListener('submit', handleSetup);
  
  // Tab switching
  document.querySelectorAll('.auth-tab').forEach(tab => {
    tab.addEventListener('click', () => switchAuthTab(tab.dataset.tab));
  });
  
  document.querySelectorAll('[data-tab]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      switchAuthTab(link.dataset.tab);
    });
  });
  
  // Password visibility toggle
  document.querySelectorAll('.pw-eye').forEach(icon => {
    icon.addEventListener('click', function() {
      togglePasswordVisibility(this.dataset.target, this);
    });
  });
  
  // Login form
  document.getElementById('login-form').addEventListener('submit', handleLogin);
  
  // Register form
  document.getElementById('register-form').addEventListener('submit', handleRegister);
  
  // Change script URL
  document.getElementById('change-script-link').addEventListener('click', changeScriptUrl);
}

// Handle setup form submission
function handleSetup(e) {
  e.preventDefault();
  const url = document.getElementById('script-url-input').value.trim();
  
  if (!url.startsWith('https://script.google.com')) {
    toast('Please enter a valid Apps Script URL.', 'error');
    return;
  }
  
  SCRIPT_URL = url;
  localStorage.setItem('ncrypt_url', url);
  toast('Connected successfully!', 'success');
  setTimeout(() => showScreen('auth'), 700);
}

// Switch between login and register tabs
function switchAuthTab(tab) {
  document.querySelectorAll('.auth-tab').forEach(t => {
    t.classList.toggle('active', t.dataset.tab === tab);
  });
  
  document.getElementById('login-form').classList.toggle('hidden', tab !== 'login');
  document.getElementById('register-form').classList.toggle('hidden', tab !== 'register');
  
  clearAuthErrors();
}

// Clear all auth form errors
function clearAuthErrors() {
  document.querySelectorAll('.error-msg').forEach(el => el.classList.remove('show'));
  document.querySelectorAll('.form-input').forEach(el => el.classList.remove('error'));
}

// Toggle password visibility
function togglePasswordVisibility(inputId, icon) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  icon.textContent = isPassword ? 'visibility_off' : 'visibility';
}

// Show field error
function showFieldError(inputId, errorId) {
  const input = document.getElementById(inputId);
  const error = document.getElementById(errorId);
  if (input) input.classList.add('error');
  if (error) error.classList.add('show');
}

// Handle login
async function handleLogin(e) {
  e.preventDefault();
  clearAuthErrors();
  
  const email = document.getElementById('login-email').value.trim();
  const password = document.getElementById('login-password').value;
  let isValid = true;
  
  if (!isValidEmail(email)) {
    showFieldError('login-email', 'err-login-email');
    isValid = false;
  }
  if (!password) {
    showFieldError('login-password', 'err-login-pw');
    isValid = false;
  }
  if (!isValid) return;
  
  const btn = document.getElementById('login-btn');
  setBtnLoading(btn, true);
  
  try {
    const hash = await sha256(password);
    const result = await callAPI({ action: 'login', email, password: hash });
    
    if (result.success) {
      currentUser = result.user;
      localStorage.setItem('ncrypt_user', JSON.stringify(currentUser));
      toast(`Welcome back, ${currentUser.name.split(' ')[0]}!`, 'success');
      showScreen('app');
      initializeMessenger();
    } else {
      toast(result.message || 'Invalid email or password.', 'error');
    }
  } catch (err) {
    toast('Connection failed — check your Script URL.', 'error');
    console.error('Login error:', err);
  } finally {
    setBtnLoading(btn, false, 'Sign In');
  }
}

// Handle register
async function handleRegister(e) {
  e.preventDefault();
  clearAuthErrors();
  
  const name = document.getElementById('reg-name').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const password = document.getElementById('reg-password').value;
  const confirm = document.getElementById('reg-confirm').value;
  let isValid = true;
  
  if (!name) {
    showFieldError('reg-name', 'err-reg-name');
    isValid = false;
  }
  if (!isValidEmail(email)) {
    showFieldError('reg-email', 'err-reg-email');
    isValid = false;
  }
  if (password.length < 8) {
    showFieldError('reg-password', 'err-reg-pw');
    isValid = false;
  }
  if (password !== confirm) {
    showFieldError('reg-confirm', 'err-reg-confirm');
    isValid = false;
  }
  if (!isValid) return;
  
  const btn = document.getElementById('register-btn');
  setBtnLoading(btn, true);
  
  try {
    const hash = await sha256(password);
    const result = await callAPI({ action: 'register', name, email, password: hash });
    
    if (result.success) {
      toast('Account created! Please sign in.', 'success');
      document.getElementById('login-email').value = email;
      document.getElementById('login-password').value = '';
      switchAuthTab('login');
    } else {
      toast(result.message || 'Registration failed.', 'error');
    }
  } catch (err) {
    toast('Connection failed — check your Script URL.', 'error');
    console.error('Register error:', err);
  } finally {
    setBtnLoading(btn, false, 'Create Account');
  }
}

// Change script URL
function changeScriptUrl() {
  if (!confirm('This will log you out and reset the backend URL. Continue?')) return;
  
  currentUser = null;
  localStorage.removeItem('ncrypt_user');
  localStorage.removeItem('ncrypt_url');
  SCRIPT_URL = '';
  document.getElementById('script-url-input').value = '';
  showScreen('setup');
}

// Logout
function logout() {
  if (!confirm('Log out of ncrypt?')) return;
  
  stopMessagePolling();
  currentUser = null;
  activeConversation = null;
  conversations = [];
  messagesCache.clear();
  localStorage.removeItem('ncrypt_user');
  
  toast('You\'ve been signed out.', 'info');
  setTimeout(() => showScreen('auth'), 300);
}