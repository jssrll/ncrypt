// ============================================================
//  PWA - Dismissible Install Banner
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');

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
  
  // Check if user dismissed it before
  const dismissed = localStorage.getItem('ncrypt_install_dismissed');
  if (dismissed === 'true') {
    installBanner.classList.add('hidden');
    return;
  }
  
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const installText = document.querySelector('.install-text p');
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
  }
}

function dismissInstallBanner() {
  localStorage.setItem('ncrypt_install_dismissed', 'true');
  installBanner.classList.add('hidden');
  toast('You can install later from browser menu', 'info', 2000);
}

function addDismissButton() {
  const bannerContent = document.querySelector('.install-banner-content');
  if (!bannerContent) return;
  
  // Check if dismiss button already exists
  if (document.querySelector('.install-dismiss')) return;
  
  const dismissBtn = document.createElement('button');
  dismissBtn.className = 'install-dismiss';
  dismissBtn.setAttribute('aria-label', 'Dismiss install banner');
  dismissBtn.innerHTML = '<span class="material-icons-round">close</span>';
  dismissBtn.addEventListener('click', dismissInstallBanner);
  bannerContent.appendChild(dismissBtn);
}

// Reset dismiss preference (optional - call this from settings if needed)
function resetInstallBanner() {
  localStorage.removeItem('ncrypt_install_dismissed');
  showInstallBanner();
}

// Event listeners
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  showInstallBanner();
});

if (installBtn) {
  installBtn.addEventListener('click', handleInstallClick);
}

window.addEventListener('appinstalled', () => {
  installBanner.classList.add('hidden');
  deferredPrompt = null;
  toast('✅ ncrypt installed!', 'success');
});

// Show banner on load and add dismiss button
window.addEventListener('load', () => {
  showInstallBanner();
  addDismissButton();
});

// Also show on visibility change (when returning to app)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) {
    showInstallBanner();
    addDismissButton();
  }
});

// Export functions for use elsewhere (optional)
window.resetInstallBanner = resetInstallBanner;