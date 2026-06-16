# PlayGolf — Mobile App PRD

## Overview
PlayGolf is a premium membership & loyalty mobile app for a golf club and driving range. Members get a digital membership card, earn loyalty points, and redeem them for rewards.

## Tech Stack
- **Frontend**: Expo SDK 54 + Expo Router (file-based routing)
- **Backend**: FastAPI + Motor (MongoDB)
- **Auth**: Mock Phone + OTP (any phone, OTP = `0000`)
- **Storage**: `@react-native-async-storage/async-storage` for token persistence

## Features Implemented

### Auth
- Phone-only sign-in with OTP verification (mocked, OTP always `0000`)
- Auto-creates new member with 250 welcome points
- Token-based session (Bearer auth, stored in AsyncStorage)
- Logout flow with confirmation

### Membership Card
- Digital card with member name, member ID, tier badge, golf-course background
- Tap card or "Show QR" → bottom-sheet style QR modal with member ID encoded
- Tiers: **Silver** (0-999 lifetime), **Gold** (1000-4999), **Platinum** (5000+) — auto-promote

### Points
- Points balance + lifetime points + tier progress bar on home
- Visual progress to next tier with "X more points to Gold/Platinum"
- "Log Visit" quick action adds 150 demo points (simulates staff scanning member QR)
- Welcome bonus on signup: +250 points

### Rewards Catalog
- 10 pre-seeded rewards across 5 categories: Range, Course, Pro Shop, Cafe, Lessons
- Sticky header with category chips (single horizontal scroller, 36pt chips)
- 2-column grid with reward image, points cost badge, category, title
- Reward detail screen with full description, "How to redeem" steps
- Single-tap redeem deducts points and generates unique 8-char redemption code + QR

### Transaction History
- All earn/redeem activity with icons, dates, redemption codes
- Pull-to-refresh

### Profile
- Avatar, name, phone, tier pill
- Stats: current balance, lifetime points, member ID
- Tier benefits list (varies by tier)
- Sign out with confirmation

## Design
- **Personality**: Glass / Luxe (Dark) — country club premium
- **Palette**: Obsidian green `#0E1210` + antique gold `#D4AF37`
- **Display font**: serif (Cormorant Garamond fallback)
- **Layout**: Bottom tabs (Card / Rewards / History / Profile), generous spacing

## API Endpoints (all `/api/*`)
- `POST /auth/request-otp` `{ phone }` → `{ ok, dev_otp, message }`
- `POST /auth/verify-otp` `{ phone, otp, name? }` → `{ token, user }`
- `POST /auth/logout` (auth)
- `GET /me` (auth)
- `POST /me/name` (auth) `{ name }`
- `GET /rewards?category=` 
- `GET /rewards/{id}`
- `POST /redeem` (auth) `{ reward_id }`
- `GET /transactions` (auth)
- `POST /points/add` (auth) `{ points, title? }` — demo only
- `POST /seed` — idempotent reward catalog seed (also runs on startup)

## MongoDB Collections
- `users` — id (uuid), phone, name, member_id, tier, points_balance, lifetime_points, joined_at
- `rewards` — id, title, description, points_cost, category, image_url, active
- `transactions` — id, user_id, type (earn|redeem), points, title, reward_id?, redemption_code?, created_at
- `sessions` — token, user_id, created_at
- `otps` — phone, otp, created_at (TTL via overwrite)

## Test Credentials
See `/app/memory/test_credentials.md`
