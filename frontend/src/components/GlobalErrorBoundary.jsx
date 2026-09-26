import React from "react";
import ErrorFeedbackModal from "./ErrorFeedbackModal";
import { collectDiagnostics } from "../utils/diagnostics";
import { storage } from "../services/storage";
import { isChunkLoadError } from "../utils/lazyWithRetry";
import ChunkLoadRecoveryFallback from "./common/ChunkLoadRecoveryFallback";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorData: null,
      isChunkError: false,
    };
  }

  static getDerivedStateFromError(error) {
    const chunkError = isChunkLoadError(error);
    return { 
      hasError: true,
      isChunkError: chunkError,
    };
  }

  async componentDidCatch(error, errorInfo) {
    // If this is a dynamic chunk loading error, do NOT trigger diagnostic reports or ErrorFeedbackModal
    if (isChunkLoadError(error)) {
      const CHUNK_RELOAD_STORAGE_KEY = 'zeitnah_chunk_reload_state';
      let reloadState = null;
      try {
        const raw = sessionStorage.getItem(CHUNK_RELOAD_STORAGE_KEY);
        if (raw) reloadState = JSON.parse(raw);
      } catch {
        // ignore
      }

      const now = Date.now();
      const hasRecentReload =
        reloadState &&
        now - reloadState.timestamp < 20000 &&
        reloadState.path === window.location.pathname;

      if (!hasRecentReload) {
        try {
          sessionStorage.setItem(
            CHUNK_RELOAD_STORAGE_KEY,
            JSON.stringify({
              timestamp: now,
              path: window.location.pathname,
              message: error.message || 'global_chunk_error',
            })
          );
        } catch {
          // ignore
        }
        window.location.reload();
        return;
      }

      // Already attempted recovery reload; render ChunkLoadRecoveryFallback without modal
      this.setState({ isChunkError: true });
      return;
    }

    // Genuine application runtime error: collect diagnostics and allow ErrorFeedbackModal
    const diagnostics = await collectDiagnostics(error, errorInfo.componentStack);
    diagnostics.correlationId = crypto.randomUUID?.() || "fallback-uuid";

    this.setState({ errorData: diagnostics, isChunkError: false });

    // Try to silently send an initial report to ensure we catch real bugs
    try {
      const token = await storage.getAccessToken();
      fetch(`${import.meta.env.VITE_API_BASE_URL || "https://zeitnahacademy.com/api"}/error-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({ ...diagnostics, source: "react_error_boundary", isSilent: true })
      }).catch(console.error);
    } catch (e) {
      console.error("Failed silent report", e);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorData: null, isChunkError: false });
  };

  render() {
    if (this.state.hasError) {
      if (this.state.isChunkError) {
        return (
          <ChunkLoadRecoveryFallback 
            onReload={() => window.location.reload()}
            onHome={() => window.location.assign('/courses')}
          />
        );
      }

      return (
        <ErrorFeedbackModal 
          errorData={this.state.errorData}
          onRetry={this.handleRetry}
          onClose={this.handleRetry}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
