// ============================================================
//  PROFILE FUNCTIONALITY
// ============================================================

function initProfile() {
  document.getElementById('sidebar-profile').addEventListener('click', openProfileModal);
  document.getElementById('show-qr-btn').addEventListener('click', showQRCode);
  document.getElementById('scan-qr-btn').addEventListener('click', startQRScannerFlow);
  document.getElementById('upload-qr-btn').addEventListener('click', triggerQRUpload);
  document.getElementById('download-qr-btn').addEventListener('click', downloadQRCode);
  
  document.getElementById('qr-file-input').addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) handleQRFileUpload(file);
    e.target.value = '';
  });
  
  document.getElementById('stop-scanner-btn').addEventListener('click', () => {
    stopQRScanner();
    closeModal('scanner-modal');
  });
}

function openProfileModal() {
  document.getElementById('profile-avatar').textContent = getInitials(currentUser.name);
  document.getElementById('profile-name').textContent = currentUser.name;
  document.getElementById('profile-email').textContent = currentUser.email;
  document.getElementById('profile-id').textContent = currentUser.id?.slice(0, 16) || '—';
  openModal('profile-modal');
}

function showQRCode() {
  closeModal('profile-modal');
  openModal('qr-modal');
  setTimeout(generateUserQRCode, 100);
}

function startQRScannerFlow() {
  closeModal('profile-modal');
  openModal('scanner-modal');
  startQRScanner();
}

function triggerQRUpload() {
  closeModal('profile-modal');
  document.getElementById('qr-file-input').click();
}