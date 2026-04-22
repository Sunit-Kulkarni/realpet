# RealPet™ 🐾

> Virtual pets that genuinely live on the server — built for the Frontier Tech Week Y2K Hackathon 2026.

**Live demo:** https://realpet-web.sunitcloud.workers.dev

---

## What is RealPet?

RealPet is a Neopets-era virtual pet app where your pet is **actually alive on the server**. It gets hungrier and sadder on its own schedule, generates AI thoughts in character, and streams all state changes to your browser in real time over a WebSocket.

The aesthetic is unapologetically Y2K: twinkling starfield background, beveled Windows 98 chrome, Comic Sans thought bubbles, a phosphor-green visitor counter, and a scrolling ticker.

---

## Features

- **Adopt a pet** — choose a species (Blob, Cat, Dragon) and personality (Chill, Grumpy, Anxious, Theatrical)
- **Live stat decay** — a Cloudflare Workflow ticks every 2 minutes: hunger rises, happiness falls
- **AI thoughts** — Workers AI generates personality-appropriate inner monologue on each tick
- **Scrollable thought stream** — thoughts accumulate on the pet page as they arrive
- **Feed & Play** — action buttons update stats instantly via WebSocket (no page reload)
- **Real-time sync** — open the same pet in two tabs; both update simultaneously
- **Global chat** — every pet page has a shared chat room powered by a singleton Durable Object; messages appear as your pet
- **Pet Sanctuary dashboard** — `/dashboard` shows all living pets with live stats, auto-refreshing every 10s
- **Full persistence** — all pet state and event history stored in Neon Postgres

---

## Architecture

Two separate Cloudflare deployables in an npm workspaces monorepo:

```
realpet/
├── worker/   ← Cloudflare Worker (API + DOs + Workflow + AI)
└── web/      ← Next.js 15 frontend (deployed via OpenNext on Cloudflare Workers)
```

### Worker (`worker/`)

| Component | Role |
|-----------|------|
| **Cloudflare Worker** (`index.ts`) | HTTP router, CORS, WebSocket upgrade, internal DO routing |
| **PetRoom Durable Object** (`pet-room.ts`) | One per pet. Holds live state in memory, manages WebSocket connections, broadcasts updates |
| **GlobalChatRoom Durable Object** (`global-chat.ts`) | Singleton. All pet pages connect here for the shared chat room |
| **PetLifecycle Workflow** (`pet-workflow.ts`) | One per pet. Ticks every 2 minutes: decays stats, calls Workers AI for thoughts, POSTs updates to the pet's DO |
| **Workers AI** (`ai.ts`) | `@cf/meta/llama-3.3-70b-instruct-fp8-fast` generates in-character thoughts. Falls back to smaller models. No external API key needed |
| **Neon Postgres** (`db.ts`) | Persists pets and event history via `@neondatabase/serverless` |

### Frontend (`web/`)

| Component | Role |
|-----------|------|
| `AdoptForm` | Creates a pet via `POST /api/pets`, redirects to the pet page |
| `PetView` | Client component — hydrates from WebSocket on load, renders all pet UI |
| `usePetSocket` | Hook managing the per-pet WebSocket connection with auto-reconnect |
| `useGlobalChat` | Hook managing the global chat WebSocket connection |
| `ChatWindow` | Real-time cross-pet chat panel |
| `/dashboard` | Polls `GET /api/pets` every 10s, shows all pets as stat cards |

### Data flow

```
Browser                    Worker                     Durable Object / Workflow
──────────────────────────────────────────────────────────────────────────────
Adopt pet      →   POST /api/pets             →   Neon INSERT + start Workflow
Open pet page  →   GET /api/pets/:id/ws       →   PetRoom DO (WS connection)
               ←   { type: "state", pet }     ←   initial state broadcast
Click Feed     →   WS { type:"action","feed"} →   PetRoom mutates + DB write
               ←   { type: "state", pet }     ←   broadcast to all tabs
                                 ↑
               Workflow tick (every 2 min)
               →   Workers AI generates thought
               →   POST /internal/do/:id/tick
               →   POST /internal/do/:id/thought
               ←   broadcast to all connected clients
```

---

