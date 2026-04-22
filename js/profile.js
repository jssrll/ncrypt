// ============================================================
//  PROFILE FUNCTIONALITY - MOOD STATUS + ACCOUNT INFO
// ============================================================

// Mood options
const MOODS = {
  happy: { emoji: '😊', text: 'Happy' },
  sad: { emoji: '😢', text: 'Sad' },
  excited: { emoji: '🤩', text: 'Excited' },
  love: { emoji: '❤️', text: 'In Love' },
  angry: { emoji: '😠', text: 'Angry' },
  tired: { emoji: '😴', text: 'Tired' },
  sick: { emoji: '🤒', text: 'Sick' },
  cool: { emoji: '😎', text: 'Cool' },
  thinking: { emoji: '🤔', text: 'Thinking' },
  party: { emoji: '🥳', text: 'Partying' },
  blessed: { emoji: '🙏', text: 'Blessed' },
  na: { emoji: '😐', text: 'N/A' }
};

function initProfile() {
  const profileBtn = document.getElementById('sidebar-profile');
  if (profileBtn) profileBtn.addEventListener('click', openProfileModal);

  // Copy ID button (inline beside ID)
  const copyIdBtn = document.getElementById('copy-id-btn-inline');
  if (copyIdBtn) {
    copyIdBtn.addEventListener('click', copyUserId);
  }

  // Mood dropdown toggle
  const currentMoodDisplay = document.getElementById('current-mood-display');
  if (currentMoodDisplay) {
    currentMoodDisplay.addEventListener('click', () => {
      document.getElementById('mood-dropdown').classList.toggle('hidden');
    });
  }

  // Mood selection
  document.querySelectorAll('.mood-option').forEach(option => {
    option.addEventListener('click', async () => {
      const mood = option.dataset.mood;
      const emoji = option.dataset.emoji;
      await setUserMood(mood, emoji);
      document.getElementById('mood-dropdown').classList.add('hidden');
      updateMoodDisplay();
    });
  });

  // Check and reset mood at midnight
  checkMoodReset();
  setInterval(checkMoodReset, 60000); // Check every minute
}

function openProfileModal() {
  if (!currentUser) return;
  
  document.getElementById('profile-avatar').textContent = getInitials(currentUser.name);
  document.getElementById('profile-name').textContent = currentUser.name || '—';
  document.getElementById('profile-email').textContent = currentUser.email || '—';
  document.getElementById('profile-id').textContent = currentUser.id || '—';
  
  // Account information
  document.getElementById('profile-created').textContent = formatDate(currentUser.createdAt);
  document.getElementById('profile-last-login').textContent = formatDate(currentUser.lastLogin);
  
  // Load stats
  loadUserStats();
  
  // Update mood display
  updateMoodDisplay();
  
  openModal('profile-modal');
}

async function loadUserStats() {
  try {
    const result = await callAPI({
      action: 'getUserStats',
      userId: currentUser.id
    });
    if (result.success) {
      document.getElementById('profile-total-messages').textContent = result.totalMessages || 0;
      document.getElementById('profile-total-conversations').textContent = result.totalConversations || 0;
    }
  } catch (err) {
    console.error('Failed to load stats:', err);
  }
}

function updateMoodDisplay() {
  const savedMood = localStorage.getItem(`ncrypt_mood_${currentUser?.id}`);
  let moodData;
  
  if (savedMood) {
    try {
      const parsed = JSON.parse(savedMood);
      const today = new Date().toDateString();
      if (parsed.date === today) {
        moodData = parsed;
      } else {
        // Expired, reset to N/A
        moodData = { mood: 'na', emoji: '😐', date: today };
        localStorage.setItem(`ncrypt_mood_${currentUser?.id}`, JSON.stringify(moodData));
      }
    } catch (e) {
      moodData = { mood: 'na', emoji: '😐', date: new Date().toDateString() };
    }
  } else {
    moodData = { mood: 'na', emoji: '😐', date: new Date().toDateString() };
    localStorage.setItem(`ncrypt_mood_${currentUser?.id}`, JSON.stringify(moodData));
  }
  
  document.getElementById('current-mood-emoji').textContent = moodData.emoji;
  document.getElementById('current-mood-text').textContent = MOODS[moodData.mood]?.text || 'N/A';
}

async function setUserMood(mood, emoji) {
  const moodData = {
    mood,
    emoji,
    date: new Date().toDateString()
  };
  localStorage.setItem(`ncrypt_mood_${currentUser?.id}`, JSON.stringify(moodData));
  
  // Sync to backend
  try {
    await callAPI({
      action: 'updateUserMood',
      userId: currentUser.id,
      mood,
      emoji
    });
    toast(`Mood set to ${emoji} ${MOODS[mood].text}`, 'success');
  } catch (err) {
    console.error('Failed to sync mood:', err);
  }
}

function checkMoodReset() {
  const savedMood = localStorage.getItem(`ncrypt_mood_${currentUser?.id}`);
  if (savedMood) {
    try {
      const parsed = JSON.parse(savedMood);
      const today = new Date().toDateString();
      if (parsed.date !== today) {
        // Reset to N/A
        const newMood = { mood: 'na', emoji: '😐', date: today };
        localStorage.setItem(`ncrypt_mood_${currentUser?.id}`, JSON.stringify(newMood));
        if (currentUser) {
          callAPI({
            action: 'updateUserMood',
            userId: currentUser.id,
            mood: 'na',
            emoji: '😐'
          });
        }
      }
    } catch (e) {}
  }
}

function copyUserId() {
  if (!currentUser || !currentUser.id) {
    toast('No user ID found', 'error');
    return;
  }
  
  navigator.clipboard.writeText(currentUser.id).then(() => {
    toast('User ID copied to clipboard!', 'success');
  }).catch(() => {
    const textArea = document.createElement('textarea');
    textArea.value = currentUser.id;
    document.body.appendChild(textArea);
    textArea.select();
    document.execCommand('copy');
    document.body.removeChild(textArea);
    toast('User ID copied!', 'success');
  });
}