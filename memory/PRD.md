# DuoWatch - Couples Watch Party App PRD

## Original Problem Statement
Build a private app for couples to binge watch Netflix long distance in which they can chat, react, video call and voice call and chat with cute interface.

## User Personas
- **Partner A**: Wants to share their Netflix screen with their partner and chat while watching
- **Partner B**: Wants to watch their partner's screen, react with emojis, and video call during movie night

## Core Requirements
- JWT auth (email/password) with partner pairing via unique codes
- WebRTC peer-to-peer screen sharing, video calls, voice calls
- Real-time chat with emoji reactions and stickers via WebSocket
- Shared watchlist management
- Play/pause sync signals
- Pastel/dreamy aesthetic theme

## Architecture
- **Backend**: FastAPI + MongoDB + WebSocket (signaling + chat)
- **Frontend**: React + Tailwind CSS + Shadcn UI + WebRTC
- **Database**: MongoDB (users, messages, watchlist collections)
- **Real-time**: WebSocket for chat/signaling, WebRTC for media streaming

## What's Been Implemented (2026-04-19)
- [x] JWT Auth (register, login, logout, me, refresh) with httpOnly cookies
- [x] Partner pairing system (generate code, pair with code)
- [x] Real-time chat via WebSocket with message persistence
- [x] Emoji reactions and sticker support (love, faces, animals, food categories)
- [x] Watch Room with dark theme, screen sharing UI, video/voice call UI
- [x] Sync play/pause controls
- [x] Shared watchlist CRUD
- [x] Partner online/offline status
- [x] WebRTC signaling (offers, answers, ICE candidates)
- [x] Pastel dreamy theme with Outfit/Nunito fonts, glassmorphism
- [x] Responsive layout

## Prioritized Backlog
### P0 (Done)
- Auth, pairing, chat, watchlist, watch room UI

### P1 (Next)
- TURN server for WebRTC reliability behind strict firewalls
- GIF search integration (Tenor/GIPHY API)
- Chat message read receipts
- Typing indicators

### P2
- Netflix browser extension for real play/pause sync
- Custom couple avatars/profile pictures
- Chat message reactions with animation
- Push notifications when partner joins room
- Mobile-responsive improvements

### P3
- Voice message support
- Shared mood/status system
- Watch history tracking
- Recommendation engine based on shared preferences