## API Reference

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/pets` | Adopt a new pet. Body: `{ name, species, personality }`. Returns `{ id }` |
| `GET` | `/api/pets` | List all pets |
| `GET` | `/api/pets/:id` | Get pet + recent events |
| `POST` | `/api/pets/:id/actions` | Perform an action. Body: `{ kind: "feed" \| "play" \| "chat" }` |
| `GET` | `/api/pets/:id/ws` | WebSocket upgrade — streams `state`, `thought`, and `event` messages |
| `GET` | `/api/chat/ws` | WebSocket upgrade to global chat. Query: `petId`, `petName`, `species` |

### WebSocket message types

**Server → client (per-pet)**
```ts
{ type: "state";   pet: Pet }
{ type: "thought"; text: string; mood: { hunger: number; happiness: number }; at: number }
{ type: "event";   kind: string; at: number }
```

**Server → client (global chat)**
```ts
{ type: "chat"; petId: string; petName: string; species: string; text: string; at: number }
```

**Client → server**
```ts
{ type: "action"; kind: "feed" | "play" | "chat" }
{ type: "chat";   text: string }
{ type: "ping" }
```

---

## Database Schema

```sql
CREATE TABLE pets (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,
  species     TEXT NOT NULL,      -- 'blob' | 'cat' | 'dragon'
  personality TEXT NOT NULL,      -- 'grumpy' | 'anxious' | 'theatrical' | 'chill'
  hunger      INT  NOT NULL DEFAULT 50,   -- 0=stuffed, 100=starving
  happiness   INT  NOT NULL DEFAULT 50,   -- 0=miserable, 100=ecstatic
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE events (
  id         BIGSERIAL PRIMARY KEY,
  pet_id     UUID NOT NULL REFERENCES pets(id) ON DELETE CASCADE,
  kind       TEXT NOT NULL,   -- 'fed' | 'played' | 'thought' | 'tick' | 'chat'
  payload    JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

---

## Local Development

### Prerequisites

- Node.js 18+
- A [Neon](https://neon.tech) Postgres database
- A [Cloudflare](https://cloudflare.com) account with Workers enabled

### Setup

```bash
git clone <repo>
cd realpet
npm install
```

**Worker secrets** — create `worker/.dev.vars`:
```
NEON_DATABASE_URL=postgresql://...your neon connection string...
DO_INTERNAL_SECRET=any-random-secret
```

**Web env** — create `web/.env.local`:
```
NEXT_PUBLIC_WORKER_URL=http://localhost:8787
```

**Run the schema** against your Neon database (one-time):
```bash
psql $NEON_DATABASE_URL < worker/src/schema.sql
```

### Run locally

```bash
# Terminal 1 — Worker
cd worker
npm run dev   # starts on http://localhost:8787

# Terminal 2 — Web
cd web
npm run dev   # starts on http://localhost:3000
```

---

## Deployment

### Worker

```bash
cd worker
npx wrangler login          # first time only
npx wrangler secret put NEON_DATABASE_URL
npx wrangler secret put DO_INTERNAL_SECRET
npx wrangler deploy
```

### Web

Update `web/.env.local` with your deployed worker URL:
```
NEXT_PUBLIC_WORKER_URL=https://realpet-worker.<your-subdomain>.workers.dev
```

Then build and deploy:
```bash
cd web
npm run build
npx opennextjs-cloudflare build
npx wrangler deploy
```

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Runtime | Cloudflare Workers |
| Real-time state | Cloudflare Durable Objects (hibernation API) |
| Background jobs | Cloudflare Workflows |
| AI inference | Cloudflare Workers AI (Llama 3.3 70B) |
| Database | Neon Serverless Postgres |
| Frontend | Next.js 15 (App Router) |
| Frontend deploy | OpenNext + Cloudflare Workers |
| Styling | Plain CSS (Y2K aesthetic — no UI library) |

---

## Project Structure

```
realpet/
├── package.json                  # npm workspaces root
├── worker/
│   ├── wrangler.jsonc
│   ├── src/
│   │   ├── index.ts              # HTTP router + CORS
│   │   ├── pet-room.ts           # PetRoom Durable Object
│   │   ├── global-chat.ts        # GlobalChatRoom Durable Object
│   │   ├── pet-workflow.ts       # PetLifecycle Workflow (2-min ticks)
│   │   ├── db.ts                 # Neon queries
│   │   ├── ai.ts                 # Workers AI wrapper
│   │   ├── types.ts              # Shared types
│   │   └── schema.sql            # Run once against Neon
└── web/
    ├── next.config.ts
    ├── open-next.config.ts
    ├── wrangler.jsonc
    └── src/
        ├── app/
        │   ├── layout.tsx         # Y2K chrome, header, footer
        │   ├── page.tsx           # Adopt form
        │   ├── dashboard/page.tsx # Pet Sanctuary overview
        │   └── pet/[id]/page.tsx  # Individual pet page
        ├── components/
        │   ├── Y2KWindow.tsx
        │   ├── AdoptForm.tsx
        │   ├── PetView.tsx
        │   ├── PetSprite.tsx
        │   ├── ThoughtBubble.tsx
        │   ├── ActionButtons.tsx
        │   └── ChatWindow.tsx
        ├── hooks/
        │   ├── usePetSocket.ts    # Per-pet WebSocket
        │   └── useGlobalChat.ts   # Global chat WebSocket
        └── lib/
            └── api.ts             # HTTP client for worker API
```

---

*Built in ~4 hours for the Frontier Tech Week Y2K Hackathon 2026.*
