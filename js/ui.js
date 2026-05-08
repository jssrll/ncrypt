// ============================================================
//  UI MANAGEMENT
// ============================================================

// ── Modal system ──────────────────────────────────────────────
function openModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  const modal = document.getElementById(id);
  if (!modal) return;
  modal.classList.add('hidden');
  const anyOpen = document.querySelectorAll('.modal:not(.hidden)');
  if (!anyOpen.length) document.body.style.overflow = '';
}

// Wire up all modal close buttons
function initModals() {
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });

  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });
}

// ── Screen management ─────────────────────────────────────────
function showScreen(screenName) {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app-screen').classList.add('hidden');
  document.getElementById(`${screenName}-screen`).classList.remove('hidden');
}

// ── Loader ────────────────────────────────────────────────────
function fadeOutLoader() {
  const loader = document.getElementById('loading-overlay');
  if (!loader) return;
  loader.classList.add('fade');
  setTimeout(() => loader.classList.add('hidden'), 420);
}

// ── VH fix for mobile browsers ────────────────────────────────
function setVH() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
}
window.addEventListener('resize', setVH);
window.addEventListener('orientationchange', () => setTimeout(setVH, 200));
setVH();

// ── Init ──────────────────────────────────────────────────────
function init() {
  initModals();

  const savedUser = localStorage.getItem('ncrypt_user');
  if (savedUser) {
    try { currentUser = JSON.parse(savedUser); }
    catch (e) { currentUser = null; }
  }

  initAuth();

  setTimeout(() => {
    fadeOutLoader();
    if (currentUser) {
      showScreen('app');
      initializeMessenger();
    } else {
      showScreen('auth');
    }
  }, 1200);
}

init();