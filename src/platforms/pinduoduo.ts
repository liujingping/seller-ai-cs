import type { PlatformAdapter, ParseResult, ShopConfig } from "./types";
import { md5Hex } from "../utils/crypto";

const PDD_API_URL = "https://gw-api.pinduoduo.com/api/router";

// Pinduoduo API signature: MD5(secret + sorted key-value pairs + secret).toUpperCase()
async function sign(
  params: Record<string, string>,
  clientSecret: string
): Promise<string> {
  const sorted = Object.keys(params)
    .sort()
    .map((k) => `${k}${params[k]}`)
    .join("");
  const raw = clientSecret + sorted + clientSecret;
  return (await md5Hex(raw)).toUpperCase();
}

export class PinduoduoAdapter implements PlatformAdapter {
  platform = "pinduoduo";

  async parseWebhook(request: Request): Promise<ParseResult> {
    const body = (await request.json()) as Record<string, unknown>;

    // Pinduoduo sends a verify request when configuring the webhook URL
    if (body.type === "verify") {
      return { type: "verify" };
    }

    const messages = body.messages as Array<{
      tid: string;
      uid: string;
      text: string;
      msg_id: string;
      ts: number;
    }> | undefined;

    if (!messages || messages.length === 0) {
      return { type: "messages", messages: [] };
    }

    return {
      type: "messages",
      messages: messages.map((m) => ({
        buyerUid: m.uid,
        text: m.text,
        messageId: m.msg_id,
      })),
    };
  }

  async sendReply(shop: ShopConfig, buyerUid: string, text: string): Promise<void> {
    const params: Record<string, string> = {
      type: "pdd.mall.customer.service.send",
      client_id: shop.credentials.clientId,
      access_token: shop.credentials.accessToken,
      timestamp: Math.floor(Date.now() / 1000).toString(),
      data_type: "JSON",
      session_id: buyerUid,
      message_type: "1", // text message
      content: JSON.stringify({ text }),
    };

    params.sign = await sign(params, shop.credentials.clientSecret);

    const resp = await fetch(PDD_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(params),
    });

    if (!resp.ok) {
      const err = await resp.text();
      console.error("PDD API error:", resp.status, err);
    } else {
      const result = await resp.json();
      console.log("PDD send result:", JSON.stringify(result));
    }
  }
}
