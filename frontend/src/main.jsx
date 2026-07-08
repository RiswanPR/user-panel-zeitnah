import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import "./App.css";
import { AuthProvider } from "./context/AuthContext";
import GlobalErrorBoundary from "./components/GlobalErrorBoundary";
import { collectDiagnostics } from "./utils/diagnostics";

// ── Version Control & Cache Invalidation ──
const APP_VERSION = import.meta.env.VITE_APP_VERSION || "1.0.0";
const cachedVersion = localStorage.getItem("app_version");

if (cachedVersion !== APP_VERSION) {
  console.log(`[Version] Upgrading from ${cachedVersion} to ${APP_VERSION}`);
  localStorage.setItem("app_version", APP_VERSION);
  
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
    window.location.reload(true);
  }
}

// ── Global Error Listeners (Outside React) ──
window.addEventListener("error", async (event) => {
  // Ignore resize observer errors which are often benign
  if (event.message === "ResizeObserver loop limit exceeded" || event.message === "ResizeObserver loop completed with undelivered notifications.") {
    return;
  }
  const diagnostics = await collectDiagnostics(event.error);
  diagnostics.source = "window_error";
  diagnostics.isSilent = true;
  
  try {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api"}/error-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(diagnostics)
    }).catch(() => {});
  } catch (e) {}
});

window.addEventListener("unhandledrejection", async (event) => {
  const diagnostics = await collectDiagnostics(event.reason instanceof Error ? event.reason : new Error(String(event.reason)));
  diagnostics.source = "unhandled_rejection";
  diagnostics.isSilent = true;

  try {
    const token = localStorage.getItem("token");
    fetch(`${import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api"}/error-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(diagnostics)
    }).catch(() => {});
  } catch (e) {}
});

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

// ── PWA Service Worker Registration ──
if ("serviceWorker" in navigator && import.meta.env.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/sw.js")
      .then((reg) => {
        console.log("[SW] Registered:", reg.scope);
      })
      .catch((err) => {
        console.warn("[SW] Registration failed:", err);
      });
  });
}

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
