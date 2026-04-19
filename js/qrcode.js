// ============================================================
//  QR CODE FUNCTIONALITY
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
  
  // Clear previous QR code
  container.innerHTML = '';
  
  // Create canvas element
  const canvas = document.createElement('canvas');
  canvas.id = 'qr-canvas';
  canvas.width = 250;
  canvas.height = 250;
  container.appendChild(canvas);
  
  // Create QR data with user info
  const qrData = JSON.stringify({
    type: 'ncrypt_user',
    id: currentUser.id,
    name: currentUser.name,
    email: currentUser.email,
    timestamp: Date.now()
  });
  
  // Generate QR code
  try {
    QRCode.toCanvas(canvas, qrData, {
      width: 250,
      margin: 2,
      color: {
        dark: '#1A1A1E',
        light: '#FFFFFF'
      },
      errorCorrectionLevel: 'H'
    }, (error) => {
      if (error) {
        console.error('QR generation error:', error);
        toast('Failed to generate QR code', 'error');
        container.innerHTML = '<p style="color: var(--text-muted); padding: 20px;">Failed to generate QR code</p>';
      } else {
        currentQRCanvas = canvas;
        console.log('QR Code generated successfully for user:', currentUser.id);
      }
    });
  } catch (err) {
    console.error('QR generation error:', err);
    toast('Failed to generate QR code', 'error');
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
    link.download = `ncrypt-qr-${currentUser.id.slice(0, 8)}.png`;
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
      video: { facingMode: 'environment' }
    });
    
    video.srcObject = qrStream;
    await video.play();
    
    // Start scanning
    scanQRCode();
  } catch (err) {
    console.error('Camera error:', err);
    toast('Unable to access camera. Please check permissions.', 'error');
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
  
  // Create canvas for frame capture
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  
  // Get image data
  const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
  
  // Try to decode QR code
  if (typeof jsQR !== 'undefined') {
    const code = jsQR(imageData.data, canvas.width, canvas.height, {
      inversionAttempts: 'dontInvert'
    });
    
    if (code) {
      handleQRCodeData(code.data);
      return;
    }
  }
  
  qrScanner = requestAnimationFrame(scanQRCode);
}

// Handle scanned/uploaded QR code data
async function handleQRCodeData(data) {
  console.log('QR Code data received:', data);
  
  try {
    const qrData = JSON.parse(data);
    
    if (qrData.type === 'ncrypt_user' && qrData.id) {
      stopQRScanner();
      closeModal('scanner-modal');
      closeModal('profile-modal');
      
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
        toast(`Started conversation with ${qrData.name}`, 'success');
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
  
  const video = document.getElementById('qr-video');
  if (video) {
    video.srcObject = null;
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
      canvas.width = img.width;
      canvas.height = img.height;
      
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      
      if (typeof jsQR !== 'undefined') {
        const code = jsQR(imageData.data, canvas.width, canvas.height);
        
        if (code) {
          handleQRCodeData(code.data);
        } else {
          toast('No QR code found in image', 'error');
        }
      } else {
        toast('QR scanner not loaded', 'error');
      }
    };
    img.src = e.target.result;
  };
  
  reader.readAsDataURL(file);
}