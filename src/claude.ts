import type { ClaudeMessage, ClaudeResponse, AppConfig } from "./types";

const BASE_SYSTEM_PROMPT = `你是一个电商店铺的AI客服助手。请根据以下店铺信息回答买家的问题。

重要规则：
1. 只根据上面提供的信息回答，不编造任何信息
2. 如果不确定答案，引导转人工客服
3. 回复要简短热情，符合电商客服风格
4. 不要说自己是AI`;

export async function askClaude(
  question: string,
  config: AppConfig,
  knowledge: string,
  history: ClaudeMessage[] = []
): Promise<string> {
  const systemPrompt = `${BASE_SYSTEM_PROMPT}\n\n${knowledge}`;
  const messages: ClaudeMessage[] = [
    ...history,
    { role: "user", content: question },
  ];

  const baseUrl = config.anthropicBaseUrl || "https://api.anthropic.com";
  const resp = await fetch(`${baseUrl}/v1/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": config.claudeApiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: config.claudeModel,
      max_tokens: 256,
      system: systemPrompt,
      messages,
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
