import type { ShopConfig } from "../platforms/types";
import type { Env } from "../types";
import { DEFAULT_KNOWLEDGE } from "./knowledge/default";

interface ShopConfigEntry {
  id: string;
  platform: string;
  credentialKeys: Record<string, string>;
  knowledge?: string;
}

// Parse SHOPS_CONFIG JSON and resolve credential env var references
export function loadShops(env: Env): ShopConfig[] {
  if (!env.SHOPS_CONFIG) return [];

  const entries = JSON.parse(env.SHOPS_CONFIG) as ShopConfigEntry[];
  return entries.map((entry) => {
    const credentials: Record<string, string> = {};
    for (const [key, envVar] of Object.entries(entry.credentialKeys)) {
      credentials[key] = (env as Record<string, unknown>)[envVar] as string ?? "";
    }
    return {
      id: entry.id,
      platform: entry.platform,
      credentials,
      knowledge: entry.knowledge || DEFAULT_KNOWLEDGE,
    };
  });
}

// Find a shop by its ID
export function getShop(env: Env, shopId: string): ShopConfig | undefined {
  return loadShops(env).find((s) => s.id === shopId);
}
