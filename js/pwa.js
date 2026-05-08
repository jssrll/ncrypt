// ============================================================
//  PWA - Install via Settings Button Only
// ============================================================

let deferredPrompt = null;

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

async function triggerInstall() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    toast('📱 Tap the Share button, then "Add to Home Screen"', 'info', 8000);
    return;
  }
  
  if (!deferredPrompt) {
    toast('Your browser supports installation via the menu (⋮) → "Install app"', 'info', 5000);
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  if (outcome === 'accepted') {
    toast('🎉 Installing ncrypt…', 'success');
  }
}

// Listen for install prompt but don't show any banner
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  console.log('[PWA] App can be installed via settings');
});

window.addEventListener('appinstalled', () => {
  deferredPrompt = null;
  toast('✅ ncrypt installed successfully!', 'success');
});

// Export for use in settings
window.triggerInstall = triggerInstall;
window.isAppInstalled = isAppInstalled;