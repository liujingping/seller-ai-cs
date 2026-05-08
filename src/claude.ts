import type { ClaudeResponse, Env } from "./types";
import { SHOP_KNOWLEDGE } from "./knowledge";

const SYSTEM_PROMPT = `你是一个拼多多店铺的AI客服助手。请根据以下店铺信息回答买家的问题。

${SHOP_KNOWLEDGE}

重要规则：
1. 只根据上面提供的信息回答，不编造任何信息
2. 如果不确定答案，引导转人工客服
3. 回复要简短热情，符合电商客服风格
4. 不要说自己是AI`;

export async function askClaude(
  question: string,
  env: Env
): Promise<string> {
  const baseUrl = env.ANTHROPIC_BASE_URL || "https://api.anthropic.com";
  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": env.CLAUDE_API_KEY,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: env.CLAUDE_MODEL,
      max_tokens: 256,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: question }],
    }),
  });

  if (!resp.ok) {
    const err = await resp.text();
    console.error("Claude API error:", resp.status, err);
    throw new Error(`Claude API ${resp.status}`);
  }

  const data = (await resp.json()) as ClaudeResponse;
  return data.content[0]?.text ?? "亲，稍等一下哦~";
}
