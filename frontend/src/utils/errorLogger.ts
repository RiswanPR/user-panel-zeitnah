import { collectDiagnostics } from "./diagnostics";
import { storage } from "../services/storage";

export const logClientError = async (errorData: {
  message: string;
  code?: string;
  correlationId?: string;
  apiUrl?: string;
  httpStatus?: number;
  responseBody?: any;
  stack?: string;
  email?: string;
}) => {
  try {
    const diagnostics = await collectDiagnostics();
    
    // Attach API specific error info
    diagnostics.error = {
      ...diagnostics.error,
      name: "APIError",
      message: errorData.message,
      stack: errorData.stack,
      apiUrl: errorData.apiUrl,
      httpStatus: errorData.httpStatus,
      responseBody: errorData.responseBody,
      axiosErrorCode: errorData.code,
    };
    
    if (errorData.correlationId) {
      diagnostics.correlationId = errorData.correlationId;
    }

    const payload = {
      ...diagnostics,
      source: "api_failure",
      isSilent: true,
    };

    // Use raw fetch to avoid interceptor loops if api itself is failing
    const baseURL = import.meta.env.VITE_API_BASE_URL || "https://beta.zeitnahacademy.com/api";
    
    const token = await storage.getAccessToken();
    await fetch(`${baseURL}/error-reports`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "Authorization": `Bearer ${token}` } : {})
      },
      body: JSON.stringify(payload),
    });
  } catch (e) {
    console.error("Failed to log client error", e);
  }
};
