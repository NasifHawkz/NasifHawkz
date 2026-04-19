# DuoWatch - Couples Watch Party App PRD

## Original Problem Statement
Build a private app for couples to binge watch Netflix long distance with chat, react, video call, voice call, cute interface.

## What's Been Implemented

### Phase 1 - Core MVP (2026-04-19)
- JWT Auth with partner pairing codes
- Real-time chat via WebSocket (emoji reactions, stickers)
- Watch Room with dark theme, screen sharing, video/voice call UI
- Sync play/pause controls, shared watchlist CRUD
- Pastel dreamy theme (Outfit/Nunito fonts, glassmorphism)

### Phase 2 - Enhanced Features (2026-04-19)
- TURN server config (ICE config endpoint)
- Typing indicators + read receipts
- Chrome Extension for Netflix sync (Manifest V3)

### Phase 3 - Date Night Planner (2026-04-19)
- Full CRUD for date night scheduling
- Calendar picker (Shadcn Calendar + Popover)
- Time slot selector (6PM-2AM range)
- Movie selection from shared watchlist
- Countdown timer on next date night
- Mark complete / delete actions
- Upcoming + past sections

## Architecture
- Backend: FastAPI + MongoDB + WebSocket
- Frontend: React + Tailwind + Shadcn UI + WebRTC
- Chrome Extension: Manifest V3
- Collections: users, messages, watchlist, date_nights

## Test Results
- Backend: 30/30 tests passing
- Frontend: 15/15 flows verified

## Backlog
### P1: GIF search, push notifications, mobile polish
### P2: Custom avatars, voice messages, watch history
### P3: Recommendation engine, multiple rooms
