// ========================================
// NCRYPT - CONFIGURATION
// ========================================

const CONFIG = {
  // Google Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbyJRwh2O0-Xs9B0MGQN5RdoF5WX1Sb1xK1P8DF1ScsKb6f6_x7M2rlECCXkA9O0Lak/exec',
  
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