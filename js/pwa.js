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
}

// Add close button to banner (update HTML if needed)
function addDismissButton() {
  const bannerContent = document.querySelector('.install-banner-content');
  if (bannerContent && !document.querySelector('.install-dismiss')) {
    const dismissBtn = document.createElement('button');
    dismissBtn.className = 'install-dismiss';
    dismissBtn.innerHTML = '<span class="material-icons-round">close</span>';
    dismissBtn.style.background = 'none';
    dismissBtn.style.border = 'none';
    dismissBtn.style.cursor = 'pointer';
    dismissBtn.style.padding = '8px';
    dismissBtn.style.color = 'var(--text-muted)';
    dismissBtn.addEventListener('click', dismissInstallBanner);
    bannerContent.appendChild(dismissBtn);
  }
}

// Event listeners
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

window.addEventListener('load', () => {
  showInstallBanner();
  addDismissButton();
});