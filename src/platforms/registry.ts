import type { PlatformAdapter } from "./types";
import { PinduoduoAdapter } from "./pinduoduo";
import { TaobaoAdapter } from "./taobao";

const adapters: Record<string, PlatformAdapter> = {
  pinduoduo: new PinduoduoAdapter(),
  taobao: new TaobaoAdapter(),
};

export function getAdapter(platform: string): PlatformAdapter | undefined {
  return adapters[platform];
}

export function supportedPlatforms(): string[] {
  return Object.keys(adapters);
}
