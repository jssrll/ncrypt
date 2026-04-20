// ============================================================
//  PWA PERSISTENT INSTALL PROMPT – REAPPEARS EVERY 30 SECONDS
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');
const installText = document.querySelector('.install-text p');

let bannerInterval = null;
const REAPPEAR_DELAY = 30000; // 30 seconds

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function showInstallBanner() {
  if (!installBanner) return;
  if (isAppInstalled()) {
    stopBannerInterval();
    return;
  }
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (installText) {
    installText.textContent = isIOS
      ? 'Tap Share → "Add to Home Screen" to install'
      : 'Add to Home Screen for the best experience';
  }
  
  installBanner.classList.remove('hidden');
}

function hideInstallBanner() {
  if (!installBanner) return;
  installBanner.classList.add('hidden');
}

function stopBannerInterval() {
  if (bannerInterval) {
    clearInterval(bannerInterval);
    bannerInterval = null;
  }
}

function startBannerInterval() {
  stopBannerInterval(); // Clear any existing
  bannerInterval = setInterval(() => {
    showInstallBanner();
  }, REAPPEAR_DELAY);
}

async function handleInstallClick() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    toast('📱 Tap the Share button, then "Add to Home Screen"', 'info', 6000);
    hideInstallBanner();
    return;
  }
  
  if (!deferredPrompt) {
    toast('Tap the menu (⋮) → "Install app" or "Add to Home Screen"', 'info', 5000);
    hideInstallBanner();
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
  hideInstallBanner();
}

// ── Event listeners ───────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
  startBannerInterval();
});

if (installBtn) installBtn.addEventListener('click', handleInstallClick);

if (installClose) {
  installClose.addEventListener('click', () => {
    hideInstallBanner();
    // The interval will show it again in 30 seconds
  });
}

// When the app is installed, stop the interval permanently
window.addEventListener('appinstalled', () => {
  hideInstallBanner();
  stopBannerInterval();
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
});

// Initial show after page load
window.addEventListener('load', () => {
  setTimeout(() => {
    showInstallBanner();
    startBannerInterval();
  }, 1000);
});

// If the user switches tabs and comes back, we keep the interval running.
// No need to pause on blur because the interval is just a timer.