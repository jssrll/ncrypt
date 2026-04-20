// ============================================================
//  PWA INSTALL PROMPT HANDLER
// ============================================================

let deferredPrompt = null;
const installBanner = document.getElementById('install-banner');
const installBtn = document.getElementById('install-btn');
const installClose = document.getElementById('install-close');

// Check if app is already installed
function isAppInstalled() {
  return window.matchMedia('(display-mode: standalone)').matches ||
         window.navigator.standalone === true; // iOS Safari
}

// Show the install banner
function showInstallBanner() {
  if (installBanner && !isAppInstalled()) {
    installBanner.classList.remove('hidden');
  }
}

// Hide the install banner
function hideInstallBanner() {
  if (installBanner) {
    installBanner.classList.add('hidden');
  }
}

// Listen for beforeinstallprompt event
window.addEventListener('beforeinstallprompt', (e) => {
  // Prevent the default mini-infobar from appearing
  e.preventDefault();
  // Store the event for later use
  deferredPrompt = e;
  // Show our custom install banner
  showInstallBanner();
});

// Handle install button click
if (installBtn) {
  installBtn.addEventListener('click', async () => {
    if (!deferredPrompt) {
      // Fallback: show instructions for manual install
      toast('To install: tap "Share" → "Add to Home Screen"', 'info');
      hideInstallBanner();
      return;
    }

    // Show the install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    // Clear the deferredPrompt variable
    deferredPrompt = null;
    
    // Hide the banner regardless of outcome
    hideInstallBanner();
    
    if (outcome === 'accepted') {
      toast('Installing ncrypt...', 'success');
    } else {
      toast('Installation cancelled', 'info');
    }
  });
}

// Handle close button
if (installClose) {
  installClose.addEventListener('click', () => {
    hideInstallBanner();
    // Optionally remember that user dismissed it (localStorage)
  });
}

// Check if app was successfully installed
window.addEventListener('appinstalled', () => {
  hideInstallBanner();
  deferredPrompt = null;
  toast('ncrypt installed successfully! 🎉', 'success');
});

// Show banner on page load if installable (some browsers don't fire beforeinstallprompt immediately)
window.addEventListener('load', () => {
  // If we already have a deferredPrompt, show the banner
  if (deferredPrompt && !isAppInstalled()) {
    showInstallBanner();
  }
});

// For iOS Safari users (no beforeinstallprompt), optionally show a help banner
function showIOSInstallHelp() {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  const isStandalone = window.navigator.standalone;
  
  if (isIOS && !isStandalone) {
    // You could show a different banner with instructions
    // For now, we'll just log, but you can customize
    console.log('iOS user can install via Share menu');
    // Optionally show a one-time tooltip
  }
}

showIOSInstallHelp();