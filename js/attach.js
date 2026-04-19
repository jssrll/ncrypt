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

  // Create optimistic message
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

  // Add to cache and render
  const messages = messagesCache.get(activeConversation.conversationId) || [];
  messages.push(tempMessage);
  messagesCache.set(activeConversation.conversationId, messages);
  renderMessages(activeConversation.conversationId);
  updateConversationLastMessage(activeConversation.conversationId, `📎 ${file.name}`);
  scrollToBottom();

  try {
    // Convert file to base64
    const base64 = await fileToBase64(file);
    
    // Upload via API
    const result = await uploadFile(file.name, file.type || 'application/octet-stream', base64);
    
    if (result.success && result.fileUrl) {
      // Replace optimistic message with real one
      const messages = messagesCache.get(activeConversation.conversationId) || [];
      const index = messages.findIndex(m => m.id === tempId);
      if (index !== -1) {
        messages[index] = {
          ...messages[index],
          content: result.fileUrl,
          fileId: result.fileId,
          pending: false
        };
        messagesCache.set(activeConversation.conversationId, messages);
        renderMessages(activeConversation.conversationId);
      }
      
      // Also send the file URL as a regular message to persist it
      await sendMessage(activeConversation.conversationId, result.fileUrl);
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
  const messages = messagesCache.get(activeConversation.conversationId) || [];
  const index = messages.findIndex(m => m.id === tempId);
  if (index !== -1) {
    messages[index].pending = false;
    messages[index].failed = true;
    messages[index].content = 'Failed to send';
    renderMessages(activeConversation.conversationId);
  }
}

// ── Voice Recording (unchanged) ─────────────────────────────────
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