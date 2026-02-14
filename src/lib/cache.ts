/**
 * Simple in-memory cache with TTL for client-side data.
 * Pages show cached data instantly on revisit, then silently refresh in background.
 */

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const DEFAULT_TTL = 60_000; // 60 seconds

const store = new Map<string, CacheEntry<unknown>>();

export const cache = {
  get<T>(key: string): T | null {
    const entry = store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      store.delete(key);
      return null;
    }
    return entry.data as T;
  },

  set<T>(key: string, data: T, ttlMs: number = DEFAULT_TTL): void {
    store.set(key, { data, expiresAt: Date.now() + ttlMs });
  },

  invalidate(key: string): void {
    store.delete(key);
  },

  invalidatePrefix(prefix: string): void {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  },
};
