// ============================================================
//  SETTINGS FUNCTIONALITY
// ============================================================

// Initialize settings
function initSettings() {
  // Settings button
  document.getElementById('sidebar-settings').addEventListener('click', openSettingsModal);
  
  // Logout button in settings
  document.getElementById('settings-logout-btn').addEventListener('click', () => {
    closeModal('settings-modal');
    logout();
  });
}

// Open settings modal
function openSettingsModal() {
  // Update settings info
  document.getElementById('settings-name').textContent = currentUser.name;
  document.getElementById('settings-email').textContent = currentUser.email;
  document.getElementById('settings-id').textContent = currentUser.id?.slice(0, 16) || '—';
  
  openModal('settings-modal');
}