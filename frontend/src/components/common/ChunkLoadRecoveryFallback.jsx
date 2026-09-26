import React from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';

const CHUNK_RELOAD_STORAGE_KEY = 'zeitnah_chunk_reload_state';

/**
 * Branded actionable fallback component shown if a chunk load fails
 * even after an automated recovery reload.
 */
export function ChunkLoadRecoveryFallback({ onReload, onHome }) {
  const handleReload = () => {
    if (typeof onReload === 'function') {
      onReload();
    } else {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
      } catch {
        // ignore
      }
      window.location.reload();
    }
  };

  const handleHome = () => {
    if (typeof onHome === 'function') {
      onHome();
    } else {
      try {
        sessionStorage.removeItem(CHUNK_RELOAD_STORAGE_KEY);
      } catch {
        // ignore
      }
      window.location.assign('/courses');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-2xl bg-brand-primary/10 border border-brand-primary/20 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 text-brand-mint animate-pulse" />
        </div>
      </div>

      <h2 className="text-xl font-bold text-white mb-2 tracking-tight">
        Application Update Available
      </h2>
      <p className="text-sm text-text-muted max-w-md mb-8 leading-relaxed">
        A new version of Zeitnah Academy has been deployed. Please refresh to load the latest components and ensure seamless performance.
      </p>

      <div className="flex flex-col sm:flex-row items-center gap-3">
        <button
          type="button"
          onClick={handleReload}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-brand-primary hover:bg-brand-primary/90 text-white text-sm font-semibold transition-colors shadow-lg shadow-brand-primary/20 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh Page
        </button>
        <button
          type="button"
          onClick={handleHome}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-text-muted hover:text-white border border-white/[0.08] text-sm font-medium transition-colors cursor-pointer"
        >
          Return to Dashboard
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

export default ChunkLoadRecoveryFallback;
