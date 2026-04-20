// ============================================================
//  SETTINGS – DARK MODE, FONT SIZE, DATA SAVER, HIGH CONTRAST
// ============================================================

// Preference keys
const PREF_DARK_MODE = 'ncrypt_dark_mode';
const PREF_HIGH_CONTRAST = 'ncrypt_high_contrast';
const PREF_FONT_SIZE = 'ncrypt_font_size';
const PREF_DATA_SAVER = 'ncrypt_data_saver';

// Initialize settings (called from messaging.js)
function initSettings() {
  // Wait for DOM to be ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupSettings);
  } else {
    setupSettings();
  }
}

function setupSettings() {
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
    reportBtn.addEventListener('click', reportProblem);
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
  toast(enabled ? 'Dark mode enabled' : 'Light mode enabled', 'info');
}

function getHighContrast() {
  return localStorage.getItem(PREF_HIGH_CONTRAST) === 'true';
}

function setHighContrast(enabled) {
  localStorage.setItem(PREF_HIGH_CONTRAST, enabled);
  applyHighContrast(enabled);
  toast(enabled ? 'High contrast enabled' : 'High contrast disabled', 'info');
}

function getFontSize() {
  return localStorage.getItem(PREF_FONT_SIZE) || 'medium';
}

function setFontSize(size) {
  localStorage.setItem(PREF_FONT_SIZE, size);
  applyFontSize(size);
  toast(`Font size: ${size}`, 'info');
}

function getDataSaver() {
  return localStorage.getItem(PREF_DATA_SAVER) === 'true';
}

function setDataSaver(enabled) {
  localStorage.setItem(PREF_DATA_SAVER, enabled);
  applyDataSaver(enabled);
  window.dataSaverEnabled = enabled;
  toast(enabled ? 'Data saver enabled' : 'Data saver disabled', 'info');
}

// ── Apply preferences to DOM ──────────────────────────────────
function applyDarkMode(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('dark-mode');
  } else {
    html.classList.remove('dark-mode');
  }
}

function applyHighContrast(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('high-contrast');
  } else {
    html.classList.remove('high-contrast');
  }
}

function applyFontSize(size) {
  const html = document.documentElement;
  html.classList.remove('font-small', 'font-medium', 'font-large');
  html.classList.add(`font-${size}`);
}

function applyDataSaver(enabled) {
  const html = document.documentElement;
  if (enabled) {
    html.classList.add('data-saver');
  } else {
    html.classList.remove('data-saver');
  }
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
  
  // Replace with your support email
  const supportEmail = 'support@ncrypt.app';
  window.location.href = `mailto:${supportEmail}?subject=${subject}&body=${body}`;
  
  toast('Opening email client...', 'info');
}

// Expose for global access
window.isDataSaverEnabled = getDataSaver;