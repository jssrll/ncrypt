// ============================================================
//  QR CODE FUNCTIONALITY - FIXED & OPTIMIZED
// ============================================================

let qrScanner = null;
let qrStream = null;
let currentQRCanvas = null;

// Generate QR Code for current user
function generateUserQRCode() {
  if (!currentUser) {
    toast('User not logged in', 'error');
    return;
  }
  
  const container = document.getElementById('qr-container');
  if (!container) {
    console.error('QR container not found');
    return;
  }
  
  // Clear previous QR code
  container.innerHTML = '';
  
  // Create simple data string (more compatible)
  const qrData = `${currentUser.id}|${currentUser.name}|${currentUser.email}`;
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'qr-canvas';
  canvas.style.width = '200px';
  canvas.style.height = '200px';
  container.appendChild(canvas);
  
  // Generate QR code with simpler options
  try {
    QRCode.toCanvas(canvas, qrData, {
      width: 200,
      margin: 1,
      color: {
        dark: '#000000',
        light: '#FFFFFF'
      }
    }, (error) => {
      if (error) {
        console.error('QR generation error:', error);
        // Fallback: create div with text
        container.innerHTML = `
          <div style="padding: 20px; text-align: center;">
            <p style="color: var(--text-muted); margin-bottom: 10px;">QR Code:</p>
            <p style="font-family: monospace; font-size: 12px; word-break: break-all; background: var(--bg-sidebar); padding: 10px; border-radius: var(--r-md);">
              ${currentUser.id}
            </p>
          </div>
        `;
        toast('QR code library error', 'error');
      } else {
        currentQRCanvas = canvas;
      }
    });
  } catch (err) {
    console.error('QR generation error:', err);
    container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Failed to generate QR code</p>';
  }
}

// Download QR Code as image
function downloadQRCode() {
  const canvas = document.getElementById('qr-canvas');
  
  if (!canvas) {
    toast('No QR code generated', 'error');
    return;
  }
  
  try {
    const link = document.createElement('a');
    link.download = `ncrypt-${currentUser.id.slice(0, 8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('QR Code downloaded', 'success');
  } catch (err) {
    console.error('Download error:', err);
    toast('Failed to download QR code', 'error');
  }
}

// Start QR Scanner
async function startQRScanner() {
  const video = document.getElementById('qr-video');
  
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { 
        facingMode: 'environment',
        width: { ideal: 640 },
        height: { ideal: 480 }
      }
    });
    
    video.srcObject = qrStream;
    await video.play();
    
    // Start scanning
    scanQRCode();
  } catch (err) {
    console.error('Camera error:', err);
    toast('Cannot access camera', 'error');
    closeModal('scanner-modal');
  }
}

// Scan QR Code from video stream
function scanQRCode() {
  const video = document.getElementById('qr-video');
  
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    qrScanner = requestAnimationFrame(scanQRCode);
    return;
  }
  
  // Create small canvas for better performance
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  // Use smaller dimensions for faster processing
  const size = Math.min(video.videoWidth, video.videoHeight, 400);
  canvas.width = size;
  canvas.height = size;
  
  // Draw centered crop
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  context.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  
  // Get image data
  const imageData = context.getImageData(0, 0, size, size);
  
  // Try to decode QR code
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imageData.data, size, size);
    
    if (code && code.data) {
      handleQRCodeData(code.data);
      return;
    }
  }
  
  qrScanner = requestAnimationFrame(scanQRCode);
}

// Handle scanned/uploaded QR code data
async function handleQRCodeData(data) {
  stopQRScanner();
  closeModal('scanner-modal');
  closeModal('profile-modal');
  
  try {
    let userId, userName;
    
    // Try JSON format first
    try {
      const qrData = JSON.parse(data);
      if (qrData.type === 'ncrypt_user' && qrData.id) {
        userId = qrData.id;
        userName = qrData.name;
      }
    } catch {
      // Try pipe-separated format
      const parts = data.split('|');
      if (parts.length >= 2) {
        userId = parts[0];
        userName = parts[1];
      } else {
        // Assume it's just the user ID
        userId = data;
      }
    }
    
    if (!userId) {
      toast('Invalid QR code', 'error');
      return;
    }
    
    if (userId === currentUser.id) {
      toast('This is your own QR code', 'info');
      return;
    }
    
    if (userName) {
      toast(`Found: ${userName}`, 'success');
    }
    
    // Start conversation
    const result = await getOrCreateConversation(userId);
    
    if (result.success && result.conversation) {
      const existingConv = conversations.find(c => c.conversationId === result.conversation.conversationId);
      if (!existingConv) {
        conversations.unshift(result.conversation);
      }
      openConversation(result.conversation);
      renderConversationsList();
    } else {
      toast('Failed to start chat', 'error');
    }
  } catch (err) {
    console.error('QR parse error:', err);
    toast('Invalid QR code', 'error');
  }
}

// Stop QR Scanner
function stopQRScanner() {
  if (qrScanner) {
    cancelAnimationFrame(qrScanner);
    qrScanner = null;
  }
  
  if (qrStream) {
    qrStream.getTracks().forEach(track => track.stop());
    qrStream = null;
  }
}

// Handle QR code file upload
function handleQRFileUpload(file) {
  if (!file) return;
  
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const size = Math.min(img.width, img.height, 400);
      canvas.width = size;
      canvas.height = size;
      
      const ctx = canvas.getContext('2d');
      const sx = (img.width - size) / 2;
      const sy = (img.height - size) / 2;
      ctx.drawImage(img, sx, sy, size, size, 0, 0, size, size);
      
      const imageData = ctx.getImageData(0, 0, size, size);
      
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, size, size);
        
        if (code && code.data) {
          handleQRCodeData(code.data);
        } else {
          toast('No QR code found', 'error');
        }
      } else {
        toast('QR scanner not ready', 'error');
      }
    };
    img.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}