import type { KVStore } from "../types";

// In-memory KV store with TTL support
// Suitable for single-instance serverless functions (e.g., Alibaba Cloud FC)
// Data persists across warm invocations but is lost on cold starts
const store = new Map<string, { value: string; expiresAt: number }>();

export function createMemoryKV(): KVStore {
  return {
    async get(key: string): Promise<string | null> {
      const entry = store.get(key);
      if (!entry) return null;
      if (Date.now() > entry.expiresAt) {
        store.delete(key);
        return null;
      }
      return entry.value;
    },
    async put(key: string, value: string, options?: { expirationTtl?: number }): Promise<void> {
      const ttl = options?.expirationTtl ?? 86400;
      store.set(key, {
        value,
        expiresAt: Date.now() + ttl * 1000,
      });
    },
  };
}
