// ============================================================
//  SETTINGS - FIXED
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
}

function openSettingsModal() {
  openModal('settings-modal');
}