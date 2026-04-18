// ========================================
// NCRYPT - CONFIGURATION
// ========================================

const CONFIG = {
  // Google Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbwF_tpQACqbQuXrlKQvRHlN0xVmS13b0X0v_dUaaQ1seaQHg9Kf_gvnLIXVo204ZQKQ/exec',
  
  // Auto-refresh interval (30 seconds)
  REFRESH_INTERVAL: 30000,
  
  // App info
  APP_NAME: 'ncrypt',
  APP_VERSION: '1.0.0'
};

// Storage keys
const STORAGE_KEYS = {
  SESSION: 'ncrypt_session',
  USER: 'ncrypt_user',
  CURRENT_CONVERSATION: 'ncrypt_current_conv'
};

console.log('✅ ncrypt Config Loaded');