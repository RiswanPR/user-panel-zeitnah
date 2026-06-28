import axios from "axios";

declare global {
  interface ImportMetaEnv {
    readonly VITE_API_BASE_URL?: string;
  }

  interface ImportMeta {
    readonly env: ImportMetaEnv;
  }
}

const api = axios.create({
  // baseURL: import.meta.env.VITE_API_BASE_URL || "https://api.your-domain.com/api",
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://<SERVER_IP>:3000/api",
  headers: {
    "Content-Type": "application/json",
  },
});

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

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");

      if (window.location.pathname !== "/login") {
        window.location.assign("/login");
      }
    }

    return Promise.reject(error);
  },
);

export default api;
