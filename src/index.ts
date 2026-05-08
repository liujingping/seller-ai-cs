import type { Env, PddWebhookBody } from "./types";
import { askClaude } from "./claude";
import { sendMessage } from "./pdd";

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // 健康检查
    if (url.pathname === "/" || url.pathname === "/health") {
      return new Response("pdd-ai-cs is running", { status: 200 });
    }

    // 拼多多消息推送回调
    if (url.pathname === "/webhook" && request.method === "POST") {
      return handleWebhook(request, env);
    }

    // 手动测试接口：POST /test {"message": "你好"}
    if (url.pathname === "/test" && request.method === "POST") {
      return handleTest(request, env);
    }

    return new Response("Not Found", { status: 404 });
  },
};

// 处理拼多多消息推送
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

  // 拼多多验证URL时会发一个验证请求，需要原样返回
  if (body.type === "verify") {
    return Response.json({ success: true });
  }

  // 处理买家消息
  if (body.messages && body.messages.length > 0) {
    for (const msg of body.messages) {
      try {
        console.log(`Buyer ${msg.uid}: ${msg.text}`);

        // 转人工检测
        if (shouldTransferToHuman(msg.text)) {
          console.log("Transfer to human detected, skipping auto-reply");
          continue;
        }

        // 调用 Claude 生成回复
        const reply = await askClaude(msg.text, env);
        console.log(`Reply to ${msg.uid}: ${reply}`);

        // 通过拼多多API发送回复
        await sendMessage(msg.uid, reply, env);
      } catch (err) {
        console.error(`Error handling message ${msg.msg_id}:`, err);
      }
    }
  }

  return Response.json({ success: true });
}

// 本地测试接口 — 不调用拼多多API，只测试Claude回复
async function handleTest(
  request: Request,
  env: Env
): Promise<Response> {
  let body: { message: string };
  try {
    body = (await request.json()) as { message: string };
  } catch {
    return new Response("Bad Request: need {\"message\": \"...\"}", {
      status: 400,
    });
  }

  if (!body.message) {
    return Response.json({ error: "message is required" }, { status: 400 });
  }

  try {
    const reply = await askClaude(body.message, env);
    return Response.json({ question: body.message, reply });
  } catch (err) {
    return Response.json(
      { error: String(err) },
      { status: 500 }
    );
  }
}

// 检测是否需要转人工
function shouldTransferToHuman(text: string): boolean {
  const keywords = ["转人工", "人工客服", "找人工", "真人客服"];
  return keywords.some((k) => text.includes(k));
}
