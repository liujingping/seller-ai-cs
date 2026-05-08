// Pinduoduo webhook request body
export interface PddWebhookBody {
  // Message type
  type: string;
  // Timestamp
  timestamp: number;
  // Signature
  sign?: string;
  // Message list
  messages?: PddMessage[];
}

// Pinduoduo buyer message
export interface PddMessage {
  // Session ID
  tid: string;
  // Buyer ID
  uid: string;
  // Message content
  text: string;
  // Message ID
  msg_id: string;
  // Message timestamp
  ts: number;
}

// Claude API request/response
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

// Worker environment bindings
export interface Env {
  CLAUDE_API_KEY: string;
  CLAUDE_MODEL: string;
  ANTHROPIC_BASE_URL?: string;
  PDD_CLIENT_ID: string;
  PDD_CLIENT_SECRET: string;
  PDD_ACCESS_TOKEN: string;
  CHAT_HISTORY: KVNamespace;
}
