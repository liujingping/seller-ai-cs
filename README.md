# pdd-ai-cs

AI-powered customer service bot for Pinduoduo stores, built on Cloudflare Workers and the Claude API.

## Architecture

```
Buyer message → Pinduoduo Open Platform (webhook) → Cloudflare Worker → Claude API → Pinduoduo API (reply) → Buyer
```

### Source layout

```
src/
├── index.ts       # Worker entry point and route handler
├── claude.ts      # Claude API client with multi-turn conversation support
├── pdd.ts         # Pinduoduo API wrapper (signature, message send, webhook verify)
├── knowledge.ts   # Shop knowledge base (FAQ, policies, tone guide)
└── types.ts       # Shared type definitions
```

### Key features

- **Multi-turn conversations** — chat history stored in Cloudflare KV, keyed by buyer UID (last 20 turns, 1-day TTL)
- **Human handoff** — messages containing transfer keywords skip auto-reply
- **Local test endpoint** — `/test` route for development without Pinduoduo credentials

## Setup

### Prerequisites

- Node.js 18+
- A [Cloudflare](https://dash.cloudflare.com) account (free plan works)
- A [Claude API](https://console.anthropic.com) key
- A [Pinduoduo Open Platform](https://open.pinduoduo.com) developer account

### Install

```bash
npm install
```

### Configure secrets

Create `.dev.vars` for local development:

```
CLAUDE_API_KEY=sk-ant-your-key-here
```

For production, use wrangler secrets:

```bash
npx wrangler secret put CLAUDE_API_KEY
npx wrangler secret put PDD_CLIENT_ID
npx wrangler secret put PDD_CLIENT_SECRET
npx wrangler secret put PDD_ACCESS_TOKEN
```

### Customize the knowledge base

Edit `src/knowledge.ts` with your store name, product details, shipping rules, and FAQ.

## Development

```bash
# Start local dev server
npx wrangler dev

# Send a test message
curl -X POST http://localhost:8787/test \
  -H "Content-Type: application/json" \
  -d '{"message": "when will my order ship?", "uid": "test-buyer"}'

# Multi-turn: use the same uid to continue the conversation
curl -X POST http://localhost:8787/test \
  -H "Content-Type: application/json" \
  -d '{"message": "which courier?", "uid": "test-buyer"}'
```

## Deploy

```bash
npx wrangler deploy
```

After deploying, configure the webhook URL in Pinduoduo Open Platform:

```
https://pdd-ai-cs.<your-subdomain>.workers.dev/webhook
```

## Routes

| Method | Path       | Description                              |
|--------|------------|------------------------------------------|
| GET    | `/`        | Health check                             |
| POST   | `/webhook` | Pinduoduo message push callback          |
| POST   | `/test`    | Local test endpoint (Claude only, no PDD)|

## Cost estimate

| Service            | Cost                                    |
|--------------------|-----------------------------------------|
| Cloudflare Workers | Free (100k requests/day)                |
| Claude API (Haiku) | ~$0.003/conversation, ~$10/month @100/day |
| Pinduoduo API      | Free                                    |
