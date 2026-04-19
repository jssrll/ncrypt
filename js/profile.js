// ============================================================
//  PROFILE FUNCTIONALITY - SIMPLIFIED (No QR)
// ============================================================

function initProfile() {
  // Own profile button
  const profileBtn = document.getElementById('sidebar-profile');
  if (profileBtn) profileBtn.addEventListener('click', openProfileModal);

  // Copy ID button
  const copyIdBtn = document.getElementById('copy-id-btn');
  if (copyIdBtn) {
    copyIdBtn.addEventListener('click', copyUserId);
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

function copyUserId() {
  if (!currentUser || !currentUser.id) {
    toast('No user ID found', 'error');
    return;
  }
  
  navigator.clipboard.writeText(currentUser.id).then(() => {
    toast('User ID copied to clipboard!', 'success');
  }).catch(() => {
    // Fallback for older browsers
    const textArea = document.createElement('textarea');
    textArea.value = currentUser.id;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    toast('User ID copied!', 'success');
  });
}