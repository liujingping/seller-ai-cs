import type { Env, PddWebhookBody } from "./types";
import { askClaude, getHistory, saveHistory } from "./claude";
import { sendMessage } from "./pdd";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("pdd-ai-cs is running", { status: 200 });
    }

    // Pinduoduo message push webhook
    if (url.pathname === "/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    // Manual test endpoint: POST /test {"message": "hello", "uid": "test-user"}
    if (url.pathname === "/test" && request.method === "POST") {
      return handleTest(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// Handle incoming Pinduoduo message push
async function handleWebhook(
  request: Request,
  env: Env
): Promise<Response> {
  let body: PddWebhookBody;
  try {
    body = (await request.json()) as PddWebhookBody;
  } catch {
    return new Response("Bad Request", { status: 400 });
  }

  console.log("Webhook received:", JSON.stringify(body));

  // Pinduoduo sends a verify request when configuring the webhook URL
  if (body.type === "verify") {
    return Response.json({ success: true });
  }

  // Process buyer messages
  if (body.messages && body.messages.length > 0) {
    for (const msg of body.messages) {
      try {
        console.log(`Buyer ${msg.uid}: ${msg.text}`);

        // Skip auto-reply if buyer requests a human agent
        if (shouldTransferToHuman(msg.text)) {
          console.log("Transfer to human detected, skipping auto-reply");
          continue;
        }

        // Load conversation history
        const history = await getHistory(msg.uid, env.CHAT_HISTORY);

        // Generate reply with Claude
        const reply = await askClaude(msg.text, env, history);
        console.log(`Reply to ${msg.uid}: ${reply}`);

        // Persist conversation history
        history.push({ role: "user", content: msg.text });
        history.push({ role: "assistant", content: reply });
        await saveHistory(msg.uid, history, env.CHAT_HISTORY);

        // Send reply via Pinduoduo API
        await sendMessage(msg.uid, reply, env);
      } catch (err) {
        console.error(`Error handling message ${msg.msg_id}:`, err);
      }
    }
  }

  return Response.json({ success: true });
}

// Local test endpoint — only tests Claude replies, does not call Pinduoduo API
async function handleTest(
  request: Request,
  env: Env
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

  try {
    const history = await getHistory(uid, env.CHAT_HISTORY);
    const reply = await askClaude(body.message, env, history);

    history.push({ role: "user", content: body.message });
    history.push({ role: "assistant", content: reply });
    await saveHistory(uid, history, env.CHAT_HISTORY);

    return Response.json({ uid, question: body.message, reply, turns: history.length / 2 });
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

// Detect if buyer is requesting a human agent
function shouldTransferToHuman(text: string): boolean {
  const keywords = ["转人工", "人工客服", "找人工", "真人客服"];
  return keywords.some((k) => text.includes(k));
}
