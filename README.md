# seller-ai-cs

AI-powered customer service bot for e-commerce stores. Supports multiple platforms (Pinduoduo, Taobao, etc.) and multiple shops via a plugin architecture. Runs on Cloudflare Workers or Alibaba Cloud Function Compute.

## Architecture

```
Buyer message → Platform webhook → Serverless function → Claude API → Platform reply API → Buyer
```

### Supported runtimes

| Runtime                        | Entry point              | KV storage            |
|--------------------------------|--------------------------|-----------------------|
| Cloudflare Workers             | `src/index.ts`           | Cloudflare KV         |
| Alibaba Cloud Function Compute | `src/runtimes/aliyun-fc.ts` | In-memory (with TTL)  |

### Supported platforms

| Platform   | Status      | Adapter              |
|------------|-------------|----------------------|
| Pinduoduo  | Implemented | `platforms/pinduoduo.ts` |
| Taobao     | Stub        | `platforms/taobao.ts`    |

Adding a new platform: implement the `PlatformAdapter` interface in `src/platforms/` and register it in `src/platforms/registry.ts`.

### Source layout

```
src/
├── index.ts                  # Cloudflare Worker entry point
├── handler.ts                # Shared request handler (platform-agnostic)
├── claude.ts                 # Claude API client with multi-turn support
├── history.ts                # Chat history KV (per platform/shop/buyer)
├── types.ts                  # Shared types (KVStore, AppConfig, etc.)
├── runtimes/
│   ├── aliyun-fc.ts          # Alibaba Cloud FC entry point
│   └── memory-kv.ts          # In-memory KV store with TTL
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

- **Multi-runtime** — runs on Cloudflare Workers or Alibaba Cloud FC
- **Multi-platform** — plugin adapter interface, add new platforms without touching core logic
- **Multi-shop** — each shop has independent credentials, knowledge base, and chat history
- **Multi-turn conversations** — chat history with configurable backend (last 20 turns, 1-day TTL)
- **Human handoff** — messages containing transfer keywords skip auto-reply

## Setup

### Prerequisites

- Node.js 18+
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

Each `credentialKeys` value references a secret env var name.

### Customize knowledge base

Edit `src/shops/knowledge/default.ts` or provide per-shop knowledge in `SHOPS_CONFIG`:

```json
{
  "id": "pdd-shop1",
  "platform": "pinduoduo",
  "credentialKeys": { "..." : "..." },
  "knowledge": "your custom knowledge base text here"
}
```

## Deploy: Cloudflare Workers

```bash
# Set secrets
npx wrangler secret put CLAUDE_API_KEY
npx wrangler secret put ANTHROPIC_BASE_URL
npx wrangler secret put SHOPS_CONFIG

# Deploy
npx wrangler deploy
```

Webhook URL: `https://seller-ai-cs.<subdomain>.workers.dev/webhook/pinduoduo/pdd-shop1`

## Deploy: Alibaba Cloud FC

1. Create a function on [Alibaba Cloud FC Console](https://fcnext.console.aliyun.com)
2. Runtime: Node.js 18+, HTTP trigger
3. Entry point: `src/runtimes/aliyun-fc.ts` → export `handler`
4. Set environment variables: `CLAUDE_API_KEY`, `CLAUDE_MODEL`, `ANTHROPIC_BASE_URL`, `SHOPS_CONFIG`, and per-shop credential vars

Webhook URL: `https://<function-url>/webhook/pinduoduo/pdd-shop1`

## Development

```bash
# Start local dev server (Cloudflare)
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
| Alibaba Cloud FC   | Free (monthly 100k invocations + 400k GB-s) |
| Claude API (Haiku) | ~$0.003/conversation, ~$10/month @100/day |
| Platform APIs      | Free                                      |
