/* DuoWatch Netflix Sync - Popup Script */

const $ = (sel) => document.querySelector(sel);

const loginView = $('#login-view');
const connectedView = $('#connected-view');
const loginBtn = $('#login-btn');
const loginError = $('#login-error');
const serverUrlInput = $('#server-url');
const emailInput = $('#login-email');
const passwordInput = $('#login-password');
const reconnectBtn = $('#reconnect-btn');
const logoutBtn = $('#logout-btn');
const syncToggle = $('#sync-toggle');
const connDot = $('#connection-dot');
const connStatus = $('#conn-status');
const partnerStatus = $('#partner-status');
const userNameDisplay = $('#user-name-display');

/* --- Init --- */
async function init() {
  const data = await chrome.storage.local.get(['token', 'serverUrl', 'userName', 'userEmail', 'syncEnabled']);

  if (data.token && data.serverUrl) {
    showConnectedView(data.userName || 'Connected');
    syncToggle.checked = data.syncEnabled !== false;
    if (data.serverUrl) serverUrlInput.value = data.serverUrl;
    if (data.userEmail) emailInput.value = data.userEmail;

    // Check connection status
    chrome.runtime.sendMessage({ type: 'get_status' }, (resp) => {
      if (resp) updateConnectionUI(resp.connected);
    });
  } else {
    showLoginView();
    // Pre-fill server URL from storage
    if (data.serverUrl) serverUrlInput.value = data.serverUrl;
  }
}

function showLoginView() {
  loginView.style.display = 'block';
  connectedView.style.display = 'none';
}

function showConnectedView(name) {
  loginView.style.display = 'none';
  connectedView.style.display = 'block';
  userNameDisplay.textContent = name || 'Connected';
}

function updateConnectionUI(connected) {
  if (connected) {
    connDot.classList.add('connected');
    connStatus.textContent = 'Connected';
    connStatus.classList.add('connected');
  } else {
    connDot.classList.remove('connected');
    connStatus.textContent = 'Disconnected';
    connStatus.classList.remove('connected');
  }
}

/* --- Login --- */
loginBtn.addEventListener('click', async () => {
  const serverUrl = serverUrlInput.value.trim().replace(/\/$/, '');
  const email = emailInput.value.trim();
  const password = passwordInput.value;

  if (!serverUrl || !email || !password) {
    showError('Please fill in all fields');
    return;
  }

  loginBtn.disabled = true;
  loginBtn.textContent = 'Connecting...';
  loginError.style.display = 'none';

  chrome.runtime.sendMessage(
    { type: 'login', serverUrl, email, password },
    (resp) => {
      loginBtn.disabled = false;
      loginBtn.textContent = 'Connect';

      if (resp && resp.success) {
        showConnectedView(resp.name);
        updateConnectionUI(true);
      } else {
        showError(resp?.error || 'Connection failed');
      }
    }
  );
});

// Enter key on password field
passwordInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

function showError(msg) {
  loginError.textContent = msg;
  loginError.style.display = 'block';
}

/* --- Logout --- */
logoutBtn.addEventListener('click', () => {
  chrome.runtime.sendMessage({ type: 'logout' }, () => {
    showLoginView();
    passwordInput.value = '';
  });
});

/* --- Reconnect --- */
reconnectBtn.addEventListener('click', () => {
  reconnectBtn.textContent = 'Reconnecting...';
  chrome.runtime.sendMessage({ type: 'reconnect' }, () => {
    setTimeout(() => {
      reconnectBtn.textContent = 'Reconnect';
      chrome.runtime.sendMessage({ type: 'get_status' }, (resp) => {
        if (resp) updateConnectionUI(resp.connected);
      });
    }, 2000);
  });
});

/* --- Sync Toggle --- */
syncToggle.addEventListener('change', () => {
  chrome.runtime.sendMessage({ type: 'toggle_sync', enabled: syncToggle.checked });
});

/* --- Listen for status updates from background --- */
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'connection_status') {
    updateConnectionUI(msg.connected);
  } else if (msg.type === 'partner_online') {
    partnerStatus.textContent = 'Online';
    partnerStatus.classList.add('connected');
  } else if (msg.type === 'partner_offline') {
    partnerStatus.textContent = 'Offline';
    partnerStatus.classList.remove('connected');
  }
});

init();
