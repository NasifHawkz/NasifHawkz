/* DuoWatch Netflix Sync - Content Script */

let videoElement = null;
let ignoreEvents = false;
let syncEnabled = false;
let ignoreTimeout = null;

/* --- Video element detection --- */
function findVideo() {
  return document.querySelector('video');
}

function setupVideoListeners(video) {
  if (videoElement === video) return;
  videoElement = video;

  video.addEventListener('play', onPlay);
  video.addEventListener('pause', onPause);
  video.addEventListener('seeked', onSeek);
}

function onPlay() {
  if (!syncEnabled || ignoreEvents) return;
  chrome.runtime.sendMessage({
    type: 'netflix_event',
    action: 'play',
    currentTime: videoElement.currentTime
  });
  updateOverlayStatus('Synced - Playing');
}

function onPause() {
  if (!syncEnabled || ignoreEvents) return;
  chrome.runtime.sendMessage({
    type: 'netflix_event',
    action: 'pause',
    currentTime: videoElement.currentTime
  });
  updateOverlayStatus('Synced - Paused');
}

function onSeek() {
  if (!syncEnabled || ignoreEvents) return;
  chrome.runtime.sendMessage({
    type: 'netflix_event',
    action: 'seek',
    currentTime: videoElement.currentTime
  });
}

/* --- Receive sync commands from background --- */
chrome.runtime.onMessage.addListener((msg) => {
  if (!videoElement) return;

  if (msg.type === 'sync_command') {
    ignoreEvents = true;
    if (ignoreTimeout) clearTimeout(ignoreTimeout);

    const timeDiff = Math.abs(videoElement.currentTime - msg.currentTime);

    if (msg.action === 'play') {
      if (timeDiff > 1) videoElement.currentTime = msg.currentTime;
      videoElement.play().catch(() => {});
      updateOverlayStatus('Partner pressed Play');
    } else if (msg.action === 'pause') {
      if (timeDiff > 1) videoElement.currentTime = msg.currentTime;
      videoElement.pause();
      updateOverlayStatus('Partner pressed Pause');
    } else if (msg.action === 'seek') {
      videoElement.currentTime = msg.currentTime;
      updateOverlayStatus('Partner seeked');
    }

    ignoreTimeout = setTimeout(() => { ignoreEvents = false; }, 800);
  } else if (msg.type === 'enable_sync') {
    syncEnabled = msg.enabled;
    updateOverlayVisibility(msg.enabled);
    if (msg.enabled) {
      updateOverlayStatus('Sync enabled');
    }
  } else if (msg.type === 'connection_status') {
    updateOverlayConnection(msg.connected);
  } else if (msg.type === 'partner_online') {
    updateOverlayStatus('Partner is watching');
  } else if (msg.type === 'partner_offline') {
    updateOverlayStatus('Partner left');
  }
});

/* --- Netflix overlay UI --- */
function createOverlay() {
  if (document.getElementById('duowatch-overlay')) return;

  const overlay = document.createElement('div');
  overlay.id = 'duowatch-overlay';
  overlay.innerHTML = `
    <div id="dw-container">
      <div id="dw-dot"></div>
      <span id="dw-label">DuoWatch</span>
      <span id="dw-status-text">Connecting...</span>
    </div>
  `;
  document.body.appendChild(overlay);
}

function updateOverlayStatus(text) {
  const el = document.getElementById('dw-status-text');
  if (el) el.textContent = text;
}

function updateOverlayConnection(connected) {
  const dot = document.getElementById('dw-dot');
  if (dot) dot.style.background = connected ? '#10B981' : '#EF4444';
}

function updateOverlayVisibility(show) {
  const container = document.getElementById('dw-container');
  if (container) container.style.display = show ? 'flex' : 'none';
}

/* --- Observe DOM for video element --- */
const observer = new MutationObserver(() => {
  const video = findVideo();
  if (video) setupVideoListeners(video);
});
observer.observe(document.body, { childList: true, subtree: true });

// Immediate check
const existingVideo = findVideo();
if (existingVideo) setupVideoListeners(existingVideo);

// Create overlay
createOverlay();

// Check initial sync state
chrome.storage.local.get(['syncEnabled'], (data) => {
  syncEnabled = data.syncEnabled !== false;
  updateOverlayVisibility(syncEnabled);
});

// Request connection status
chrome.runtime.sendMessage({ type: 'get_status' }, (resp) => {
  if (resp) updateOverlayConnection(resp.connected);
});
