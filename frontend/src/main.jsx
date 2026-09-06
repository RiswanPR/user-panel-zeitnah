import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import storage from "./services/storage";

// ── Version Control & Cache Invalidation ──
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const cachedVersion = storage.getItem("app_version");

if (cachedVersion !== APP_VERSION) {
  console.log(`[Version] Upgrading from ${cachedVersion} to ${APP_VERSION}`);
  storage.setItem("app_version", APP_VERSION);
  
  // Clear caches if Service Worker is used
  if ("caches" in window) {
    caches.keys().then((names) => {
      for (const name of names) {
        caches.delete(name);
      }
    });
  }

  // Only reload if we actually had a previous version (not first visit)
  if (cachedVersion) {
    window.location.reload();
  }
}

// ── Global Error Capture ──
// NOTE: Global error/rejection listeners are handled by errorCapture.ts
// (initialized via initErrorCapture() in App.jsx) and reported through
// the TroubleshootReporter component. Duplicate listeners were removed
// here to prevent generating 2-3x email alerts and DB records per error.

// ── Helpers: Detect third-party browser-extension errors ──
// Used by GlobalErrorBoundary for filtering before reporting.
function isBrowserExtensionError(errorOrMessage, filename) {
  const extProtocols = ["chrome-extension://", "moz-extension://", "safari-extension://"];
  const str = String(errorOrMessage || "");
  if (extProtocols.some((p) => str.includes(p))) return true;
  if (filename && extProtocols.some((p) => filename.startsWith(p))) return true;
  // MetaMask-specific noise — the extension rejects internally when it
  // can't establish a connection to a dApp on every page load.
  if (/failed to connect to metamask/i.test(str)) return true;
  return false;
}

// Mount the React app
ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <GlobalErrorBoundary>
      <AuthProvider>
        <App />
      </AuthProvider>
    </GlobalErrorBoundary>
  </React.StrictMode>
);

// ── Web Vitals Performance Monitoring ──
if (import.meta.env.DEV) {
  import("web-vitals").then(({ onCLS, onFID, onFCP, onLCP, onTTFB }) => {
    onCLS(console.log);
    onFID(console.log);
    onFCP(console.log);
    onLCP(console.log);
    onTTFB(console.log);
  });
}
