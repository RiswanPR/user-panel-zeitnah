import React from 'react';
import ChunkLoadRecoveryFallback from '../components/common/ChunkLoadRecoveryFallback';

const CHUNK_RELOAD_STORAGE_KEY = 'zeitnah_chunk_reload_state';
const RELOAD_WINDOW_MS = 20000; // 20 seconds recovery guard

/**
 * Checks whether an error is a dynamic import / chunk load failure.
 */
export function isChunkLoadError(error) {
  if (!error) return false;
  const msg = error.message || String(error);
  const name = error.name || '';
  return (
    name === 'ChunkLoadError' ||
    /Failed to fetch dynamically imported module/i.test(msg) ||
    /error loading dynamically imported module/i.test(msg) ||
    /Importing a module script failed/i.test(msg) ||
    /Loading chunk [\d]+ failed/i.test(msg) ||
    /Loading CSS chunk [\d]+ failed/i.test(msg) ||
    /error while loading chunk/i.test(msg)
  );
}

/**
 * Robust lazy import wrapper with single-reload recovery for stale chunks.
 *
 * @param {() => Promise<{ default: React.ComponentType<any> }>} factory
 * @returns {React.LazyExoticComponent<React.ComponentType<any>>}
 */
export function lazyWithRetry(factory) {
  return React.lazy(async () => {
    try {
      return await factory();
    } catch (error) {
      if (isChunkLoadError(error)) {
        let reloadState = null;
        try {
          const raw = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
          if (raw) {
            reloadState = JSON.parse(raw);
          }
        } catch {
          // ignore storage error
        }

        const now = Date.now();
        const hasRecentReload =
          reloadState &&
          now - reloadState.timestamp < RELOAD_WINDOW_MS &&
          reloadState.path === window.location.pathname;

        if (!hasRecentReload) {
          // First chunk load failure: record and perform exactly one controlled reload
          try {
            sessionStorage.setItem(
              CHUNK_RELOAD_STORAGE_KEY,
              JSON.stringify({
                timestamp: now,
                path: window.location.pathname,
                message: error.message || 'chunk_load_error',
              })
            );
          } catch {
            // ignore storage error
          }

          // Force page reload to get fresh index.html and chunks from server / updated SW
          window.location.reload();

          // Return a pending promise so React Suspense stays in loading state during reload
          return new Promise(() => {});
        }

        // Already reloaded once and chunk still fails (persistent failure or offline)
        console.warn(
          '[lazyWithRetry] Stale chunk persisted after recovery reload. Rendering actionable fallback.',
          error
        );

        return {
          default: ChunkLoadRecoveryFallback,
        };
      }

      // Non-chunk error (e.g. syntax or runtime error inside the module)
      throw error;
    }
  });
}

export default lazyWithRetry;
