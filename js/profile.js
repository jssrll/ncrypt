// ============================================================
//  PROFILE FUNCTIONALITY
// ============================================================

// Initialize profile functionality
function initProfile() {
  // Profile button
  document.getElementById('sidebar-profile').addEventListener('click', openProfileModal);
  
  // QR code buttons
  document.getElementById('show-qr-btn').addEventListener('click', showQRCode);
  document.getElementById('scan-qr-btn').addEventListener('click', startQRScannerFlow);
  document.getElementById('upload-qr-btn').addEventListener('click', triggerQRUpload);
  
  // Download QR button
  document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
  
  // File input for QR upload
  document.getElementById('qr-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) {
      handleQRFileUpload(file);
    }
    e.target.value = '';
  });
  
  // Stop scanner button
  document.getElementById('stop-scanner-btn').addEventListener('click', () => {
    stopQRScanner();
    closeModal('scanner-modal');
  });
}

// Open profile modal
function openProfileModal() {
  // Update profile info
  document.getElementById('profile-avatar').textContent = getInitials(currentUser.name);
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-id').textContent = currentUser.id?.slice(0, 16) || '—';
  
  openModal('profile-modal');
}

// Show QR code
function showQRCode() {
  closeModal('profile-modal');
  generateUserQRCode();
  openModal('qr-modal');
}

// Start QR scanner flow
async function startQRScannerFlow() {
  closeModal('profile-modal');
  
  try {
    await loadQRScannerLibrary();
    openModal('scanner-modal');
    await startQRScanner();
  } catch (err) {
    console.error('Failed to load QR scanner:', err);
    toast('Failed to load QR scanner', 'error');
  }
}

// Trigger QR file upload
function triggerQRUpload() {
  closeModal('profile-modal');
  document.getElementById('qr-file-input').click();
}