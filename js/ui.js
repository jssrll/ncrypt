// ============================================================
//  UI MANAGEMENT - OPTIMIZED
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
  
  // Setup responsive handlers
  setupResponsiveHandlers();
  
  // Setup pull to refresh
  setupPullToRefresh();
  
  // Show appropriate screen after loading
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

// Setup responsive handlers
function setupResponsiveHandlers() {
  // Handle viewport changes
  window.addEventListener('resize', debounce(() => {
    adjustViewportHeight();
  }, 100));
  
  // Initial viewport adjustment
  adjustViewportHeight();
  
  // Handle orientation change
  window.addEventListener('orientationchange', () => {
    setTimeout(adjustViewportHeight, 100);
  });
  
  // Handle safe areas
  document.documentElement.style.setProperty('--safe-top', 'env(safe-area-inset-top, 0px)');
  document.documentElement.style.setProperty('--safe-bottom', 'env(safe-area-inset-bottom, 0px)');
}

// Adjust viewport height for mobile browsers
function adjustViewportHeight() {
  const vh = window.innerHeight * 0.01;
  document.documentElement.style.setProperty('--vh', `${vh}px`);
  
  // Fix for iOS
  const containers = document.querySelectorAll('.messenger-container, .chat-screen, .conversations-screen');
  containers.forEach(container => {
    container.style.height = `${window.innerHeight}px`;
  });
}

// Setup pull to refresh
function setupPullToRefresh() {
  const conversationsList = document.getElementById('conversations-list');
  if (!conversationsList) return;
  
  let touchStartY = 0;
  let touchEndY = 0;
  let isPulling = false;
  
  conversationsList.addEventListener('touchstart', (e) => {
    if (conversationsList.scrollTop === 0) {
      touchStartY = e.touches[0].clientY;
      isPulling = true;
    }
  }, { passive: true });
  
  conversationsList.addEventListener('touchmove', (e) => {
    if (!isPulling) return;
    
    touchEndY = e.touches[0].clientY;
    const diff = touchEndY - touchStartY;
    
    if (diff > 60) {
      conversationsList.style.transform = `translateY(${Math.min(diff - 60, 40)}px)`;
    }
  }, { passive: true });
  
  conversationsList.addEventListener('touchend', async () => {
    if (!isPulling) return;
    
    const diff = touchEndY - touchStartY;
    conversationsList.style.transform = '';
    conversationsList.style.transition = 'transform 0.2s ease';
    
    if (diff > 80) {
      toast('Refreshing...', 'info');
      await loadConversations();
    }
    
    setTimeout(() => {
      conversationsList.style.transition = '';
    }, 200);
    
    isPulling = false;
  });
}

// Debounce utility
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Open modal
function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('hidden');
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
  }
}

// Close modal
function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('hidden');
    // Restore body scroll
    const visibleModals = document.querySelectorAll('.modal:not(.hidden)');
    if (visibleModals.length === 0) {
      document.body.style.overflow = '';
    }
  }
}

// Fade out loading overlay
function fadeOutLoader() {
  const loader = document.getElementById('loading-overlay');
  loader.classList.add('fade');
  setTimeout(() => {
    loader.classList.add('hidden');
  }, 300);
}

// Show specific screen
function showScreen(screenName) {
  ['auth', 'app'].forEach(name => {
    const screen = document.getElementById(`${name}-screen`);
    if (screen) screen.classList.add('hidden');
  });
  
  const targetScreen = document.getElementById(`${screenName}-screen`);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    adjustViewportHeight();
  }
}

// Handle back button (Android)
let backPressTimer = 0;
document.addEventListener('backbutton', (e) => {
  e.preventDefault();
  
  // If chat is open, go back to conversations
  const chatScreen = document.getElementById('chat-screen');
  if (chatScreen && !chatScreen.classList.contains('hidden')) {
    if (typeof goBackToConversations === 'function') {
      goBackToConversations();
    }
    return;
  }
  
  // If modal is open, close it
  const visibleModal = document.querySelector('.modal:not(.hidden)');
  if (visibleModal) {
    closeModal(visibleModal.id);
    return;
  }
  
  // Double press to exit
  const now = Date.now();
  if (now - backPressTimer < 1500) {
    if (navigator.app && navigator.app.exitApp) {
      navigator.app.exitApp();
    }
  } else {
    backPressTimer = now;
    toast('Press again to exit', 'info');
  }
}, false);

// Handle network status
window.addEventListener('online', () => {
  document.body.classList.remove('offline');
  toast('Back online', 'success');
  if (currentUser) {
    loadConversations();
  }
});

window.addEventListener('offline', () => {
  document.body.classList.add('offline');
  toast('You are offline', 'info');
});

// Preload images for better performance
function preloadImages() {
  const images = [
    '/icons/icon-192x192.png',
    '/icons/icon-512x512.png'
  ];
  
  images.forEach(src => {
    const img = new Image();
    img.src = src;
  });
}

// Optimize scrolling performance
function optimizeScrolling() {
  const scrollContainers = document.querySelectorAll('.conversations-list, .messages-container');
  scrollContainers.forEach(container => {
    container.style.willChange = 'transform';
    container.style.webkitOverflowScrolling = 'touch';
    
    container.addEventListener('scroll', () => {
      container.style.willChange = 'transform';
    }, { passive: true });
    
    container.addEventListener('scrollend', () => {
      container.style.willChange = 'auto';
    });
  });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  preloadImages();
  init();
  
  // Optimize after render
  setTimeout(optimizeScrolling, 500);
});

// Handle visibility change (app in background)
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    // App in background - reduce polling
    if (typeof stopMessagePolling === 'function') {
      stopMessagePolling();
    }
  } else {
    // App in foreground - resume polling
    if (currentUser && typeof startMessagePolling === 'function') {
      startMessagePolling();
      loadConversations();
    }
  }
});

// Handle before unload
window.addEventListener('beforeunload', () => {
  if (typeof stopMessagePolling === 'function') {
    stopMessagePolling();
  }
  if (typeof qrStream !== 'undefined' && qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
  }
});

// Expose utilities
window.openModal = openModal;
window.closeModal = closeModal;
window.showScreen = showScreen;