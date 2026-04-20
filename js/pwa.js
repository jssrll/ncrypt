// ============================================================
//  PWA AGGRESSIVE INSTALL PROMPT – NO ESCAPE
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');
const installText = document.querySelector('.install-text p');

// We do NOT use localStorage – the banner always comes back

function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true;
}

function showInstallBanner() {
  if (!installBanner) return;
  if (isAppInstalled()) return; // already installed – stop forever
  
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
  // NO permanent dismissal – it will come back on next interaction
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

// ── Persistent re‑show on ANY user interaction ────────────────
function aggressiveShow() {
  if (isAppInstalled()) return;
  showInstallBanner();
}

// Throttle to avoid spamming during rapid clicks
let pendingShow = false;
function scheduleAggressiveShow() {
  if (pendingShow) return;
  pendingShow = true;
  requestAnimationFrame(() => {
    aggressiveShow();
    pendingShow = false;
  });
}

// Attach listeners to all meaningful user interactions
const interactionEvents = ['click', 'touchstart', 'keydown', 'scroll'];
interactionEvents.forEach(evt => {
  document.addEventListener(evt, scheduleAggressiveShow, { passive: true });
});

// Also show after any navigation (including back/forward)
window.addEventListener('pageshow', scheduleAggressiveShow);

// ── Standard PWA install events ───────────────────────────────
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

if (installBtn) installBtn.addEventListener('click', handleInstallClick);

// Close button only hides temporarily – next interaction brings it back
if (installClose) {
  installClose.addEventListener('click', () => {
    hideInstallBanner();
  });
}

// Once installed, stop showing forever
window.addEventListener('appinstalled', () => {
  hideInstallBanner();
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
  // Remove all aggressive listeners? Not necessary – isAppInstalled() will block showing
});

// Initial show after load
window.addEventListener('load', () => {
  setTimeout(showInstallBanner, 1000);
});