import { useState, useEffect, useRef, useCallback } from 'react';
import api from '../services/api';

const cache = new Map();
const pendingRequests = new Map();

/**
 * Generic data-fetching hook with caching, dedup, retry, and stale-while-revalidate.
 *
 * @param {string} url – API endpoint
 * @param {object} options
 * @param {number} [options.cacheTTL=0] – Cache TTL in ms. 0 = no cache
 * @param {boolean} [options.enabled=true] – Whether to fetch on mount
 * @param {number} [options.retries=2] – Number of retries on 5xx errors
 * @param {*} [options.initialData=null] – Fallback data for SSR / instant display
 * @param {Function} [options.onSuccess] – Callback after successful fetch
 * @param {Function} [options.onError] – Callback after failed fetch
 */
export function useApi(url, {
  cacheTTL = 0,
  enabled = true,
  retries = 2,
  initialData = null,
  onSuccess,
  onError,
} = {}) {
  const [data, setData] = useState(() => {
    // Use cached data for instant display if available
    if (cacheTTL > 0 && cache.has(url)) {
      const entry = cache.get(url);
      if (Date.now() - entry.timestamp < cacheTTL) {
        return entry.data;
      }
    }
    return initialData;
  });
  const [loading, setLoading] = useState(!data);
  const [error, setError] = useState(null);
  const abortRef = useRef(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (showLoading = true) => {
    if (!url) return;

    // Dedup: reuse pending request
    if (pendingRequests.has(url)) {
      try {
        const result = await pendingRequests.get(url);
        if (mountedRef.current) {
          setData(result);
          setError(null);
          setLoading(false);
          onSuccess?.(result);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err);
          setLoading(false);
          onError?.(err);
        }
      }
      return;
    }

    if (showLoading) setLoading(true);
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const request = (async () => {
      let lastError = null;
      for (let attempt = 0; attempt <= retries; attempt++) {
        try {
          const res = await api.get(url, { signal: controller.signal });
          const result = res.data;

          // Cache it
          if (cacheTTL > 0) {
            cache.set(url, { data: result, timestamp: Date.now() });
          }

          return result;
        } catch (err) {
          lastError = err;
          if (err.name === 'CanceledError' || err.name === 'AbortError') throw err;
          // Only retry on 5xx
          if (err.response?.status < 500 || attempt === retries) throw err;
          // Exponential backoff
          await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 500));
        }
      }
      throw lastError;
    })();

    pendingRequests.set(url, request);

    try {
      const result = await request;
      if (mountedRef.current) {
        setData(result);
        setError(null);
        onSuccess?.(result);
      }
    } catch (err) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') return;
      if (mountedRef.current) {
        setError(err);
        onError?.(err);
      }
    } finally {
      pendingRequests.delete(url);
      if (mountedRef.current) setLoading(false);
    }
  }, [url, cacheTTL, retries, onSuccess, onError]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    if (enabled) {
      // Delay fetching by a tick to prevent React 19 cascading renders warning
      Promise.resolve().then(() => {
        if (mountedRef.current) fetchData();
      });
    }
    return () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    };
  }, [fetchData, enabled]);

  const refetch = useCallback(() => fetchData(true), [fetchData]);
  const mutate = useCallback((newData) => {
    setData(newData);
    if (cacheTTL > 0 && url) {
      cache.set(url, { data: newData, timestamp: Date.now() });
    }
  }, [cacheTTL, url]);

  return { data, loading, error, refetch, mutate };
}

/** Invalidate a specific cache entry */
export function invalidateCache(url) {
  cache.delete(url);
}

/** Clear all cache */
export function clearCache() {
  cache.clear();
}

export default useApi;
