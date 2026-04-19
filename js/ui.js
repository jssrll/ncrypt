// ============================================================
//  UI MANAGEMENT
// ============================================================

// Initialize app
function init() {
  // Load saved user
  const savedUser = localStorage.getItem('ncrypt_user');
  
  if (savedUser) {
    try {
      currentUser = JSON.parse(savedUser);
    } catch (e) {
      currentUser = null;
    }
  }
  
  // Initialize auth listeners
  initAuth();
  
  // Setup modal close buttons
  setupModals();
  
  // Show appropriate screen after loading
  setTimeout(() => {
    fadeOutLoader();
    
    if (currentUser) {
      showScreen('app');
      initializeMessenger();
    } else {
      showScreen('auth');
    }
  }, 1500);
}

// Setup modal functionality
function setupModals() {
  // Close buttons
  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => {
      const modal = btn.closest('.modal');
      if (modal) closeModal(modal.id);
    });
  });
  
  // Click overlay to close
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', () => {
      const modal = overlay.closest('.modal');
      if (modal) {
        // Stop scanner if closing scanner modal
        if (modal.id === 'scanner-modal') {
          stopQRScanner();
        }
        closeModal(modal.id);
      }
    });
  });
  
  // Escape key to close
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const visibleModal = document.querySelector('.modal:not(.hidden)');
      if (visibleModal) {
        if (visibleModal.id === 'scanner-modal') {
          stopQRScanner();
        }
        closeModal(visibleModal.id);
      }
    }
  });
}

// Open modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
  }
}

// Fade out loading overlay
function fadeOutLoader() {
  const loader = document.getElementById('loading-overlay');
  loader.classList.add('fade');
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 420);
}

// Show specific screen
function showScreen(screenName) {
  ['auth', 'app'].forEach(name => {
    document.getElementById(`${name}-screen`).classList.add('hidden');
  });
  document.getElementById(`${screenName}-screen`).classList.remove('hidden');
}

// Start app
init();