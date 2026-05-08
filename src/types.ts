// 拼多多消息推送的webhook请求体
export interface PddWebhookBody {
  // 消息类型
  type: string;
  // 时间戳
  timestamp: number;
  // 签名
  sign?: string;
  // 消息列表
  messages?: PddMessage[];
}

// 拼多多买家消息
export interface PddMessage {
  // 会话ID
  tid: string;
  // 买家ID
  uid: string;
  // 消息内容
  text: string;
  // 消息ID
  msg_id: string;
  // 消息时间
  ts: number;
}

// Claude API 请求/响应
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

// Worker 环境变量
export interface Env {
  CLAUDE_API_KEY: string;
  CLAUDE_MODEL: string;
  ANTHROPIC_BASE_URL?: string;
  PDD_CLIENT_ID: string;
  PDD_CLIENT_SECRET: string;
  PDD_ACCESS_TOKEN: string;
}
