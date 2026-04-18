// ============================================================
// CONVO MESSENGER - AUTHENTICATION
// ============================================================

/**
 * Switch between login and register tabs
 */
function switchTab(tab) {
  const tabs = document.querySelectorAll('.auth-tab');
  if (tab === 'login') {
    tabs[0].classList.add('active');
    tabs[1].classList.remove('active');
    showEl('login-form');
    hideEl('register-form');
  } else {
    tabs[1].classList.add('active');
    tabs[0].classList.remove('active');
    hideEl('login-form');
    showEl('register-form');
  }
}

/**
 * Handle login
 */
async function handleLogin() {
  clearErrors(['login-email', 'login-password']);
  const email = val('login-email');
  const pass = val('login-password');
  let ok = true;

  if (!isValidEmail(email)) {
    showError('login-email', 'login-email-err');
    ok = false;
  }
  if (!pass) {
    showError('login-password', 'login-pass-err');
    ok = false;
  }
  if (!ok) return;

  setLoading('login-btn', true);
  try {
    const res = await apiCall({ action: 'login', email, password: pass });
    if (res.ok) {
      STATE.currentUser = res;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res));
      hideEl('auth-screen');
      showApp();
    } else {
      showToast(res.error || 'Login failed.', 'error');
    }
  } catch (e) {
    showToast('Network error. Check your Apps Script URL.', 'error');
  }
  setLoading('login-btn', false);
}

/**
 * Handle registration
 */
async function handleRegister() {
  clearErrors(['reg-name', 'reg-email', 'reg-password', 'reg-confirm']);
  const name = val('reg-name');
  const email = val('reg-email');
  const pass = val('reg-password');
  const confirm = val('reg-confirm');
  let ok = true;

  if (!name) {
    showError('reg-name', 'reg-name-err');
    ok = false;
  }
  if (!isValidEmail(email)) {
    showError('reg-email', 'reg-email-err');
    ok = false;
  }
  if (pass.length < 6) {
    showError('reg-password', 'reg-pass-err');
    ok = false;
  }
  if (pass !== confirm) {
    showError('reg-confirm', 'reg-confirm-err');
    ok = false;
  }
  if (!ok) return;

  setLoading('reg-btn', true);
  try {
    const userId = generateUserId();
    const res = await apiCall({ action: 'register', name, email, password: pass, userId });
    if (res.ok) {
      STATE.currentUser = res;
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(res));
      showToast('Account created! Welcome to Convo 🎉', 'success');
      hideEl('auth-screen');
      showApp();
    } else {
      showToast(res.error || 'Registration failed.', 'error');
    }
  } catch (e) {
    showToast('Network error. Check your Apps Script URL.', 'error');
  }
  setLoading('reg-btn', false);
}

/**
 * Handle logout
 */
function handleLogout() {
  clearInterval(STATE.pollTimer);
  STATE.currentUser = null;
  STATE.activeChat = null;
  STATE.conversations = [];
  localStorage.removeItem(STORAGE_KEYS.USER);
  hideEl('app-screen');
  showEl('auth-screen');
  showToast('Signed out.', 'info');
}

console.log('✅ Convo Auth Loaded');