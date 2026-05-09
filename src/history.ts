import type { ClaudeMessage } from "./types";

const MAX_HISTORY = 20; // Keep last 20 conversation turns
const HISTORY_TTL = 86400; // Chat history expires after 1 day

// Build a namespaced KV key to isolate conversations across platforms/shops
function kvKey(platform: string, shopId: string, buyerUid: string): string {
  return `${platform}:${shopId}:${buyerUid}`;
}

// Retrieve conversation history from KV
export async function getHistory(
  platform: string,
  shopId: string,
  buyerUid: string,
  kv: KVNamespace
): Promise<ClaudeMessage[]> {
  const data = await kv.get(kvKey(platform, shopId, buyerUid));
  if (!data) return [];
  return JSON.parse(data) as ClaudeMessage[];
}

// Persist conversation history to KV
export async function saveHistory(
  platform: string,
  shopId: string,
  buyerUid: string,
  history: ClaudeMessage[],
  kv: KVNamespace
): Promise<void> {
  // Keep only the last MAX_HISTORY turns (2 messages per turn: user + assistant)
  const trimmed = history.slice(-(MAX_HISTORY * 2));
  await kv.put(
    kvKey(platform, shopId, buyerUid),
    JSON.stringify(trimmed),
    { expirationTtl: HISTORY_TTL }
  );
}
