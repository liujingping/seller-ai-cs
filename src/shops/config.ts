import type { ShopConfig } from "../platforms/types";
import type { AppConfig } from "../types";
import { DEFAULT_KNOWLEDGE } from "./knowledge/default";

interface ShopConfigEntry {
  id: string;
  platform: string;
  credentialKeys: Record<string, string>;
  knowledge?: string;
}

// Parse SHOPS_CONFIG JSON and resolve credential env var references
export function loadShops(config: AppConfig): ShopConfig[] {
  if (!config.shopsConfig) return [];

  const entries = JSON.parse(config.shopsConfig) as ShopConfigEntry[];
  return entries.map((entry) => {
    const credentials: Record<string, string> = {};
    for (const [key, envVar] of Object.entries(entry.credentialKeys)) {
      credentials[key] = config.getEnv(envVar) ?? "";
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
export function getShop(config: AppConfig, shopId: string): ShopConfig | undefined {
  return loadShops(config).find((s) => s.id === shopId);
}
