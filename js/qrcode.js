// ============================================================
//  QR CODE FUNCTIONALITY
// ============================================================

let qrScanner = null;
let qrStream = null;

// Generate QR Code for current user
function generateUserQRCode() {
  if (!currentUser) return;
  
  const canvas = document.getElementById('qr-canvas');
  const qrData = JSON.stringify({
    type: 'ncrypt_user',
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email
  });
  
  QRCode.toCanvas(canvas, qrData, {
    width: 250,
    margin: 2,
    color: {
      dark: '#1A1A1E',
      light: '#FFFFFF'
    }
  }, (error) => {
    if (error) {
      console.error('QR generation error:', error);
      toast('Failed to generate QR code', 'error');
    }
  });
}

// Download QR Code as image
function downloadQRCode() {
  const canvas = document.getElementById('qr-canvas');
  const link = document.createElement('a');
  link.download = `ncrypt-qr-${currentUser.id.slice(0, 8)}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  toast('QR Code downloaded', 'success');
}

// Start QR Scanner
async function startQRScanner() {
  const video = document.getElementById('qr-video');
  
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment' }
    });
    
    video.srcObject = qrStream;
    video.play();
    
    // Start scanning
    scanQRCode();
  } catch (err) {
    console.error('Camera error:', err);
    toast('Unable to access camera', 'error');
    closeModal('scanner-modal');
  }
}

// Scan QR Code from video stream
function scanQRCode() {
  const video = document.getElementById('qr-video');
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  const scan = () => {
    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      context.drawImage(video, 0, 0, canvas.width, canvas.height);
      
      const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      
      if (code) {
        handleQRCodeData(code.data);
        return;
      }
    }
    
    qrScanner = requestAnimationFrame(scan);
  };
  
  scan();
}

// Handle scanned/uploaded QR code data
async function handleQRCodeData(data) {
  try {
    const qrData = JSON.parse(data);
    
    if (qrData.type === 'ncrypt_user' && qrData.id) {
      stopQRScanner();
      closeModal('scanner-modal');
      
      // Don't start conversation with self
      if (qrData.id === currentUser.id) {
        toast('This is your own QR code', 'info');
        return;
      }
      
      toast(`Found user: ${qrData.name}`, 'success');
      
      // Start conversation with scanned user
      const result = await getOrCreateConversation(qrData.id);
      
      if (result.success && result.conversation) {
        const existingConv = conversations.find(c => c.conversationId === result.conversation.conversationId);
        if (!existingConv) {
          conversations.unshift(result.conversation);
        }
        openConversation(result.conversation);
        renderConversationsList();
      } else {
        toast('Failed to start conversation', 'error');
      }
    } else {
      toast('Invalid QR code format', 'error');
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
  const reader = new FileReader();
  
  reader.onload = (e) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, canvas.width, canvas.height);
      
      if (code) {
        handleQRCodeData(code.data);
      } else {
        toast('No QR code found in image', 'error');
      }
    };
    img.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}

// Check if jsQR is available (add this script to HTML)
function loadQRScannerLibrary() {
  return new Promise((resolve, reject) => {
    if (typeof jsQR !== 'undefined') {
      resolve();
      return;
    }
    
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/jsqr@1.4.0/dist/jsQR.min.js';
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}