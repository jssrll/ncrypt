// ============================================================
//  PWA AGGRESSIVE INSTALL PROMPT
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');
const installText = document.querySelector('.install-text p');

// Track if user dismissed the banner
let bannerDismissed = false;
const DISMISS_KEY = 'ncrypt_install_dismissed';
const DISMISS_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

// Check if app is installed (standalone mode)
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

// Check if banner was recently dismissed
function isBannerDismissed() {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const timestamp = parseInt(dismissed, 10);
  return (Date.now() - timestamp) < DISMISS_EXPIRY;
}

// Mark banner as dismissed
function setBannerDismissed() {
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
  bannerDismissed = true;
}

// Show the banner (with optional custom message for iOS)
function showInstallBanner(message = null) {
  if (!installBanner) return;
  if (isAppInstalled()) return;
  if (bannerDismissed || isBannerDismissed()) return;
  
  // Customise text for iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (installText) {
    installText.textContent = message || (isIOS 
      ? 'Tap Share → "Add to Home Screen" to install' 
      : 'Add to Home Screen for the best experience');
  }
  
  installBanner.classList.remove('hidden');
}

// Hide banner and remember dismissal
function hideInstallBanner(remember = true) {
  if (!installBanner) return;
  installBanner.classList.add('hidden');
  if (remember) {
    setBannerDismissed();
  }
}

// Handle the install button click
async function handleInstallClick() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    // iOS: show detailed instructions as a modal/toast
    toast('📱 Tap the Share button, then "Add to Home Screen"', 'info', 6000);
    hideInstallBanner(true);
    return;
  }
  
  if (!deferredPrompt) {
    // Fallback – show manual instructions
    toast('Tap the menu (⋮) → "Install app" or "Add to Home Screen"', 'info', 5000);
    hideInstallBanner(true);
    return;
  }
  
  // Show native prompt
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  if (outcome === 'accepted') {
    toast('🎉 Installing ncrypt…', 'success');
  } else {
    toast('Maybe later!', 'info');
  }
  hideInstallBanner(false); // don't permanently dismiss – user may reconsider
}

// -------- Event Listeners --------
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  // Show banner immediately if not installed
  if (!isAppInstalled()) {
    showInstallBanner();
  }
});

if (installBtn) {
  installBtn.addEventListener('click', handleInstallClick);
}

if (installClose) {
  installClose.addEventListener('click', () => hideInstallBanner(true));
}

// If the app gets installed later, hide banner
window.addEventListener('appinstalled', () => {
  hideInstallBanner(false);
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
});

// Show banner after a short delay if still not installed (catch browsers that fire event late)
window.addEventListener('load', () => {
  setTimeout(() => {
    if (!isAppInstalled() && !deferredPrompt) {
      // If no deferredPrompt yet, we still show banner (with generic text)
      showInstallBanner();
    }
  }, 3000);
});

// -------- Manual trigger from Settings (optional) --------
function triggerInstallFromSettings() {
  bannerDismissed = false; // reset dismissal for this session
  showInstallBanner();
  toast('Tap "Install" to add ncrypt to your home screen', 'info');
}

// Expose to global so settings.js can call it
window.triggerInstallFromSettings = triggerInstallFromSettings;