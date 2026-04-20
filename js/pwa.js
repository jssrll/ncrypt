// ============================================================
//  PWA PERSISTENT INSTALL BAR – NEVER DISMISSIBLE
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installText = document.querySelector('.install-text p');

// Remove close button functionality entirely
const installClose = document.getElementById('install-close');
if (installClose) {
  installClose.style.display = 'none'; // Hide the close button
}

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function showInstallBanner() {
  if (!installBanner) return;
  if (isAppInstalled()) {
    installBanner.classList.add('hidden');
    return;
  }
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  if (installText) {
    installText.textContent = isIOS
      ? '📱 Tap Share → "Add to Home Screen"'
      : 'Add to Home Screen for the best experience';
  }
  
  installBanner.classList.remove('hidden');
}

async function handleInstallClick() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  
  if (isIOS) {
    toast('📱 Tap the Share button, then "Add to Home Screen"', 'info', 8000);
    return;
  }
  
  if (!deferredPrompt) {
    toast('Tap the menu (⋮) → "Install app" or "Add to Home Screen"', 'info', 5000);
    return;
  }
  
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  
  if (outcome === 'accepted') {
    toast('🎉 Installing ncrypt…', 'success');
    installBanner.classList.add('hidden');
  } else {
    toast('Maybe later!', 'info');
    // Banner stays visible
  }
}

// ── Event listeners ───────────────────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

if (installBtn) installBtn.addEventListener('click', handleInstallClick);

window.addEventListener('appinstalled', () => {
  installBanner.classList.add('hidden');
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
});

// Show banner immediately on load and on every page visibility change
window.addEventListener('load', showInstallBanner);
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) showInstallBanner();
});

// Also show on any navigation (SPA)
window.addEventListener('popstate', showInstallBanner);