import type { KVStore } from "./types";
import { handleRequest } from "./handler";

// Cloudflare Worker environment bindings
interface CloudflareEnv {
  CLAUDE_API_KEY: string;
  CLAUDE_MODEL: string;
  ANTHROPIC_BASE_URL?: string;
  CHAT_HISTORY: KVNamespace;
  SHOPS_CONFIG: string;
  [key: string]: unknown;
}

// Adapt Cloudflare KV to our KVStore interface
function wrapKV(kv: KVNamespace): KVStore {
  return {
    get: (key) => kv.get(key),
    put: (key, value, options) =>
      kv.put(key, value, options?.expirationTtl ? { expirationTtl: options.expirationTtl } : undefined),
  };
}

export default {
  async fetch(request: Request, env: CloudflareEnv): Promise<Response> {
    return handleRequest(request, {
      claudeApiKey: env.CLAUDE_API_KEY,
      claudeModel: env.CLAUDE_MODEL,
      anthropicBaseUrl: env.ANTHROPIC_BASE_URL,
      shopsConfig: env.SHOPS_CONFIG,
      kv: wrapKV(env.CHAT_HISTORY),
      getEnv: (key) => env[key] as string | undefined,
    });
  },
};
