// ============================================================
//  PWA FUNCTIONALITY - FIXED FOR VER CEL/GITHUB PAGES
// ============================================================

let deferredPrompt = null;
let serviceWorkerRegistration = null;

// Initialize PWA features
function initPWA() {
  // Register service worker with correct scope
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Setup network status
  setupNetworkStatus();
  
  // Check if already installed
  checkInstalledStatus();
}

// Register service worker
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }
  
  try {
    // Use correct path for Vercel/GitHub Pages
    serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('[PWA] Service worker registered:', serviceWorkerRegistration);
    
    // Check for updates
    serviceWorkerRegistration.addEventListener('updatefound', () => {
      const newWorker = serviceWorkerRegistration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          showUpdateNotification();
        }
      });
    });
    
  } catch (err) {
    console.error('[PWA] Service worker registration failed:', err);
    // Try alternative path for Vercel
    try {
      serviceWorkerRegistration = await navigator.serviceWorker.register('./sw.js', {
        scope: './'
      });
      console.log('[PWA] Service worker registered with relative path');
    } catch (err2) {
      console.error('[PWA] All registration attempts failed');
    }
  }
}

// Show update notification
function showUpdateNotification() {
  const updateBar = document.createElement('div');
  updateBar.className = 'update-notification';
  updateBar.innerHTML = `
    <span>🔄 New version available!</span>
    <button id="update-app">Update</button>
  `;
  
  document.body.appendChild(updateBar);
  
  document.getElementById('update-app').addEventListener('click', () => {
    updateBar.remove();
    if (serviceWorkerRegistration && serviceWorkerRegistration.waiting) {
      serviceWorkerRegistration.waiting.postMessage({ type: 'SKIP_WAITING' });
    }
    setTimeout(() => window.location.reload(), 500);
  });
}

// Setup install prompt
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    console.log('[PWA] beforeinstallprompt fired!');
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button in settings
    showInstallButton();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    hideInstallButton();
    toast('✅ ncrypt installed successfully!', 'success');
  });
}

// Check if app is already installed
function checkInstalledStatus() {
  if (isAppInstalled()) {
    console.log('[PWA] App is installed (standalone mode)');
    hideInstallButton();
  }
  
  // For iOS - show instructions
  if (isIOS() && !isAppInstalled()) {
    showIOSInstallInstructions();
  }
}

// Show install button
function showInstallButton() {
  const installBtn = document.getElementById('pwa-install-btn');
  if (installBtn) {
    installBtn.style.display = 'flex';
    installBtn.addEventListener('click', promptInstall);
  }
}

// Hide install button
function hideInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.style.display = 'none';
}

// Prompt for installation
async function promptInstall() {
  if (!deferredPrompt) {
    // Check if already installed
    if (isAppInstalled()) {
      toast('App is already installed!', 'info');
      return;
    }
    
    // For iOS - show manual instructions
    if (isIOS()) {
      showIOSInstallInstructions();
      return;
    }
    
    toast('Installation not available. Try refreshing.', 'info');
    return;
  }
  
  try {
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`[PWA] User response: ${outcome}`);
    
    if (outcome === 'accepted') {
      toast('Installing ncrypt...', 'success');
    }
    
    deferredPrompt = null;
    hideInstallButton();
  } catch (err) {
    console.error('[PWA] Install prompt error:', err);
    toast('Installation failed', 'error');
  }
}

// Show iOS installation instructions
function showIOSInstallInstructions() {
  const settingsSection = document.querySelector('.settings-section');
  if (!settingsSection) return;
  
  const existingInstructions = document.getElementById('ios-install-instructions');
  if (existingInstructions) return;
  
  const instructions = document.createElement('div');
  instructions.id = 'ios-install-instructions';
  instructions.style.cssText = `
    background: var(--accent-light);
    padding: 16px;
    border-radius: 12px;
    margin-bottom: 16px;
    font-size: 13px;
  `;
  instructions.innerHTML = `
    <p style="font-weight: 600; margin-bottom: 8px;">📱 Install on iOS:</p>
    <p>1. Tap <strong>Share</strong> button in Safari</p>
    <p>2. Scroll down and tap <strong>"Add to Home Screen"</strong></p>
    <p>3. Tap <strong>"Add"</strong></p>
  `;
  
  settingsSection.insertBefore(instructions, settingsSection.firstChild);
}

// Check if iOS
function isIOS() {
  return /iphone|ipad|ipod/.test(window.navigator.userAgent.toLowerCase());
}

// Check if app is installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Setup network status
function setupNetworkStatus() {
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      document.body.classList.remove('offline');
    } else {
      document.body.classList.add('offline');
      toast('📴 You are offline', 'info');
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  if (!navigator.onLine) {
    document.body.classList.add('offline');
  }
}

// Get PWA status
function getPWAStatus() {
  return {
    installed: isAppInstalled(),
    serviceWorker: !!serviceWorkerRegistration,
    installable: !!deferredPrompt,
    online: navigator.onLine,
    isIOS: isIOS()
  };
}

// Manual install trigger (can be called from console)
function manualInstall() {
  if (deferredPrompt) {
    promptInstall();
  } else {
    console.log('[PWA] Status:', getPWAStatus());
    toast('Check console for PWA status', 'info');
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initPWA();
  
  // Log status for debugging
  setTimeout(() => {
    console.log('[PWA] Status:', getPWAStatus());
  }, 2000);
});

// Expose to window
window.pwa = {
  promptInstall,
  getPWAStatus,
  isAppInstalled,
  manualInstall
};

// Add manual install button to settings if needed
function addManualInstallButton() {
  const settingsSection = document.querySelector('.settings-section');
  if (!settingsSection) return;
  
  const btn = document.createElement('button');
  btn.className = 'settings-btn';
  btn.innerHTML = `
    <span class="material-icons-round">download</span>
    <span>Install App (Manual)</span>
  `;
  btn.onclick = manualInstall;
  
  settingsSection.insertBefore(btn, settingsSection.firstChild);
}

// Try to show manual button if automatic doesn't work
setTimeout(addManualInstallButton, 3000);