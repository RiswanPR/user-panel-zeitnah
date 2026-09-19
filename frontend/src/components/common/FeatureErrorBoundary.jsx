import React from "react";
import { AlertCircle, RefreshCw, MessageSquare } from "lucide-react";
import ErrorFeedbackModal from "../ErrorFeedbackModal";
import { collectDiagnostics } from "../../utils/diagnostics";
import { storage } from "../../services/storage";

class FeatureErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      hasError: false,
      errorData: null,
      showModal: false,
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    try {
      const diagnostics = await collectDiagnostics(error, errorInfo.componentStack);
      diagnostics.correlationId = crypto.randomUUID?.() || `feature-${Date.now()}`;
      this.setState({ errorData: diagnostics });

      // Silent telemetry dispatch
      const token = await storage.getAccessToken();
      const baseURL = import.meta.env.VITE_API_BASE_URL || "https://beta.zeitnahacademy.com/api";
      fetch(`${baseURL}/error-reports`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          ...diagnostics,
          source: "feature_error_boundary",
          feature: this.props.featureName || "unknown_feature",
          isSilent: true,
        }),
      }).catch(() => {});
    } catch (e) {
      console.warn("[FeatureErrorBoundary] Diagnostic collection failed:", e);
    }
  }

  handleRetry = () => {
    this.setState({ hasError: false, errorData: null, showModal: false });
    if (this.props.onRetry) {
      this.props.onRetry();
    }
  };

  render() {
    if (this.state.hasError) {
      if (this.state.showModal) {
        return (
          <ErrorFeedbackModal
            errorData={this.state.errorData}
            onRetry={this.handleRetry}
            onClose={() => this.setState({ showModal: false })}
          />
        );
      }

      if (this.props.fallback) {
        return this.props.fallback({
          error: this.state.errorData,
          onRetry: this.handleRetry,
          onReport: () => this.setState({ showModal: true }),
        });
      }

      const featureTitle = this.props.featureName || "this section";

      return (
        <div className="rounded-2xl border border-danger/20 bg-gradient-to-br from-danger/5 via-bg-card to-bg-card p-6 sm:p-8 text-center space-y-4 max-w-lg mx-auto my-8 shadow-xl">
          <div className="w-12 h-12 rounded-2xl bg-danger/10 border border-danger/25 text-danger flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>

          <div className="space-y-1">
            <h3 className="text-lg font-heading font-bold text-white tracking-tight">
              Unable to load {featureTitle}
            </h3>
            <p className="text-xs sm:text-sm font-medium text-text-muted leading-relaxed">
              We encountered an unexpected issue displaying this content. The rest of your workspace remains fully operational.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <button
              type="button"
              onClick={this.handleRetry}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-brand-mint text-bg-base font-bold text-xs uppercase tracking-wider hover:bg-brand-mint/90 transition-all cursor-pointer shadow-sm"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Retry Action
            </button>

            <button
              type="button"
              onClick={() => this.setState({ showModal: true })}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-white/10 bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold uppercase tracking-wider transition-all cursor-pointer"
            >
              <MessageSquare className="w-3.5 h-3.5 text-[#f6ed4a]" />
              Send Report
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default FeatureErrorBoundary;
