import { createBrowserClient } from "@supabase/ssr";
import { Database } from "@/types/database.types";

// In-memory lock to replace navigator.locks, which throws AbortError
// when React Strict Mode double-mounts and the first subscription is
// unsubscribed before the lock resolves.
const inMemoryLocks = new Map<string, Promise<unknown>>();

async function customLock<R>(
  name: string,
  _acquireTimeout: number,
  fn: () => Promise<R>
): Promise<R> {
  const existing = inMemoryLocks.get(name);
  if (existing) {
    try {
      await existing;
    } catch {
      // ignore errors from previous holder
    }
  }

  const promise = fn();
  inMemoryLocks.set(name, promise);
  try {
    return await promise;
  } finally {
    if (inMemoryLocks.get(name) === promise) {
      inMemoryLocks.delete(name);
    }
  }
}

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      auth: {
        lock: customLock,
      },
    }
  );
}