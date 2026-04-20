// ============================================================
//  PWA AGGRESSIVE INSTALL PROMPT
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');
const installText = document.querySelector('.install-text p');

let bannerDismissed = false;
const DISMISS_KEY = 'ncrypt_install_dismissed';
const DISMISS_EXPIRY = 7 * 24 * 60 * 60 * 1000; // 7 days

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function isBannerDismissed() {
  const dismissed = localStorage.getItem(DISMISS_KEY);
  if (!dismissed) return false;
  const timestamp = parseInt(dismissed, 10);
  return (Date.now() - timestamp) < DISMISS_EXPIRY;
}

function setBannerDismissed() {
  localStorage.setItem(DISMISS_KEY, Date.now().toString());
  bannerDismissed = true;
}

function showInstallBanner(message = null) {
  if (!installBanner) return;
  if (isAppInstalled()) return;
  if (bannerDismissed || isBannerDismissed()) return;
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (installText) {
    installText.textContent = message || (isIOS 
      ? 'Tap Share → "Add to Home Screen" to install' 
      : 'Add to Home Screen for the best experience');
  }
  
  installBanner.classList.remove('hidden');
}

function hideInstallBanner(remember = true) {
  if (!installBanner) return;
  installBanner.classList.add('hidden');
  if (remember) {
    setBannerDismissed();
  }
}

async function handleInstallClick() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    toast('📱 Tap the Share button, then "Add to Home Screen"', 'info', 6000);
    hideInstallBanner(true);
    return;
  }
  
  if (!deferredPrompt) {
    toast('Tap the menu (⋮) → "Install app" or "Add to Home Screen"', 'info', 5000);
    hideInstallBanner(true);
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  if (outcome === 'accepted') {
    toast('🎉 Installing ncrypt…', 'success');
  } else {
    toast('Maybe later!', 'info');
  }
  hideInstallBanner(false);
}

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  if (!isAppInstalled()) {
    showInstallBanner();
  }
});

if (installBtn) installBtn.addEventListener('click', handleInstallClick);
if (installClose) installClose.addEventListener('click', () => hideInstallBanner(true));

window.addEventListener('appinstalled', () => {
  hideInstallBanner(false);
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
});

window.addEventListener('load', () => {
  setTimeout(() => {
    if (!isAppInstalled() && !deferredPrompt) {
      showInstallBanner();
    }
  }, 3000);
});

function triggerInstallFromSettings() {
  bannerDismissed = false;
  showInstallBanner();
  toast('Tap "Install" to add ncrypt to your home screen', 'info');
}

window.triggerInstallFromSettings = triggerInstallFromSettings;