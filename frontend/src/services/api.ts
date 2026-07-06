import axios from "axios";

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
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://<SERVER_IP>:3000/api",
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

    // Handle 401 — prevent redirect loops
    if (error.response?.status === 401 && !isRedirecting) {
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        isRedirecting = true;
        window.location.assign("/login");

        // Reset after navigation
        setTimeout(() => {
          isRedirecting = false;
        }, 3000);
      }
    }

    return Promise.reject(error);
  },
);

export default api;
