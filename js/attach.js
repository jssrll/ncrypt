// ============================================================
//  ATTACH MENU & MEDIA SENDING (with Drive upload)
// ============================================================

const DRIVE_FOLDER_ID = '1l8SlFbyW8XN02npD2TJJvNCkseCCovjW';

// Voice recording state
let mediaRecorder = null;
let audioChunks = [];
let voiceTimerInterval = null;
let voiceSeconds = 0;
let recordedBlob = null;
let isRecording = false;

// ── File content format helpers ────────────────────────────────
// Encodes type metadata into the message content string so the
// backend stores it, and recipients can decode it on load.
function buildFileContent(type, name, url) {
  return JSON.stringify({ _ncrypt_type: type, _ncrypt_name: name, _ncrypt_url: url });
}

// Extracts the Google Drive file ID from any Drive URL format
function getDriveFileId(url) {
  if (!url) return null;
  // https://drive.google.com/file/d/FILE_ID/view
  let m = url.match(/\/file\/d\/([^/?#]+)/);
  if (m) return m[1];
  // https://drive.google.com/open?id=FILE_ID  or  ?id=FILE_ID
  m = url.match(/[?&]id=([^&]+)/);
  if (m) return m[1];
  // https://lh3.googleusercontent.com/d/FILE_ID
  m = url.match(/\/d\/([^/?#]+)/);
  if (m) return m[1];
  return null;
}

// Converts any Drive URL to one that browsers can actually load
function getDriveDisplayUrl(driveUrl, type) {
  const fileId = getDriveFileId(driveUrl);
  if (!fileId) return driveUrl; // not a Drive URL, use as-is

  if (type === 'image') {
    // lh3.googleusercontent.com/d/ works in <img> without CORS issues
    return `https://lh3.googleusercontent.com/d/${fileId}`;
  }
  if (type === 'video' || type === 'audio') {
    // Drive uc?export=download works for media src attributes
    return `https://drive.google.com/uc?export=download&id=${fileId}`;
  }
  // Generic file: direct download
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

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

// ── File Upload with Drive ─────────────────────────────────────
async function handleFileUpload(event, type) {
  const file = event.target.files[0];
  event.target.value = '';

  if (!file || !activeConversation) return;

  const sizeMB = (file.size / 1024 / 1024).toFixed(1);
  if (file.size > 25 * 1024 * 1024) {
    toast(`File too large (${sizeMB}MB). Max 25MB.`, 'error');
    return;
  }

  // Create optimistic message while uploading
  const tempId = 'temp_' + Date.now();
  const tempMessage = {
    id: tempId,
    conversationId: activeConversation.conversationId,
    senderId: currentUser.id,
    content: 'Uploading...',
    type: type,
    fileName: file.name,
    timestamp: new Date().toISOString(),
    pending: true
  };

  const messages = messagesCache.get(activeConversation.conversationId) || [];
  messages.push(tempMessage);
  messagesCache.set(activeConversation.conversationId, messages);
  renderMessages(activeConversation.conversationId);

  const previewLabel = type === 'image' ? '📷 Image' : type === 'video' ? '🎬 Video' : `📎 ${file.name}`;
  updateConversationLastMessage(activeConversation.conversationId, previewLabel);
  scrollToBottom();

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);

    // Upload to Google Drive via API
    const result = await uploadFile(file.name, file.type || 'application/octet-stream', base64);

    if (result.success && result.fileUrl) {
      // Convert the Drive URL to a browser-renderable display URL
      const displayUrl = getDriveDisplayUrl(result.fileUrl, type);

      // Build structured content: encodes the type + name + original Drive URL
      // so the recipient can decode it when they load messages
      const fileContent = buildFileContent(type, file.name, result.fileUrl);

      // Update optimistic message in the local cache for immediate display
      const msgs = messagesCache.get(activeConversation.conversationId) || [];
      const index = msgs.findIndex(m => m.id === tempId);
      if (index !== -1) {
        msgs[index] = {
          ...msgs[index],
          content: fileContent,
          _fileUrl: displayUrl,   // pre-resolved for sender's immediate render
          fileName: file.name,
          type: type,
          pending: false
        };
        messagesCache.set(activeConversation.conversationId, msgs);
        renderMessages(activeConversation.conversationId);
      }

      // Persist the structured content to the backend
      await sendMessage(activeConversation.conversationId, fileContent);
      toast('File sent!', 'success');
    } else {
      markMessageFailed(tempId);
      toast('Upload failed: ' + (result.message || 'Unknown error'), 'error');
    }
  } catch (err) {
    console.error('Upload error:', err);
    markMessageFailed(tempId);
    toast('Upload failed. Check connection.', 'error');
  }
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function markMessageFailed(tempId) {
  if (!activeConversation) return;
  const messages = messagesCache.get(activeConversation.conversationId) || [];
  const index = messages.findIndex(m => m.id === tempId);
  if (index !== -1) {
    messages[index].pending = false;
    messages[index].failed = true;
    messages[index].content = 'Failed to send';
    renderMessages(activeConversation.conversationId);
  }
}

// ── Voice Recording ─────────────────────────────────────────────
function openVoiceModal() {
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
    recordBtn.style.color = '';
    recordBtn.disabled = false;
    sendBtn.disabled = true;
  } else if (state === 'recording') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:#DC2626;animation:logoPulse 1s infinite;">mic</span>';
    status.textContent = 'Recording...';
    recordBtn.innerHTML = '<span class="material-icons-round">stop</span> Stop';
    recordBtn.style.background = '#DC2626';
    recordBtn.style.color = '#fff';
    recordBtn.disabled = false;
    sendBtn.disabled = true;
  } else if (state === 'done') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:#16A34A;">check_circle</span>';
    status.textContent = 'Ready to send';
    recordBtn.innerHTML = '<span class="material-icons-round">restart_alt</span> Re-record';
    recordBtn.style.background = '';
    recordBtn.style.color = '';
    recordBtn.disabled = false;
    sendBtn.disabled = false;
  } else if (state === 'uploading') {
    indicator.innerHTML = '<span class="material-icons-round" style="font-size:48px;color:var(--accent);">cloud_upload</span>';
    status.textContent = 'Uploading...';
    recordBtn.disabled = true;
    sendBtn.disabled = true;
  }
}

async function toggleVoiceRecording() {
  if (isRecording) {
    stopVoiceRecording();
  } else {
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

// ── FIXED: Voice now uploads to Drive, no more blob URLs ─────
async function sendVoiceMessage() {
  if (!recordedBlob || !activeConversation) return;

  const m = Math.floor(voiceSeconds / 60);
  const s = String(voiceSeconds % 60).padStart(2, '0');
  const voiceName = `Voice ${m}:${s}`;
  const fileName = `voice_${Date.now()}.webm`;

  // Show uploading state in the modal
  updateVoiceUI('uploading');

  try {
    // Convert blob to base64 (same helper used for file uploads)
    const base64 = await fileToBase64(recordedBlob);

    // Upload to Google Drive
    const result = await uploadFile(fileName, 'audio/webm', base64);

    if (result.success && result.fileUrl) {
      const displayUrl = getDriveDisplayUrl(result.fileUrl, 'audio');
      const fileContent = buildFileContent('audio', voiceName, result.fileUrl);

      // Add to local cache immediately with the resolved display URL
      const tempId = 'temp_voice_' + Date.now();
      const msgs = messagesCache.get(activeConversation.conversationId) || [];
      msgs.push({
        id: tempId,
        conversationId: activeConversation.conversationId,
        senderId: currentUser.id,
        content: fileContent,
        _fileUrl: displayUrl,
        type: 'audio',
        fileName: voiceName,
        timestamp: new Date().toISOString(),
        pending: true
      });
      messagesCache.set(activeConversation.conversationId, msgs);
      renderMessages(activeConversation.conversationId);
      updateConversationLastMessage(activeConversation.conversationId, '🎤 Voice message');
      scrollToBottom();

      // Persist to backend
      const sendResult = await sendMessage(activeConversation.conversationId, fileContent);
      const latestMsgs = messagesCache.get(activeConversation.conversationId) || [];
      const idx = latestMsgs.findIndex(mm => mm.id === tempId);
      if (idx !== -1) {
        latestMsgs[idx].pending = false;
        if (!sendResult.success) latestMsgs[idx].failed = true;
        renderMessages(activeConversation.conversationId);
      }

      closeModal('voice-modal');
      toast('Voice message sent!', 'success');
    } else {
      updateVoiceUI('done');
      toast('Upload failed: ' + (result.message || 'Try again'), 'error');
    }
  } catch (err) {
    console.error('Voice upload error:', err);
    updateVoiceUI('done');
    toast('Failed to send voice message. Check connection.', 'error');
  }
}

// Init on load
document.addEventListener('DOMContentLoaded', initAttach);