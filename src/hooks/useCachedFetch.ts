"use client";

import { cache } from "@/lib/cache";
import { useCallback, useEffect, useRef, useState } from "react";

interface UseCachedFetchResult<T> {
  data: T | null;
  loading: boolean;
  refresh: () => Promise<void>;
}

/**
 * Hook that returns cached data instantly on mount, then silently refreshes in background.
 * First visit: loading=true until fetch completes.
 * Return visit: loading=false with cached data, background refetch updates data seamlessly.
 */
export function useCachedFetch<T>(
  key: string,
  fetcher: () => Promise<T>,
  deps: unknown[] = []
): UseCachedFetchResult<T> {
  const cached = cache.get<T>(key);
  const [data, setData] = useState<T | null>(cached);
  const [loading, setLoading] = useState(!cached);
  const mountedRef = useRef(true);

  const doFetch = useCallback(async () => {
    try {
      const result = await fetcher();
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        cache.set(key, result);
      }
    } catch (err) {
      console.error(`useCachedFetch(${key}):`, err);
      if (mountedRef.current) {
        setLoading(false);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, ...deps]);

  useEffect(() => {
    mountedRef.current = true;
    doFetch();
    return () => {
      mountedRef.current = false;
    };
  }, [doFetch]);

  const refresh = useCallback(async () => {
    cache.invalidate(key);
    setLoading(true);
    await doFetch();
  }, [key, doFetch]);

  return { data, loading, refresh };
}
