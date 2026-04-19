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
  
  // Show appropriate screen after loading
  setTimeout(() => {
    fadeOutLoader();
    
    // Skip setup screen since URL is hardcoded
    if (currentUser) {
      showScreen('app');
      initializeMessenger();
    } else {
      showScreen('auth');
    }
  }, 1500);
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
  
  // Setup screen is never shown now
  const setupScreen = document.getElementById('setup-screen');
  if (setupScreen) setupScreen.classList.add('hidden');
}

// Start app
init();