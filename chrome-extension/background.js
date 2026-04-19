/* DuoWatch Netflix Sync - Background Service Worker */

let ws = null;
let isConnected = false;
let reconnectTimer = null;

/* --- WebSocket Connection --- */
async function connectWebSocket() {
  const data = await chrome.storage.local.get(['token', 'serverUrl']);
  if (!data.token || !data.serverUrl) return;

  if (ws) {
    ws.close();
    ws = null;
  }

  const wsUrl = data.serverUrl.replace(/^http/, 'ws') + '/api/ws?token=' + data.token;

  try {
    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isConnected = true;
      broadcastToAll({ type: 'connection_status', connected: true });
      if (reconnectTimer) { clearTimeout(reconnectTimer); reconnectTimer = null; }
    };

    ws.onclose = () => {
      isConnected = false;
      ws = null;
      broadcastToAll({ type: 'connection_status', connected: false });
      reconnectTimer = setTimeout(connectWebSocket, 5000);
    };

    ws.onerror = () => {
      // onclose will fire after this
    };

    ws.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        handleIncomingMessage(msg);
      } catch { /* ignore */ }
    };
  } catch (err) {
    console.error('DuoWatch WS error:', err);
    reconnectTimer = setTimeout(connectWebSocket, 5000);
  }
}

function handleIncomingMessage(msg) {
  // Forward sync signals to Netflix content script
  if (msg.type === 'sync_play' || msg.type === 'sync_pause' || msg.type === 'sync_seek') {
    forwardToNetflix({
      type: 'sync_command',
      action: msg.type.replace('sync_', ''),
      currentTime: msg.currentTime || 0
    });
  }

  // Forward partner status
  if (msg.type === 'partner_online' || msg.type === 'partner_offline') {
    forwardToNetflix(msg);
    broadcastToAll(msg);
  }
}

function forwardToNetflix(msg) {
  chrome.tabs.query({ url: 'https://www.netflix.com/*' }, (tabs) => {
    tabs.forEach(tab => {
      chrome.tabs.sendMessage(tab.id, msg).catch(() => {});
    });
  });
}

function broadcastToAll(msg) {
  chrome.runtime.sendMessage(msg).catch(() => {});
}

function sendToPartner(data) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(data));
  }
}

/* --- Message Handler from Content Script & Popup --- */
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'netflix_event') {
    // Forward Netflix playback event to partner
    sendToPartner({
      type: `sync_${msg.action}`,
      currentTime: msg.currentTime
    });

  } else if (msg.type === 'login') {
    handleLogin(msg.serverUrl, msg.email, msg.password).then(sendResponse);
    return true; // Async response

  } else if (msg.type === 'logout') {
    handleLogout();
    sendResponse({ success: true });

  } else if (msg.type === 'get_status') {
    sendResponse({ connected: isConnected });

  } else if (msg.type === 'toggle_sync') {
    chrome.storage.local.set({ syncEnabled: msg.enabled });
    forwardToNetflix({ type: 'enable_sync', enabled: msg.enabled });
    sendResponse({ success: true });

  } else if (msg.type === 'reconnect') {
    connectWebSocket();
    sendResponse({ success: true });
  }
});

async function handleLogin(serverUrl, email, password) {
  try {
    const resp = await fetch(`${serverUrl}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await resp.json();
    if (resp.ok && data.token) {
      await chrome.storage.local.set({
        token: data.token,
        serverUrl: serverUrl,
        userName: data.name,
        userEmail: email,
        syncEnabled: true
      });
      connectWebSocket();
      return { success: true, name: data.name };
    }
    return { success: false, error: data.detail || 'Login failed' };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function handleLogout() {
  await chrome.storage.local.remove(['token', 'serverUrl', 'userName', 'userEmail', 'syncEnabled']);
  if (ws) { ws.close(); ws = null; }
  isConnected = false;
  broadcastToAll({ type: 'connection_status', connected: false });
  forwardToNetflix({ type: 'enable_sync', enabled: false });
}

// Auto-connect on startup
connectWebSocket();
