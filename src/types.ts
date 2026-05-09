// Claude API message
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
  CHAT_HISTORY: KVNamespace;
  SHOPS_CONFIG: string;
  [key: string]: unknown; // Per-shop credential env vars
}
