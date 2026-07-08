import React from "react";
import ErrorFeedbackModal from "./ErrorFeedbackModal";
import { collectDiagnostics } from "../utils/diagnostics";

class GlobalErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { 
      hasError: false, 
      errorData: null 
    };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  async componentDidCatch(error, errorInfo) {
    // Generate diagnostic data
    const diagnostics = await collectDiagnostics(error, errorInfo.componentStack);
    diagnostics.correlationId = crypto.randomUUID?.() || "fallback-uuid";

    this.setState({ errorData: diagnostics });

    // Try to silently send an initial report to ensure we catch it even if they close modal
    try {
      // Need to use fetch or api instance if available
      const token = localStorage.getItem("token");
      fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api"}/error-reports`, {
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

  render() {
    if (this.state.hasError) {
      return (
        <ErrorFeedbackModal 
          errorData={this.state.errorData}
        />
      );
    }

    return this.props.children;
  }
}

export default GlobalErrorBoundary;
