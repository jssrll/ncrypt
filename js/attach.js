// ============================================================
//  ATTACH MENU & MEDIA SENDING
//  File uploads go to Google Drive folder, link sent as message
// ============================================================

const DRIVE_FOLDER_ID = '1l8SlFbyW8XN02npD2TJJvNCkseCCovjW';

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceSeconds = 0;
let recordedBlob = null;
let isRecording = false;

// ── Attach menu ───────────────────────────────────────────────
function initAttach() {
  const attachBtn = document.getElementById('attach-btn');
  const attachMenu = document.getElementById('attach-menu');
  const overlay = document.getElementById('attach-menu-overlay');

  if (!attachBtn || !attachMenu) return;

  attachBtn.addEventListener('click', e => {
    e.stopPropagation();
    attachMenu.classList.toggle('hidden');
  });

  if (overlay) overlay.addEventListener('click', closeAttachMenu);

  document.addEventListener('click', e => {
    if (!e.target.closest('#attach-btn') && !e.target.closest('.attach-menu-popup')) {
      closeAttachMenu();
    }
  });

  // Option buttons
  document.getElementById('attach-voice')?.addEventListener('click', () => {
    closeAttachMenu();
    openVoiceModal();
  });

  document.getElementById('attach-file')?.addEventListener('click', () => {
    closeAttachMenu();
    document.getElementById('file-input-file').click();
  });

  document.getElementById('attach-image')?.addEventListener('click', () => {
    closeAttachMenu();
    document.getElementById('file-input-image').click();
  });

  document.getElementById('attach-video')?.addEventListener('click', () => {
    closeAttachMenu();
    document.getElementById('file-input-video').click();
  });

  document.getElementById('attach-capture')?.addEventListener('click', () => {
    closeAttachMenu();
    document.getElementById('file-input-capture').click();
  });

  // File input handlers
  document.getElementById('file-input-file')?.addEventListener('change', e => handleFileUpload(e, 'file'));
  document.getElementById('file-input-image')?.addEventListener('change', e => handleFileUpload(e, 'image'));
  document.getElementById('file-input-video')?.addEventListener('change', e => handleFileUpload(e, 'video'));
  document.getElementById('file-input-capture')?.addEventListener('change', e => handleFileUpload(e, 'image'));

  // Voice modal
  document.getElementById('voice-record-btn')?.addEventListener('click', toggleVoiceRecording);
  document.getElementById('voice-send-btn')?.addEventListener('click', sendVoiceMessage);
}

function closeAttachMenu() {
  document.getElementById('attach-menu')?.classList.add('hidden');
}

