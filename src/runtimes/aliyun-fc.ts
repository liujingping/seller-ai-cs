import { handleRequest } from "../handler";
import { createMemoryKV } from "./memory-kv";
import type { AppConfig } from "../types";

// Alibaba Cloud Function Compute (FC) entry point — HTTP trigger
// Deploy with: Chinese docs at https://help.aliyun.com/document_detail/2513China09.html

const kv = createMemoryKV();

function getConfig(): AppConfig {
  return {
    claudeApiKey: process.env.CLAUDE_API_KEY || "",
    claudeModel: process.env.CLAUDE_MODEL || "claude-haiku-4.5",
    anthropicBaseUrl: process.env.ANTHROPIC_BASE_URL,
    shopsConfig: process.env.SHOPS_CONFIG || "[]",
    kv,
    getEnv: (key) => process.env[key],
  };
}

// FC HTTP trigger handler
export async function handler(
  request: Request
): Promise<Response> {
  return handleRequest(request, getConfig());
}

// Also export as default for compatibility
export default { fetch: handler };
