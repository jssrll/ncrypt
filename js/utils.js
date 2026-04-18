/**
 * API Call wrapper with proper headers and error handling
 */
async function callAPI(action, data = {}) {
  try {
    // Build URL with parameters
    const params = new URLSearchParams({ action, ...data });
    const url = `${CONFIG.API_URL}?${params.toString()}`;
    
    console.log('API Call:', action, data);
    
    // Use no-cors mode for Google Apps Script compatibility
    const response = await fetch(url, {
      method: 'GET',
      mode: 'cors',  // Explicitly request CORS
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const text = await response.text();
    console.log('API Raw Response:', text);
    
    // Parse JSON safely
    let result;
    try {
      result = JSON.parse(text);
    } catch (e) {
      console.error('JSON Parse Error:', e);
      return { success: false, error: 'Invalid server response' };
    }
    
    console.log('API Parsed Result:', result);
    return result;
    
  } catch (error) {
    console.error('API Error:', error);
    return { success: false, error: 'Network error. Please check your connection.' };
  }
}