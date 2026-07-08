import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { logClientError } from "../utils/errorLogger";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly DEV?: boolean;
    readonly VITE_APP_VERSION?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

// UUID v4 generator
const generateUUID = () => {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    const r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
};

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 15000, // Reduced from 30s to 15s to fail faster and retry
});

/* ── Types ── */
export type AuditLogFilters = {
  action?: string;
  entityType?: string;
  severity?: string;
  page?: number;
  limit?: number;
};

export const getAuditLogs = (filters: AuditLogFilters = {}) =>
  api.get("/audit-logs", {
    params: filters,
  });

/* ── Request Deduplication ── */
const pendingRequests = new Map<string, AbortController>();

const getRequestKey = (config: InternalAxiosRequestConfig) => {
  return `${config.method}:${config.url}:${JSON.stringify(config.data || {})}`;
};

/* ── Request Interceptor ── */
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Generate and attach correlation ID
  const correlationId = generateUUID();
  config.headers["x-correlation-id"] = correlationId;
  (config as any)._correlationId = correlationId;

  // Deduplication logic (prevent double clicking)
  if (config.method !== "get") {
    const requestKey = getRequestKey(config);
    if (pendingRequests.has(requestKey)) {
      // Abort previous request
      const controller = pendingRequests.get(requestKey);
      controller?.abort("Duplicate request cancelled");
    }
    const controller = new AbortController();
    config.signal = controller.signal;
    pendingRequests.set(requestKey, controller);
    (config as any)._requestKey = requestKey;
  }

  // Performance: stamp start time for timing
  (config as any)._startTime = Date.now();

  return config;
});

/* ── Response Interceptor ── */
let isRedirecting = false;

// Friendly error mapping
const getFriendlyErrorMessage = (error: AxiosError, isOffline: boolean): string => {
  if (isOffline) {
    return "You appear to be offline. Please check your internet connection.";
  }
  if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
    return "The request timed out. The server might be busy or your network is slow.";
  }
  if (error.code === "ERR_NETWORK") {
    return "Unable to connect to the server. Please check your internet connection or try again later.";
  }
  if (error.message === "Duplicate request cancelled" || error.code === "ERR_CANCELED") {
    return "Request cancelled to prevent duplicates.";
  }

  const status = error.response?.status;
  const data = error.response?.data as any;
  const backendMsg = data?.message;

  if (status) {
    switch (status) {
      case 400: return backendMsg || "Invalid request. Please check your input.";
      case 401: return backendMsg || "Your session has expired. Please log in again.";
      case 403: return backendMsg || "You do not have permission to perform this action.";
      case 404: return backendMsg || "The requested resource was not found.";
      case 408: return "The request took too long. Please try again.";
      case 409: return backendMsg || "There was a conflict with your request (e.g., duplicate entry).";
      case 422: return backendMsg || "Validation failed. Please verify your data.";
      case 429: return backendMsg || "You are making too many requests. Please wait a moment and try again.";
      case 500: return "We encountered an internal server error. Our team has been notified.";
      case 502: return "Bad Gateway. The server is currently unreachable.";
      case 503: return "Service is temporarily unavailable due to maintenance or overload.";
      case 504: return "Gateway timeout. The server took too long to respond.";
      default: return backendMsg || `Unexpected error occurred (Code: ${status}).`;
    }
  }

  // Check for invalid JSON parsing if status isn't available
  if (error.message.includes("Unexpected token") || error.message.includes("JSON")) {
    return "Received an invalid response from the server.";
  }

  return "Something went wrong. Please try again.";
};

api.interceptors.response.use(
  (response) => {
    // Clear deduplication
    const requestKey = (response.config as any)?._requestKey;
    if (requestKey) {
      pendingRequests.delete(requestKey);
    }

    // Log slow requests in development
    const startTime = (response.config as any)?._startTime;
    if (startTime && import.meta.env.DEV) {
      const duration = Date.now() - startTime;
      if (duration > 2000) {
        console.warn(`[API] Slow request: ${response.config.url} took ${duration}ms`);
      }
    }
    return response;
  },
  async (error: AxiosError) => {
    const config = error.config as any;

    // Clear deduplication tracking
    if (config?._requestKey) {
      pendingRequests.delete(config._requestKey);
    }

    // Don't retry if request was cancelled (duplicate)
    if (error.code === "ERR_CANCELED" || error.message === "Duplicate request cancelled") {
      return Promise.reject({ friendlyMessage: getFriendlyErrorMessage(error, false), isCancelled: true });
    }

    const isNetworkOr5xx = !error.response || (error.response?.status >= 500);
    const isOffline = !navigator.onLine;

    // Retry once for network failures or 5xx errors (only for non-GET requests)
    if (
      !isOffline &&
      isNetworkOr5xx &&
      config &&
      !config._retried &&
      config.method !== "get"
    ) {
      config._retried = true;
      console.warn(`[API] Retrying request ${config.url} due to ${error.code || error.response?.status}`);
      await new Promise((resolve) => setTimeout(resolve, 1500)); // wait 1.5s
      return api(config); // retry
    }

    // Handle 401 — prevent redirect loops
    if (error.response?.status === 401 && !isRedirecting) {
      localStorage.removeItem("token");
      if (window.location.pathname !== "/login") {
        isRedirecting = true;
        window.location.assign("/login");
        setTimeout(() => {
          isRedirecting = false;
        }, 3000);
      }
    }

    // Determine friendly message
    const friendlyMessage = getFriendlyErrorMessage(error, isOffline);

    // Only log to backend if it's an auth route, or maybe log all 5xx / Network errors
    if ((config?.url?.includes("/auth/") || (error.response && error.response.status >= 500) || !error.response) && !isOffline) {
      // Fire and forget logging
      logClientError({
        message: error.message,
        code: error.code,
        correlationId: config?._correlationId,
        apiUrl: config?.url,
        httpStatus: error.response?.status,
        responseBody: error.response?.data,
        stack: error.stack,
      });
    }

    // Reject with a structured object that UI components can easily read
    return Promise.reject({
      ...error,
      friendlyMessage,
      correlationId: config?._correlationId,
      isOffline
    });
  },
);

export default api;
