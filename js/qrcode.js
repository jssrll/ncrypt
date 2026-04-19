// ============================================================
//  QR CODE - FIXED: encodes name+id+email, scanner reads it
// ============================================================

let qrScanner = null;
let qrStream = null;

// QR data format: JSON with id, name, email
function buildQRData(user) {
  return JSON.stringify({
    app: 'ncrypt',
    id: user.id,
    name: user.name,
    email: user.email
  });
}

function parseQRData(raw) {
  try {
    const data = JSON.parse(raw.trim());
    if (data.app === 'ncrypt' && data.id) return data;
  } catch (_) {}
  // Fallback: plain user ID (legacy)
  const trimmed = raw.trim();
  if (trimmed && !trimmed.includes(' ')) return { id: trimmed };
  return null;
}

// Generate QR Code
function generateUserQRCode() {
  if (!currentUser) { 
    toast('Not logged in', 'error'); 
    return; 
  }

  const container = document.getElementById('qr-container');
  if (!container) return;

  container.innerHTML = '<div style="padding:32px;text-align:center;color:var(--text-muted);">Generating QR...</div>';

  const qrData = buildQRData(currentUser);

  setTimeout(() => {
    container.innerHTML = '';
    const canvas = document.createElement('canvas');
    canvas.id = 'qr-canvas';
    canvas.style.width = '220px';
    canvas.style.height = '220px';
    container.appendChild(canvas);

    QRCode.toCanvas(canvas, qrData, {
      width: 220,
      margin: 2,
      color: { dark: '#1A1A1E', light: '#FFFFFF' }
    }, err => {
      if (err) {
        console.error('QR error:', err);
        container.innerHTML = `
          <div style="padding:20px;text-align:center;">
            <p style="color:var(--text-muted);margin-bottom:8px;font-size:13px;">Your ID (scan this):</p>
            <p style="font-family:monospace;font-size:11px;word-break:break-all;background:var(--bg-sidebar);padding:12px;border-radius:8px;">${currentUser.id}</p>
          </div>`;
      }
    });
  }, 100);
}

// Download QR
function downloadQRCode() {
  const canvas = document.getElementById('qr-canvas');
  if (!canvas) { 
    toast('Generate QR first', 'error'); 
    return; 
  }
  try {
    const link = document.createElement('a');
    link.download = `ncrypt-${currentUser.name.replace(/\s+/g, '-')}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
    toast('QR code downloaded!', 'success');
  } catch (err) {
    toast('Download failed', 'error');
  }
}

// Start Scanner
async function startQRScanner() {
  const video = document.getElementById('qr-video');
  if (!video) return;
  
  try {
    qrStream = await navigator.mediaDevices.getUserMedia({
      video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 } }
    });
    video.srcObject = qrStream;
    await video.play();
    scanQRCode();
  } catch (err) {
    console.error('Camera error:', err);
    toast('Camera access denied', 'error');
    closeModal('scanner-modal');
  }
}

// Scan loop
function scanQRCode() {
  const video = document.getElementById('qr-video');
  if (!video || video.readyState !== video.HAVE_ENOUGH_DATA) {
    qrScanner = requestAnimationFrame(scanQRCode);
    return;
  }

  const size = Math.min(video.videoWidth, video.videoHeight, 400);
  const canvas = document.createElement('canvas');
  canvas.width = size; 
  canvas.height = size;
  const ctx = canvas.getContext('2d');
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

// Handle scanned QR data
async function handleQRCodeData(raw) {
  stopQRScanner();
  closeModal('scanner-modal');
  closeModal('profile-modal');

  console.log('QR Data found:', raw);
  
  const parsed = parseQRData(raw);
  if (!parsed) { 
    toast('Invalid QR code - not a ncrypt user QR', 'error'); 
    return; 
  }

  if (parsed.id === currentUser.id) { 
    toast('That\'s your own QR code!', 'info'); 
    return; 
  }

  toast(`Found: ${parsed.name || parsed.id}`, 'success');

  const result = await getOrCreateConversation(parsed.id);
  if (result.success && result.conversation) {
    if (!conversations.find(c => c.conversationId === result.conversation.conversationId)) {
      conversations.unshift(result.conversation);
    }
    openConversation(result.conversation);
    renderConversationsList();
  } else {
    toast('User not found or unable to start chat', 'error');
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

// File Upload - Read QR from image
function handleQRFileUpload(file) {
  if (!file) return;
  
  const reader = new FileReader();
  reader.onload = e => {
    const img = new Image();
    img.onload = () => {
      const size = Math.min(img.width, img.height, 600);
      const canvas = document.createElement('canvas');
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
          toast('No QR code found in image', 'error');
        }
      } else {
        toast('QR library not loaded', 'error');
      }
    };
    img.onerror = () => toast('Failed to load image', 'error');
    img.src = e.target.result;
  };
  reader.onerror = () => toast('Failed to read file', 'error');
  reader.readAsDataURL(file);
}