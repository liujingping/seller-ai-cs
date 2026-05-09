// Claude API message
export interface ClaudeMessage {
  role: "user" | "assistant";
  content: string;
}

export interface ClaudeResponse {
  content: Array<{ type: string; text: string }>;
}

// Abstract KV storage interface — implemented by Cloudflare KV and Alibaba Tablestore
export interface KVStore {
  get(key: string): Promise<string | null>;
  put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void>;
}

// Runtime configuration (platform-agnostic)
export interface AppConfig {
  claudeApiKey: string;
  claudeModel: string;
  anthropicBaseUrl?: string;
  shopsConfig: string;
  kv: KVStore;
  getEnv(key: string): string | undefined;
}
