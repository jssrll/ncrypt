// ============================================================
//  SETTINGS - SIMPLIFIED
// ============================================================

function initSettings() {
  document.getElementById('sidebar-settings').addEventListener('click', openSettingsModal);
  document.getElementById('settings-logout-btn').addEventListener('click', () => {
    closeModal('settings-modal');
    logout();
  });
}

function openSettingsModal() {
  openModal('settings-modal');
}