// ============================================================
//  PROFILE FUNCTIONALITY - FIXED
// ============================================================

function initProfile() {
  // Own profile button
  const profileBtn = document.getElementById('sidebar-profile');
  if (profileBtn) profileBtn.addEventListener('click', openProfileModal);

  // QR buttons
  const showQr = document.getElementById('show-qr-btn');
  if (showQr) showQr.addEventListener('click', () => {
    closeModal('profile-modal');
    openModal('qr-modal');
    setTimeout(generateUserQRCode, 150);
  });

  const scanQr = document.getElementById('scan-qr-btn');
  if (scanQr) scanQr.addEventListener('click', () => {
    closeModal('profile-modal');
    openModal('scanner-modal');
    startQRScanner();
  });

  const uploadQr = document.getElementById('upload-qr-btn');
  if (uploadQr) uploadQr.addEventListener('click', () => {
    closeModal('profile-modal');
    document.getElementById('qr-file-input').click();
  });

  const downloadQr = document.getElementById('download-qr-btn');
  if (downloadQr) downloadQr.addEventListener('click', downloadQRCode);

  // QR file input
  const qrFileInput = document.getElementById('qr-file-input');
  if (qrFileInput) {
    qrFileInput.addEventListener('change', e => {
      const file = e.target.files[0];
      if (file) handleQRFileUpload(file);
      e.target.value = '';
    });
  }

  // Scanner stop button
  const stopBtn = document.getElementById('stop-scanner-btn');
  if (stopBtn) {
    stopBtn.addEventListener('click', () => {
      stopQRScanner();
      closeModal('scanner-modal');
    });
  }
}

function openProfileModal() {
  if (!currentUser) return;
  document.getElementById('profile-avatar').textContent = getInitials(currentUser.name);
  document.getElementById('profile-name').textContent = currentUser.name || '—';
  document.getElementById('profile-email').textContent = currentUser.email || '—';
  document.getElementById('profile-id').textContent = currentUser.id || '—';
  openModal('profile-modal');
}