import type { PlatformAdapter, ParseResult, ShopConfig } from "./types";

// Taobao/Tmall adapter stub
// TODO: Implement after registering on Taobao Open Platform (open.taobao.com)
// Taobao uses TMC (Taobao Message Channel) for message push, which differs
// from simple HTTP webhooks. The adapter interface remains the same — the
// parseWebhook method should handle whatever request format Taobao sends.

export class TaobaoAdapter implements PlatformAdapter {
  platform = "taobao";

  async parseWebhook(request: Request): Promise<ParseResult> {
    // TODO: Parse Taobao message push format
    // Taobao uses TMC (Taobao Message Channel), signature uses MD5 or HMAC-SHA256
    // API method: taobao.qianniu.message.*
    console.warn("Taobao adapter not yet implemented");
    return { type: "messages", messages: [] };
  }

  async sendReply(shop: ShopConfig, buyerUid: string, text: string): Promise<void> {
    // TODO: Implement using taobao.qianniu.message.send or equivalent API
    // Signature: MD5(secret + sorted params + secret) — similar to Pinduoduo
    console.warn("Taobao sendReply not yet implemented");
    throw new Error("Taobao adapter not yet implemented");
  }
}
