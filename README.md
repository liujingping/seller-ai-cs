# seller-ai-cs

AI-powered customer service bot for e-commerce stores. Runs on Cloudflare Workers, uses Claude API for intelligent replies. Supports multiple platforms and shops via a plugin architecture.

## Architecture

```
Buyer message → Platform webhook → Cloudflare Worker → Claude API → Platform reply API → Buyer
```

### Supported platforms

| Platform   | Status      | Adapter              |
|------------|-------------|----------------------|
| Pinduoduo  | Implemented | `platforms/pinduoduo.ts` |
| Taobao     | Stub        | `platforms/taobao.ts`    |

Adding a new platform: implement the `PlatformAdapter` interface in `src/platforms/` and register it in `src/platforms/registry.ts`.

### Source layout

```
src/
├── index.ts                  # Worker entry, route dispatch
├── claude.ts                 # Claude API client with multi-turn support
├── history.ts                # Chat history KV (per platform/shop/buyer)
├── types.ts                  # Shared type definitions
├── platforms/
│   ├── types.ts              # PlatformAdapter interface
│   ├── registry.ts           # Platform name → adapter mapping
│   ├── pinduoduo.ts          # Pinduoduo adapter
│   └── taobao.ts             # Taobao adapter (stub)
├── shops/
│   ├── config.ts             # Shop config loader (from env vars)
│   └── knowledge/
│       └── default.ts        # Default knowledge base template
└── utils/
    └── crypto.ts             # Shared MD5 helper
```

### Key features

- **Multi-platform** — plugin adapter interface, add new platforms without touching core logic
- **Multi-shop** — each shop has independent credentials, knowledge base, and chat history
- **Multi-turn conversations** — chat history stored in Cloudflare KV (last 20 turns, 1-day TTL)
- **Human handoff** — messages containing transfer keywords skip auto-reply

## Setup

### Prerequisites

- Node.js 18+
- [Cloudflare](https://dash.cloudflare.com) account (free plan works)
- [Claude API](https://console.anthropic.com) key
- Platform developer account (e.g., [Pinduoduo Open Platform](https://open.pinduoduo.com))

### Install

```bash
npm install
```

### Configure shops

Shops are configured via the `SHOPS_CONFIG` environment variable (JSON):

```json
[
  {
    "id": "pdd-shop1",
    "platform": "pinduoduo",
    "credentialKeys": {
      "clientId": "SHOP_PDD_SHOP1_CLIENT_ID",
      "clientSecret": "SHOP_PDD_SHOP1_CLIENT_SECRET",
      "accessToken": "SHOP_PDD_SHOP1_ACCESS_TOKEN"
    }
  }
]
```

Each `credentialKeys` value references a secret env var name. Set them via:

```bash
npx wrangler secret put CLAUDE_API_KEY
npx wrangler secret put SHOPS_CONFIG
npx wrangler secret put SHOP_PDD_SHOP1_CLIENT_ID
npx wrangler secret put SHOP_PDD_SHOP1_CLIENT_SECRET
npx wrangler secret put SHOP_PDD_SHOP1_ACCESS_TOKEN
```

For local development, put secrets in `.dev.vars` (gitignored).

### Customize knowledge base

Edit `src/shops/knowledge/default.ts` or provide per-shop knowledge in `SHOPS_CONFIG`:

```json
{
  "id": "pdd-shop1",
  "platform": "pinduoduo",
  "credentialKeys": { ... },
  "knowledge": "your custom knowledge base text here"
}
```

## Development

```bash
# Start local dev server
npx wrangler dev

# Test with default knowledge
curl -X POST http://localhost:8787/test \
  -H "Content-Type: application/json" \
  -d '{"message": "when will my order ship?", "uid": "buyer-1"}'

# Test with a specific shop
curl -X POST http://localhost:8787/test/pdd-shop1 \
  -H "Content-Type: application/json" \
  -d '{"message": "can I return this?", "uid": "buyer-2"}'
```

## Deploy

```bash
npx wrangler deploy
```

Configure webhook URLs per shop on the platform's developer console:

```
https://seller-ai-cs.<subdomain>.workers.dev/webhook/pinduoduo/pdd-shop1
https://seller-ai-cs.<subdomain>.workers.dev/webhook/taobao/taobao-shop1
```

## Routes

| Method | Path                            | Description                       |
|--------|---------------------------------|-----------------------------------|
| GET    | `/` or `/health`                | Health check, list platforms      |
| POST   | `/webhook/:platform/:shopId`   | Platform message push callback    |
| POST   | `/test/:shopId`                 | Test with shop-specific knowledge |
| POST   | `/test`                         | Test with default knowledge       |

## Adding a new platform

1. Create `src/platforms/yourplatform.ts` implementing `PlatformAdapter`
2. Register it in `src/platforms/registry.ts`
3. Add shop entries to `SHOPS_CONFIG`

```typescript
import type { PlatformAdapter, ParseResult, ShopConfig } from "./types";

export class YourPlatformAdapter implements PlatformAdapter {
  platform = "yourplatform";

  async parseWebhook(request: Request, shop: ShopConfig): Promise<ParseResult> {
    // Parse incoming message format
  }

  async sendReply(shop: ShopConfig, buyerUid: string, text: string): Promise<void> {
    // Call platform API to send reply
  }
}
```

## Cost estimate

| Service            | Cost                                      |
|--------------------|-------------------------------------------|
| Cloudflare Workers | Free (100k requests/day)                  |
| Claude API (Haiku) | ~$0.003/conversation, ~$10/month @100/day |
| Platform APIs      | Free                                      |
