// ============================================================
// CONVO MESSENGER - CONFIGURATION
// ============================================================

const CONFIG = {
  // Default Apps Script URL (user will set their own)
  DEFAULT_SCRIPT_URL: 'https://script.google.com/macros/s/AKfycbwoV8BYzT8SGD469HD32bxY0r5YqTnBKdlRkXk2LsFc4yemBcdg5kVqc9MVNMhFkOr6/exec',
  
  // Polling interval (5 seconds)
  POLL_INTERVAL: 5000,
  
  // App info
  APP_NAME: 'Convo',
  APP_VERSION: '1.0.0'
};

// Storage keys
const STORAGE_KEYS = {
  SCRIPT_URL: 'convo_script_url',
  USER: 'convo_user'
};

// Apps Script code to show users
const APPS_SCRIPT_CODE = `// ===================================================
// CONVO MESSENGER — Google Apps Script Backend
// Paste this in Extensions > Apps Script
// Then Deploy > New deployment > Web App
// Set "Execute as": Me, "Access": Anyone
// ===================================================

const SHEET_ID = SpreadsheetApp.getActiveSpreadsheet().getId();
const ss       = SpreadsheetApp.getActiveSpreadsheet();

// Ensure required sheets exist
function initSheets() {
  ['Users', 'Messages'].forEach(name => {
    if (!ss.getSheetByName(name)) ss.insertSheet(name);
  });
}

// Unified GET/POST handler
function doGet(e)  { return handle(e); }
function doPost(e) { return handle(e); }

function handle(e) {
  initSheets();
  const p = e.parameter || {};
  let result;
  try {
    switch (p.action) {
      case 'register':     result = registerUser(p);       break;
      case 'login':        result = loginUser(p);          break;
      case 'searchUser':   result = searchUser(p.userId);  break;
      case 'sendMessage':  result = sendMsg(p);            break;
      case 'getMessages':  result = getMsgs(p);            break;
      case 'getConvs':     result = getConvs(p.userId);    break;
      default: result = { ok: false, error: 'Unknown action' };
    }
  } catch(err) {
    result = { ok: false, error: err.toString() };
  }
  return ContentService
    .createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ---- Register ----
function registerUser(p) {
  const sheet = ss.getSheetByName('Users');
  const data  = sheet.getDataRange().getValues();
  // Check duplicate email
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === p.email)
      return { ok: false, error: 'Email already registered.' };
  }
  sheet.appendRow([p.userId, p.name, p.email, p.password,
                   new Date().toISOString()]);
  return { ok: true, userId: p.userId, name: p.name, email: p.email };
}

// ---- Login ----
function loginUser(p) {
  const data = ss.getSheetByName('Users').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][2] === p.email && data[i][3] === p.password) {
      return { ok: true, userId: data[i][0], name: data[i][1],
               email: data[i][2] };
    }
  }
  return { ok: false, error: 'Invalid email or password.' };
}

// ---- Search user by ID ----
function searchUser(userId) {
  const data = ss.getSheetByName('Users').getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(userId)) {
      return { ok: true, userId: data[i][0], name: data[i][1] };
    }
  }
  return { ok: false, error: 'User not found.' };
}

// ---- Send message ----
function sendMsg(p) {
  const msgId = Utilities.getUuid();
  ss.getSheetByName('Messages')
    .appendRow([msgId, p.fromId, p.toId, p.content,
                new Date().toISOString()]);
  return { ok: true, msgId };
}

// ---- Get messages between two users ----
function getMsgs(p) {
  const data = ss.getSheetByName('Messages').getDataRange().getValues();
  const msgs = [];
  for (let i = 1; i < data.length; i++) {
    const from = String(data[i][1]), to = String(data[i][2]);
    const a    = String(p.userId1), b = String(p.userId2);
    if ((from === a && to === b) || (from === b && to === a)) {
      msgs.push({ msgId: data[i][0], fromId: from, toId: to,
                  content: data[i][3], timestamp: data[i][4] });
    }
  }
  return { ok: true, messages: msgs };
}

// ---- Get all conversations for a user ----
function getConvs(userId) {
  const users  = ss.getSheetByName('Users').getDataRange().getValues();
  const msgs   = ss.getSheetByName('Messages').getDataRange().getValues();
  const uid    = String(userId);
  const convMap = {};

  for (let i = 1; i < msgs.length; i++) {
    const from = String(msgs[i][1]), to = String(msgs[i][2]);
    if (from !== uid && to !== uid) continue;
    const other = from === uid ? to : from;
    if (!convMap[other] || msgs[i][4] > convMap[other].timestamp) {
      convMap[other] = { otherId: other, content: msgs[i][3],
                         timestamp: msgs[i][4] };
    }
  }

  // Attach names
  const userMap = {};
  for (let i = 1; i < users.length; i++)
    userMap[String(users[i][0])] = users[i][1];

  const convs = Object.values(convMap).map(c => ({
    ...c, otherName: userMap[c.otherId] || 'Unknown'
  }));
  convs.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
  return { ok: true, conversations: convs };
}`;

console.log('✅ Convo Config Loaded');