// ── File Upload via Google Drive API ─────────────────────────
async function handleFileUpload(event, type) {
  const file = event.target.files[0];
  event.target.value = '';
  if (!file || !activeConversation) return;

  // Show size limit (25MB for Drive API without OAuth we can't upload)
  // Since we don't have OAuth token here, we send a link message explaining
  // In a real setup this would use Drive API with service account or picker
  // For now: use a local object URL as preview and inform the user

  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  if (file.size > 25 * 1024 * 1024) {
    toast(`File too large (${sizeMB}MB). Max 25MB.`, 'error');
    return;
  }

  toast('Uploading...', 'info');

  try {
    // Try to upload to Google Drive via the Apps Script backend
    const base64 = await fileToBase64(file);
    const result = await callAPI({
      action: 'uploadFile',
      userId: currentUser.id,
      fileName: file.name,
      mimeType: file.type,
      fileData: base64,
      folderId: DRIVE_FOLDER_ID
    });

    if (result.success && result.fileUrl) {
      // Send file URL as message
      addOptimisticMessage({
        content: result.fileUrl,
        type: type,
        fileName: file.name
      });
      toast('File sent!', 'success');
    } else {
      // Fallback: create object URL for local preview during session
      const objectUrl = URL.createObjectURL(file);
      addOptimisticMessage({
        content: objectUrl,
        type: type,
        fileName: file.name
      });
      toast('Sent (local preview — Drive upload unavailable)', 'info');
    }
  } catch (err) {
    console.error('Upload error:', err);
    // Local fallback
    const objectUrl = URL.createObjectURL(file);
    addOptimisticMessage({
      content: objectUrl,
      type: type,
      fileName: file.name
    });
    toast('Sent (local preview)', 'info');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result.split(',')[1]);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

// ── Voice Recording ───────────────────────────────────────────
function openVoiceModal() {
  // Reset state
  recordedBlob = null;
  isRecording = false;
  voiceSeconds = 0;
  audioChunks = [];
  updateVoiceUI('idle');
  openModal('voice-modal');
}

function updateVoiceUI(state) {
  const indicator = document.getElementById('voice-indicator');
  const timer = document.getElementById('voice-timer');
  const status = document.getElementById('voice-status');
  const recordBtn = document.getElementById('voice-record-btn');
  const sendBtn = document.getElementById('voice-send-btn');

  if (state === 'idle') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:var(--accent);">mic</span>';
    timer.textContent = '0:00';
    status.textContent = 'Tap record to start';
    recordBtn.innerHTML = '<span class="material-icons-round">mic</span> Record';
    recordBtn.style.background = '';
    sendBtn.disabled = true;
  } else if (state === 'recording') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:#DC2626;animation:logoPulse 1s infinite;">mic</span>';
    status.textContent = 'Recording...';
    recordBtn.innerHTML = '<span class="material-icons-round">stop</span> Stop';
    recordBtn.style.background = '#DC2626';
    recordBtn.style.color = '#fff';
    sendBtn.disabled = true;
  } else if (state === 'done') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:#16A34A;">check_circle</span>';
    status.textContent = 'Ready to send';
    recordBtn.innerHTML = '<span class="material-icons-round">restart_alt</span> Re-record';
    recordBtn.style.background = '';
    recordBtn.style.color = '';
    sendBtn.disabled = false;
  }
}

async function toggleVoiceRecording() {
  if (isRecording) {
    // Stop
    stopVoiceRecording();
  } else {
    // Start
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunks = [];
      recordedBlob = null;
      voiceSeconds = 0;

      mediaRecorder = new MediaRecorder(stream);
      mediaRecorder.ondataavailable = e => { if (e.data.size > 0) audioChunks.push(e.data); };
      mediaRecorder.onstop = () => {
        stream.getTracks().forEach(t => t.stop());
        recordedBlob = new Blob(audioChunks, { type: 'audio/webm' });
        updateVoiceUI('done');
      };

      mediaRecorder.start(100);
      isRecording = true;
      updateVoiceUI('recording');

      voiceTimerInterval = setInterval(() => {
        voiceSeconds++;
        const m = Math.floor(voiceSeconds / 60);
        const s = String(voiceSeconds % 60).padStart(2, '0');
        const timer = document.getElementById('voice-timer');
        if (timer) timer.textContent = `${m}:${s}`;

        // Auto-stop at 3 minutes
        if (voiceSeconds >= 180) stopVoiceRecording();
      }, 1000);

    } catch (err) {
      toast('Microphone access denied', 'error');
    }
  }
}

function stopVoiceRecording() {
  if (mediaRecorder && mediaRecorder.state !== 'inactive') {
    mediaRecorder.stop();
  }
  clearInterval(voiceTimerInterval);
  isRecording = false;
}

function sendVoiceMessage() {
  if (!recordedBlob || !activeConversation) return;

  const objectUrl = URL.createObjectURL(recordedBlob);
  const m = Math.floor(voiceSeconds / 60);
  const s = String(voiceSeconds % 60).padStart(2, '0');

  addOptimisticMessage({
    content: objectUrl,
    type: 'audio',
    fileName: `Voice ${m}:${s}`
  });

  closeModal('voice-modal');
  toast('Voice message sent!', 'success');
}

// Init on load
document.addEventListener('DOMContentLoaded', initAttach);
// Also init after messenger is ready (called from messaging.js indirectly)
window.initAttach = initAttach;