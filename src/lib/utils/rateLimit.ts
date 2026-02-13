/**
 * Client-side rate limiter using localStorage.
 * Tracks the last action timestamp per key and enforces a cooldown.
 */

interface RateLimitResult {
  allowed: boolean;
  retryAfterSec: number;
}

export function checkRateLimit(key: string, cooldownMs: number): RateLimitResult {
  if (typeof window === "undefined") return { allowed: true, retryAfterSec: 0 };

  const storageKey = `rateLimit:${key}`;
  const now = Date.now();
  const lastAction = parseInt(localStorage.getItem(storageKey) ?? "0", 10);
  const elapsed = now - lastAction;

  if (elapsed < cooldownMs) {
    const retryAfterSec = Math.ceil((cooldownMs - elapsed) / 1000);
    return { allowed: false, retryAfterSec };
  }

  localStorage.setItem(storageKey, now.toString());
  return { allowed: true, retryAfterSec: 0 };
}
