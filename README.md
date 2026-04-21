# Conquian Social — Multiplayer Card Game

Real-time multiplayer Conquian card game built with Next.js 14, Supabase, and LiveKit.

## Tech Stack
- **Next.js 14** (App Router)
- **Supabase** — real-time game state, players, chat
- **LiveKit** — in-room voice chat
- **Tailwind CSS** — styling
- **TypeScript** — fully typed

## Quick Start

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Environment Variables

Create `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
LIVEKIT_API_KEY=...
LIVEKIT_API_SECRET=...
NEXT_PUBLIC_LIVEKIT_URL=...
```

## Database Setup

Run `supabase_schema.sql` in your Supabase SQL Editor, then enable Realtime on all 4 tables:
- `rooms`
- `players`
- `game_state`
- `messages`

## Deploy

Deploy to Vercel — add env vars in the Vercel dashboard.

## Game Rules

- 2–4 active players, spectators allowed
- Deal 9 cards each
- First to meld 10 cards wins the pot
- Melds: sets (3-4 same rank) or runs (3+ consecutive same suit, ace low)
- Discard is offered to all players before the active player draws
- Force rule: any opponent can force the active player to take a card that extends their melds
- 30-second turn timer — auto-pass on expiry

## Features

- ✅ Bilingual (EN/ES) — toggle updates whole UI instantly
- ✅ Character creation (emoji avatar + border color)
- ✅ Traditional green felt poker table layout
- ✅ Real-time game state via Supabase subscriptions
- ✅ Bet voting system (host proposes, all vote)
- ✅ Partial melding — player picks exactly which cards to meld
- ✅ Force rule
- ✅ Spectator mode with seat takeover
- ✅ Winner splash with confetti + pot breakdown
- ✅ Draw condition (pot doubles)
- ✅ Text chat panel
- ✅ LiveKit voice token API
- ✅ Vercel deploy-ready
