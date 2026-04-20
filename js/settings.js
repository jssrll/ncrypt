// ============================================================
//  SETTINGS – DARK MODE, FONT SIZE, DATA SAVER, HIGH CONTRAST
// ============================================================

// Preference keys
const PREF_DARK_MODE = 'ncrypt_dark_mode';
const PREF_HIGH_CONTRAST = 'ncrypt_high_contrast';
const PREF_FONT_SIZE = 'ncrypt_font_size';
const PREF_DATA_SAVER = 'ncrypt_data_saver';

// Initialize settings
function initSettings() {
  const settingsBtn = document.getElementById('sidebar-settings');
  if (settingsBtn) settingsBtn.addEventListener('click', openSettingsModal);

  const logoutBtn = document.getElementById('settings-logout-btn');
  if (logoutBtn) {
    logoutBtn.addEventListener('click', () => {
      closeModal('settings-modal');
      setTimeout(logout, 200);
    });
  }

  // Dark mode toggle
  const darkModeToggle = document.getElementById('dark-mode-toggle');
  if (darkModeToggle) {
    darkModeToggle.checked = getDarkMode();
    darkModeToggle.addEventListener('change', (e) => {
      setDarkMode(e.target.checked);
    });
  }

  // High contrast toggle
  const highContrastToggle = document.getElementById('high-contrast-toggle');
  if (highContrastToggle) {
    highContrastToggle.checked = getHighContrast();
    highContrastToggle.addEventListener('change', (e) => {
      setHighContrast(e.target.checked);
    });
  }

  // Font size select
  const fontSizeSelect = document.getElementById('font-size-select');
  if (fontSizeSelect) {
    fontSizeSelect.value = getFontSize();
    fontSizeSelect.addEventListener('change', (e) => {
      setFontSize(e.target.value);
    });
  }

  // Data saver toggle
  const dataSaverToggle = document.getElementById('data-saver-toggle');
  if (dataSaverToggle) {
    dataSaverToggle.checked = getDataSaver();
    dataSaverToggle.addEventListener('change', (e) => {
      setDataSaver(e.target.checked);
    });
  }

  // Report a problem
  const reportBtn = document.getElementById('report-problem-btn');
  if (reportBtn) {
    reportBtn.addEventListener('click', () => {
      reportProblem();
    });
  }

  // Apply saved preferences on startup
  applyAllPreferences();
}

function openSettingsModal() {
  // Sync toggles with current preferences before opening
  const darkToggle = document.getElementById('dark-mode-toggle');
  if (darkToggle) darkToggle.checked = getDarkMode();
  
  const contrastToggle = document.getElementById('high-contrast-toggle');
  if (contrastToggle) contrastToggle.checked = getHighContrast();
  
  const dataSaverToggle = document.getElementById('data-saver-toggle');
  if (dataSaverToggle) dataSaverToggle.checked = getDataSaver();
  
  const fontSizeSelect = document.getElementById('font-size-select');
  if (fontSizeSelect) fontSizeSelect.value = getFontSize();
  
  openModal('settings-modal');
}

// ── Getters / Setters ─────────────────────────────────────────
function getDarkMode() {
  return localStorage.getItem(PREF_DARK_MODE) === 'true';
}

function setDarkMode(enabled) {
  localStorage.setItem(PREF_DARK_MODE, enabled);
  applyDarkMode(enabled);
}

function getHighContrast() {
  return localStorage.getItem(PREF_HIGH_CONTRAST) === 'true';
}

function setHighContrast(enabled) {
  localStorage.setItem(PREF_HIGH_CONTRAST, enabled);
  applyHighContrast(enabled);
}

function getFontSize() {
  return localStorage.getItem(PREF_FONT_SIZE) || 'medium';
}

function setFontSize(size) {
  localStorage.setItem(PREF_FONT_SIZE, size);
  applyFontSize(size);
}

function getDataSaver() {
  return localStorage.getItem(PREF_DATA_SAVER) === 'true';
}

function setDataSaver(enabled) {
  localStorage.setItem(PREF_DATA_SAVER, enabled);
  applyDataSaver(enabled);
}

// ── Apply preferences to DOM ──────────────────────────────────
function applyDarkMode(enabled) {
  if (enabled) {
    document.documentElement.classList.add('dark-mode');
  } else {
    document.documentElement.classList.remove('dark-mode');
  }
}

function applyHighContrast(enabled) {
  if (enabled) {
    document.documentElement.classList.add('high-contrast');
  } else {
    document.documentElement.classList.remove('high-contrast');
  }
}

function applyFontSize(size) {
  document.documentElement.classList.remove('font-small', 'font-medium', 'font-large');
  document.documentElement.classList.add(`font-${size}`);
}

function applyDataSaver(enabled) {
  if (enabled) {
    document.documentElement.classList.add('data-saver');
  } else {
    document.documentElement.classList.remove('data-saver');
  }
  // You can also set a global flag for messaging.js to use lower quality
  window.dataSaverEnabled = enabled;
}

function applyAllPreferences() {
  applyDarkMode(getDarkMode());
  applyHighContrast(getHighContrast());
  applyFontSize(getFontSize());
  applyDataSaver(getDataSaver());
}

// ── Report a problem ──────────────────────────────────────────
function reportProblem() {
  const subject = encodeURIComponent('ncrypt - Problem Report');
  const body = encodeURIComponent(
    `Please describe the issue:\n\n` +
    `User ID: ${currentUser?.id || 'Not logged in'}\n` +
    `App Version: 1.0.0\n` +
    `Platform: ${navigator.platform}\n` +
    `User Agent: ${navigator.userAgent}`
  );
  
  // Replace with your support email or feedback URL
  const supportEmail = 'support@ncrypt.app'; // Change this!
  window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  
  toast('Opening email client...', 'info');
}

// Expose for potential use in messaging.js
window.isDataSaverEnabled = getDataSaver;