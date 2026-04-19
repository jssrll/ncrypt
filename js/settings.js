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
  
  // Notifications toggle
  const notifToggle = document.getElementById('notifications-toggle');
  const savedNotif = localStorage.getItem('ncrypt_notifications');
  if (savedNotif !== null) {
    notifToggle.checked = savedNotif === 'true';
  }
  notifToggle.addEventListener('change', (e) => {
    localStorage.setItem('ncrypt_notifications', e.target.checked);
    toast(`Notifications ${e.target.checked ? 'enabled' : 'disabled'}`, 'success');
  });
  
  // Change password button
  document.getElementById('change-password-btn').addEventListener('click', showChangePasswordPrompt);
}

// Open settings modal
function openSettingsModal() {
  // Update settings info
  document.getElementById('settings-name').textContent = currentUser.name;
  document.getElementById('settings-email').textContent = currentUser.email;
  
  openModal('settings-modal');
}

// Show change password prompt
function showChangePasswordPrompt() {
  closeModal('settings-modal');
  
  // Create a simple prompt dialog
  const newPassword = prompt('Enter new password (minimum 8 characters):');
  
  if (!newPassword) return;
  
  if (newPassword.length < 8) {
    toast('Password must be at least 8 characters', 'error');
    return;
  }
  
  const confirmPassword = prompt('Confirm new password:');
  
  if (newPassword !== confirmPassword) {
    toast('Passwords do not match', 'error');
    return;
  }
  
  changePassword(newPassword);
}

// Change password
async function changePassword(newPassword) {
  try {
    const hash = await sha256(newPassword);
    const result = await callAPI({
      action: 'changePassword',
      userId: currentUser.id,
      newPassword: hash
    });
    
    if (result.success) {
      toast('Password changed successfully', 'success');
    } else {
      toast(result.message || 'Failed to change password', 'error');
    }
  } catch (err) {
    console.error('Change password error:', err);
    toast('Failed to change password', 'error');
  }
}