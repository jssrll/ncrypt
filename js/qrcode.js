// ============================================================
//  QR CODE FUNCTIONALITY - FIXED
// ============================================================

let qrScanner = null;
let qrStream = null;

// Generate QR Code
function generateUserQRCode() {
  if (!currentUser) {
    toast('Not logged in', 'error');
    return;
  }
  
  const container = document.getElementById('qr-container');
  if (!container) return;
  
  container.innerHTML = '<div style="padding:20px;text-align:center;">Generating...</div>';
  
  // Simple data format
  const qrData = `${currentUser.id}`;
  
  setTimeout(() => {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'qr-canvas';
    canvas.style.width = '200px';
    canvas.style.height = '200px';
    container.appendChild(canvas);
    
    try {
      QRCode.toCanvas(canvas, qrData, {
        width: 200,
        margin: 1,
        color: { dark: '#1A1A1E', light: '#FFFFFF' }
      }, (error) => {
        if (error) {
          console.error('QR error:', error);
          container.innerHTML = `
            <div style="padding:20px;text-align:center;">
              <p style="color:var(--text-muted);margin-bottom:10px;">Your ID:</p>
              <p style="font-family:monospace;font-size:12px;word-break:break-all;background:var(--bg-sidebar);padding:12px;border-radius:8px;">${currentUser.id}</p>
            </div>
          `;
        }
      });
    } catch (err) {
      console.error('QR error:', err);
    }
  }, 100);
}

// Download QR
function downloadQRCode() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas) {
    toast('No QR code', 'error');
    return;
  }
  try {
    const link = document.createElement('a');
    link.download = `ncrypt-${currentUser.id.slice(0,8)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  } catch (err) {
    toast('Download failed', 'error');
  }
}

// Start Scanner
async function startQRScanner() {
  const video = document.getElementById('qr-video');
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: 640, height: 480 }
    });
    video.srcObject = qrStream;
    await video.play();
    scanQRCode();
  } catch (err) {
    toast('Camera access denied', 'error');
    closeModal('scanner-modal');
  }
}

// Scan
function scanQRCode() {
  const video = document.getElementById('qr-video');
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    qrScanner = requestAnimationFrame(scanQRCode);
    return;
  }
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const size = Math.min(video.videoWidth, video.videoHeight, 400);
  canvas.width = size;
  canvas.height = size;
  
  const sx = (video.videoWidth - size) / 2;
  const sy = (video.videoHeight - size) / 2;
  ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
  
  const imageData = ctx.getImageData(0, 0, size, size);
  
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imageData.data, size, size);
    if (code && code.data) {
      handleQRCodeData(code.data);
      return;
    }
  }
  
  qrScanner = requestAnimationFrame(scanQRCode);
}

// Handle QR Data
async function handleQRCodeData(data) {
  stopQRScanner();
  closeModal('scanner-modal');
  closeModal('profile-modal');
  
  const userId = data.trim();
  
  if (userId === currentUser.id) {
    toast('This is your QR code', 'info');
    return;
  }
  
  const result = await getOrCreateConversation(userId);
  if (result.success && result.conversation) {
    if (!conversations.find(c => c.conversationId === result.conversation.conversationId)) {
      conversations.unshift(result.conversation);
    }
    openConversation(result.conversation);
    renderConversationsList();
  } else {
    toast('User not found', 'error');
  }
}

// Stop Scanner
function stopQRScanner() {
  if (qrScanner) {
    cancelAnimationFrame(qrScanner);
    qrScanner = null;
  }
  if (qrStream) {
    qrStream.getTracks().forEach(t => t.stop());
    qrStream = null;
  }
}

// File Upload
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
      }
    };
    img.src = e.target.result;
  };
  reader.readAsDataURL(file);
}