# DuoWatch Chrome Extension - Netflix Sync

Sync Netflix playback with your partner in real time. When one person plays, pauses, or seeks, the other's Netflix automatically follows.

## Installation

1. Open Chrome and go to `chrome://extensions/`
2. Enable **Developer mode** (toggle in the top-right corner)
3. Click **Load unpacked**
4. Select the `chrome-extension` folder from this project
5. The DuoWatch extension icon will appear in your toolbar

## Setup

1. Click the DuoWatch extension icon in your toolbar
2. Enter your **Server URL** (e.g., `https://duo-watch-connect.preview.emergentagent.com`)
3. Enter your DuoWatch **email** and **password**
4. Click **Connect**

## How It Works

1. **Both partners** install the extension and connect with their DuoWatch accounts
2. **Both partners** open the same Netflix show/movie in their browsers
3. When one person **plays, pauses, or seeks**, the other's Netflix automatically syncs
4. A small overlay in the top-right of Netflix shows the sync status

## Features

- **Auto-sync**: Play, pause, and seek events are synced in real-time
- **Visual overlay**: See sync status directly on Netflix
- **Toggle sync**: Enable/disable sync from the extension popup
- **Partner status**: See if your partner is connected
- **Auto-reconnect**: Automatically reconnects if the connection drops

## Architecture

- **content.js**: Injected into Netflix pages. Detects video play/pause/seek events and applies sync commands from partner.
- **background.js**: Service worker that maintains a WebSocket connection to the DuoWatch backend and relays messages between the content script and server.
- **popup.html/js/css**: Extension popup UI for login, connection status, and sync toggle.

## Troubleshooting

- **Extension not syncing**: Make sure both partners are connected (green dot in popup) and sync is enabled
- **Netflix not detected**: Refresh the Netflix page after installing the extension
- **Connection lost**: Click "Reconnect" in the popup, or check if the server URL is correct
