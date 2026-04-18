// ========================================
// NCRYPT - CONFIGURATION
// ========================================

const CONFIG = {
  // Google Apps Script Web App URL
  API_URL: 'https://script.google.com/macros/s/AKfycbwJhxk_NYPRtMPPer2-8YQn7CN-wy-7cp-pMZwBmN1eZW_9Mnq32J9KPBSYDwEux3Is/exec',
  
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