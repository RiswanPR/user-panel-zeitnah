import axios from "axios";
import { captureNetworkError } from "../utils/errorCapture";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
    readonly DEV?: boolean;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://beta.zeitnahacademy.com/api",
  headers: {
    "Content-Type": "application/json",
  },
  timeout: 30000, // 30s timeout
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

/* ── Request Interceptor ── */

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  // Performance: stamp start time for timing
  (config as any)._startTime = Date.now();

  return config;
});

/* ── Token Refresh Logic ── */

let isRefreshing = false;
let failedQueue: Array<{
  resolve: (value?: unknown) => void;
  reject: (reason?: unknown) => void;
}> = [];

const processQueue = (error: unknown, token: string | null = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) {
      reject(error);
    } else {
      resolve(token);
    }
  });
  failedQueue = [];
};

/* ── Response Interceptor ── */

let isRedirecting = false;

api.interceptors.response.use(
  (response) => {
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
  async (error) => {
    const config = error.config;

    // Retry 5xx errors once (not for GET requests already handled by useApi)
    if (
      error.response?.status >= 500 &&
      config &&
      !config._retried &&
      config.method !== "get"
    ) {
      config._retried = true;
      await new Promise((resolve) => setTimeout(resolve, 1000));
      return api(config);
    }

    // Handle 401 — attempt token refresh before logging out
    if (error.response?.status === 401 && config && !config._isRefreshRequest) {
      // If we're already refreshing, queue this request
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            config.headers.Authorization = `Bearer ${token}`;
            return api(config);
          })
          .catch((err) => Promise.reject(err));
      }

      const refreshToken = localStorage.getItem("refreshToken");

      // No refresh token available — go straight to logout
      if (!refreshToken) {
        forceLogout();
        return Promise.reject(error);
      }

      isRefreshing = true;

      try {
        // Call the refresh endpoint
        const res = await api.post(
          "/auth/refresh-token",
          { refreshToken },
          { _isRefreshRequest: true } as any,
        );

        const newAccessToken = res.data.accessToken || res.data.token;
        const newRefreshToken = res.data.refreshToken;

        // Persist the new tokens
        if (newAccessToken) {
          localStorage.setItem("token", newAccessToken);
        }
        if (newRefreshToken) {
          localStorage.setItem("refreshToken", newRefreshToken);
        }

        // Process queued requests with the new token
        processQueue(null, newAccessToken);

        // Retry the original failed request
        config.headers.Authorization = `Bearer ${newAccessToken}`;
        return api(config);
      } catch (refreshError) {
        // Refresh failed — token is truly expired, force logout
        processQueue(refreshError, null);
        forceLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // Capture network errors for troubleshoot reports
    // (skip capturing failures from the troubleshoot endpoint itself)
    if (config?.url && !config.url.includes('/troubleshoot/')) {
      captureNetworkError({
        method: (config.method || 'UNKNOWN').toUpperCase(),
        url: config.url || '',
        status: error.response?.status || 0,
        message:
          error.response?.data?.message ||
          error.message ||
          'Network error',
      });
    }

    return Promise.reject(error);
  },
);

/** Clear all auth tokens and redirect to login */
function forceLogout() {
  localStorage.removeItem("token");
  localStorage.removeItem("refreshToken");

  if (window.location.pathname !== "/login" && !isRedirecting) {
    isRedirecting = true;
    window.location.assign("/login");

    // Reset after navigation
    setTimeout(() => {
      isRedirecting = false;
    }, 3000);
  }
}

export default api;
