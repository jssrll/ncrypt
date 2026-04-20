// ============================================================
//  SETTINGS - WITH INSTALL BUTTON
// ============================================================

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

  // Install button inside settings
  const installSettingsBtn = document.getElementById('settings-install-btn');
  if (installSettingsBtn) {
    installSettingsBtn.addEventListener('click', () => {
      closeModal('settings-modal');
      // Call the function exposed by pwa.js
      if (typeof window.triggerInstallFromSettings === 'function') {
        window.triggerInstallFromSettings();
      } else {
        // Fallback: show the banner manually
        const banner = document.getElementById('install-banner');
        if (banner) {
          banner.classList.remove('hidden');
          toast('Tap "Install" to add ncrypt to your home screen', 'info');
        } else {
          toast('Install prompt will appear shortly', 'info');
        }
      }
    });
  }
}

function openSettingsModal() {
  openModal('settings-modal');
}