// ============================================================
//  PWA FUNCTIONALITY
// ============================================================

let deferredPrompt = null;
let serviceWorkerRegistration = null;

// Initialize PWA features
function initPWA() {
  // Register service worker
  registerServiceWorker();
  
  // Setup install prompt
  setupInstallPrompt();
  
  // Setup push notifications
  setupPushNotifications();
  
  // Setup network status
  setupNetworkStatus();
  
  // Setup background sync
  setupBackgroundSync();
}

// Register service worker
async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) {
    console.log('[PWA] Service workers not supported');
    return;
  }
  
  try {
    serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js', {
      scope: '/'
    });
    
    console.log('[PWA] Service worker registered:', serviceWorkerRegistration);
    
    // Check for updates
    serviceWorkerRegistration.addEventListener('updatefound', () => {
      const newWorker = serviceWorkerRegistration.installing;
      
      newWorker.addEventListener('statechange', () => {
        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
          // New update available
          showUpdateNotification();
        }
      });
    });
    
    // Listen for messages from service worker
    navigator.serviceWorker.addEventListener('message', (event) => {
      handleServiceWorkerMessage(event.data);
    });
    
  } catch (err) {
    console.error('[PWA] Service worker registration failed:', err);
  }
}

// Show update notification
function showUpdateNotification() {
  const updateBar = document.createElement('div');
  updateBar.className = 'update-notification';
  updateBar.innerHTML = `
    <span>New version available!</span>
    <button id="update-app">Update</button>
  `;
  
  document.body.appendChild(updateBar);
  
  document.getElementById('update-app').addEventListener('click', () => {
    updateBar.remove();
    navigator.serviceWorker.ready.then((reg) => {
      reg.waiting.postMessage({ type: 'SKIP_WAITING' });
    });
    
    setTimeout(() => {
      window.location.reload();
    }, 500);
  });
}

// Setup install prompt
function setupInstallPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    
    // Show install button in settings
    showInstallButton();
  });
  
  window.addEventListener('appinstalled', () => {
    console.log('[PWA] App installed');
    deferredPrompt = null;
    toast('ncrypt installed successfully!', 'success');
    hideInstallButton();
  });
}

// Show install button
function showInstallButton() {
  const settingsSection = document.querySelector('.settings-section:last-child');
  if (!settingsSection) return;
  
  const existingBtn = document.getElementById('pwa-install-btn');
  if (existingBtn) return;
  
  const installBtn = document.createElement('button');
  installBtn.id = 'pwa-install-btn';
  installBtn.className = 'settings-btn';
  installBtn.innerHTML = `
    <span class="material-icons-round">download</span>
    <span>Install App</span>
  `;
  installBtn.addEventListener('click', promptInstall);
  
  settingsSection.insertBefore(installBtn, settingsSection.firstChild);
}

// Hide install button
function hideInstallButton() {
  const btn = document.getElementById('pwa-install-btn');
  if (btn) btn.remove();
}

// Prompt for installation
async function promptInstall() {
  if (!deferredPrompt) {
    toast('App is already installed or not available', 'info');
    return;
  }
  
  deferredPrompt.prompt();
  
  const { outcome } = await deferredPrompt.userChoice;
  console.log(`[PWA] User response: ${outcome}`);
  
  deferredPrompt = null;
  hideInstallButton();
}

// Setup push notifications
async function setupPushNotifications() {
  if (!('Notification' in window) || !('PushManager' in window)) {
    console.log('[PWA] Push notifications not supported');
    return;
  }
  
  const permission = await Notification.permission;
  
  if (permission === 'granted') {
    await subscribeToPushNotifications();
  }
}

// Subscribe to push notifications
async function subscribeToPushNotifications() {
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Get public key from server (you'll need to implement VAPID)
    // For now, we'll just check permission
    
    console.log('[PWA] Push notifications ready');
    
    // Store preference
    localStorage.setItem('ncrypt_notifications', 'true');
    
  } catch (err) {
    console.error('[PWA] Push subscription failed:', err);
  }
}

// Request notification permission
async function requestNotificationPermission() {
  if (!('Notification' in window)) {
    toast('Notifications not supported', 'error');
    return false;
  }
  
  const permission = await Notification.requestPermission();
  
  if (permission === 'granted') {
    await subscribeToPushNotifications();
    toast('Notifications enabled', 'success');
    return true;
  } else {
    toast('Notifications denied', 'error');
    return false;
  }
}

// Setup network status
function setupNetworkStatus() {
  const updateOnlineStatus = () => {
    if (navigator.onLine) {
      document.body.classList.remove('offline');
      toast('Back online', 'success');
    } else {
      document.body.classList.add('offline');
      toast('You are offline', 'info');
    }
  };
  
  window.addEventListener('online', updateOnlineStatus);
  window.addEventListener('offline', updateOnlineStatus);
  
  if (!navigator.onLine) {
    document.body.classList.add('offline');
  }
}

// Setup background sync
async function setupBackgroundSync() {
  if (!('serviceWorker' in navigator) || !('SyncManager' in window)) {
    console.log('[PWA] Background sync not supported');
    return;
  }
  
  try {
    const registration = await navigator.serviceWorker.ready;
    
    // Check if periodic sync is available
    if ('periodicSync' in registration) {
      const status = await navigator.permissions.query({
        name: 'periodic-background-sync'
      });
      
      if (status.state === 'granted') {
        await registration.periodicSync.register('check-messages', {
          minInterval: 60 * 60 * 1000 // 1 hour
        });
        console.log('[PWA] Periodic sync registered');
      }
    }
  } catch (err) {
    console.error('[PWA] Background sync setup failed:', err);
  }
}

// Handle service worker messages
function handleServiceWorkerMessage(data) {
  if (!data) return;
  
  switch (data.type) {
    case 'BACKGROUND_CHECK':
      // Trigger message check
      if (currentUser) {
        loadConversations();
      }
      break;
      
    case 'OFFLINE_MESSAGE_SYNCED':
      toast('Messages synced', 'success');
      break;
  }
}

// Save offline message
async function saveOfflineMessage(url, data) {
  if (!serviceWorkerRegistration) return;
  
  if (serviceWorkerRegistration.active) {
    serviceWorkerRegistration.active.postMessage({
      type: 'SAVE_OFFLINE_MESSAGE',
      url,
      data
    });
  }
}

// Check if app is installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Get PWA install status
function getPWAStatus() {
  return {
    installed: isAppInstalled(),
    serviceWorker: !!serviceWorkerRegistration,
    notifications: Notification.permission,
    online: navigator.onLine
  };
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  initPWA();
});

// Expose to window
window.pwa = {
  requestNotificationPermission,
  promptInstall,
  getPWAStatus,
  isAppInstalled
};