import type { AppConfig } from "./types";
import { askClaude } from "./claude";
import { getHistory, saveHistory } from "./history";
import { getAdapter, supportedPlatforms } from "./platforms/registry";
import { getShop } from "./shops/config";
import { DEFAULT_KNOWLEDGE } from "./shops/knowledge/default";

// Shared request handler — platform-agnostic, used by both Cloudflare and Alibaba Cloud entry points
export async function handleRequest(
  request: Request,
  config: AppConfig
): Promise<Response> {
  const url = new URL(request.url);

  // Health check
  if (url.pathname === "/" || url.pathname === "/health") {
    return Response.json({
      status: "running",
      platforms: supportedPlatforms(),
    });
  }

  // Webhook: POST /webhook/:platform/:shopId
  const webhookMatch = url.pathname.match(/^\/webhook\/([^/]+)\/([^/]+)$/);
  if (webhookMatch && request.method === "POST") {
    const [, platform, shopId] = webhookMatch;
    return handleWebhook(request, config, platform, shopId);
  }

  // Test: POST /test/:shopId
  const testMatch = url.pathname.match(/^\/test\/([^/]+)$/);
  if (testMatch && request.method === "POST") {
    return handleTest(request, config, testMatch[1]);
  }

  // Legacy test endpoint (no shop ID, uses default knowledge)
  if (url.pathname === "/test" && request.method === "POST") {
    return handleTest(request, config, "_default");
  }

  return new Response("Not Found", { status: 404 });
}

// Handle incoming platform webhook
async function handleWebhook(
  request: Request,
  config: AppConfig,
  platform: string,
  shopId: string
): Promise<Response> {
  const adapter = getAdapter(platform);
  if (!adapter) {
    return Response.json(
      { error: `Unsupported platform: ${platform}` },
      { status: 400 }
    );
  }

  const shop = getShop(config, shopId);
  if (!shop) {
    return Response.json(
      { error: `Shop not found: ${shopId}` },
      { status: 404 }
    );
  }

  let result;
  try {
    result = await adapter.parseWebhook(request, shop);
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  if (result.type === "verify") {
    return Response.json({ success: true });
  }

  for (const msg of result.messages) {
    try {
      console.log(`[${platform}/${shopId}] Buyer ${msg.buyerUid}: ${msg.text}`);

      if (shouldTransferToHuman(msg.text)) {
        console.log("Transfer to human detected, skipping auto-reply");
        continue;
      }

      const history = await getHistory(platform, shopId, msg.buyerUid, config.kv);
      const reply = await askClaude(msg.text, config, shop.knowledge, history);
      console.log(`[${platform}/${shopId}] Reply to ${msg.buyerUid}: ${reply}`);

      history.push({ role: "user", content: msg.text });
      history.push({ role: "assistant", content: reply });
      await saveHistory(platform, shopId, msg.buyerUid, history, config.kv);

      await adapter.sendReply(shop, msg.buyerUid, reply);
    } catch (err) {
      console.error(`Error handling message ${msg.messageId}:`, err);
    }
  }

  return Response.json({ success: true });
}

// Test endpoint — only tests Claude replies, does not call platform API
async function handleTest(
  request: Request,
  config: AppConfig,
  shopId: string
): Promise<Response> {
  let body: { message: string; uid?: string };
  try {
    body = (await request.json()) as { message: string; uid?: string };
  } catch {
    return new Response("Bad Request: need {\"message\": \"...\", \"uid\": \"...\"}", {
      status: 400,
    });
  }

  if (!body.message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  const uid = body.uid || "test-user";
  const shop = getShop(config, shopId);
  const platform = shop?.platform || "test";
  const knowledge = shop?.knowledge || DEFAULT_KNOWLEDGE;

  try {
    const history = await getHistory(platform, shopId, uid, config.kv);
    const reply = await askClaude(body.message, config, knowledge, history);

    history.push({ role: "user", content: body.message });
    history.push({ role: "assistant", content: reply });
    await saveHistory(platform, shopId, uid, history, config.kv);

    return Response.json({
      shopId,
      platform,
      uid,
      question: body.message,
      reply,
      turns: history.length / 2,
    });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}

// Detect if buyer is requesting a human agent
function shouldTransferToHuman(text: string): boolean {
  const keywords = ["转人工", "人工客服", "找人工", "真人客服"];
  return keywords.some((k) => text.includes(k));
}
