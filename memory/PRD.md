# DuoWatch - Couples Watch Party App PRD

## Original Problem Statement
Build a private app for couples to binge watch Netflix long distance with chat, react, video call, voice call, cute interface.

## User Personas
- **Partner A**: Shares Netflix screen, chats, calls partner during movie night
- **Partner B**: Watches partner's screen, reacts with emojis, video calls

## Core Requirements
- JWT auth with partner pairing via unique codes
- WebRTC peer-to-peer screen sharing, video/voice calls
- Real-time chat with emoji reactions, stickers, typing indicators, read receipts
- Shared watchlist management
- Play/pause sync signals
- Chrome extension for true Netflix playback sync
- TURN server support for firewall reliability
- Pastel/dreamy aesthetic theme

## Architecture
- **Backend**: FastAPI + MongoDB + WebSocket (signaling + chat)
- **Frontend**: React + Tailwind CSS + Shadcn UI + WebRTC
- **Chrome Extension**: Manifest V3, content script on Netflix, background service worker
- **Database**: MongoDB (users, messages, watchlist)
- **Real-time**: WebSocket for chat/signaling/typing, WebRTC for media

## What's Been Implemented

### Phase 1 (2026-04-19)
- [x] JWT Auth (register, login, logout, me, refresh) with httpOnly cookies
- [x] Partner pairing system (generate code, pair with code)
- [x] Real-time chat via WebSocket with message persistence
- [x] Emoji reactions and sticker support (love, faces, animals, food)
- [x] Watch Room with dark theme, screen sharing UI, video/voice call UI
- [x] Sync play/pause controls
- [x] Shared watchlist CRUD
- [x] Partner online/offline status
- [x] WebRTC signaling (offers, answers, ICE candidates)
- [x] Pastel dreamy theme with Outfit/Nunito fonts, glassmorphism

### Phase 2 (2026-04-19)
- [x] TURN server configuration (ICE config endpoint, env-based TURN credentials)
- [x] Typing indicators (throttled, animated dots)
- [x] Read receipts (single check = sent, double check = read)
- [x] Chrome Extension for Netflix sync (Manifest V3)
  - Content script: captures play/pause/seek on Netflix video
  - Background service worker: WebSocket relay to backend
  - Popup UI: login, connection status, sync toggle
  - Netflix overlay: shows sync status on Netflix pages

## Prioritized Backlog
### P1 (Next)
- GIF search integration (Tenor/GIPHY API)
- Push notifications when partner joins room
- Chat message search
- Mobile responsive polish

### P2
- Custom couple avatars/profile pictures
- Chat reactions with floating animation
- Voice message support
- Watch history tracking

### P3
- Shared mood/status system
- Recommendation engine
- Multiple watch party rooms
