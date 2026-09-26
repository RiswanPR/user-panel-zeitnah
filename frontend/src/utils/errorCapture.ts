/**
 * Global Error Capture Utility
 * 
 * Intercepts console.error, console.warn, window.onerror, and
 * unhandled promise rejections. Stores them in a ring buffer
 * (max 50 entries) for use in troubleshoot reports.
 * 
 * console.warn is stored in a separate buffer and NOT counted
 * towards the visible error count to prevent inflating the
 * troubleshoot badge for minor warnings.
 */

import { collectDiagnostics } from './diagnostics';
import { storage } from '../services/storage';
import { isChunkLoadError } from './lazyWithRetry';

const MAX_BUFFER_SIZE = 50;

// ── Silent DB Persistence for Non-Critical Captured Errors ──
const DEDUPE_WINDOW_MS = 30000; // 30s deduplication window per unique signature
const MAX_REPORTS_PER_MINUTE = 10;
const recentErrorSignatures = new Map<string, number>();
let minuteWindowStart = Date.now();
let reportsInLastMinute = 0;
let isReportingActive = false;

/**
 * Silently saves captured non-critical errors into the database via /error-reports.
 * Deduplicates repeated logs and rate limits to prevent spamming the backend.
 * Never throws or invokes console.error to avoid infinite recursion.
 */
export async function silentlySaveCapturedErrorToDb({
  type,
  message,
  stack,
  source,
  status,
  url,
  priority = 'low',
}: {
  type: string;
  message: string;
  stack?: string;
  source?: string;
  status?: number;
  url?: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
}) {
  if (typeof window === 'undefined') return;
  if (isReportingActive) return;

  const msgStr = String(message || '');
  const urlStr = String(url || '');

  // Never capture or report errors originating from error reporting endpoints themselves
  if (
    msgStr.includes('/error-reports') ||
    msgStr.includes('/troubleshoot') ||
    urlStr.includes('/error-reports') ||
    urlStr.includes('/troubleshoot')
  ) {
    return;
  }

  // Deduplication check: key by type + initial message segment + status + source
  const signature = `${type}:${msgStr.substring(0, 120)}:${status || 0}:${source || ''}`;
  const nowMs = Date.now();
  const lastReported = recentErrorSignatures.get(signature);

  if (lastReported && nowMs - lastReported < DEDUPE_WINDOW_MS) {
    return; // Duplicate within 30s window, silently skip
  }

  // Rate limiting check
  if (nowMs - minuteWindowStart > 60000) {
    minuteWindowStart = nowMs;
    reportsInLastMinute = 0;
  }
  if (reportsInLastMinute >= MAX_REPORTS_PER_MINUTE) {
    return; // Rate limit exceeded for this minute
  }

  // Prune signatures map
  if (recentErrorSignatures.size > 200) {
    for (const [key, ts] of recentErrorSignatures.entries()) {
      if (nowMs - ts > DEDUPE_WINDOW_MS * 2) {
        recentErrorSignatures.delete(key);
      }
    }
  }

  recentErrorSignatures.set(signature, nowMs);
  reportsInLastMinute++;

  try {
    isReportingActive = true;
    const diagnostics = await collectDiagnostics();
    const token = await storage.getAccessToken();
    const baseURL = import.meta.env.VITE_API_BASE_URL || 'https://zeitnahacademy.com/api';

    const payload = {
      ...diagnostics,
      source: type || 'captured_client_error',
      priority,
      isSilent: true,
      error: {
        name: type,
        message: msgStr.substring(0, 1000),
        stack: stack ? String(stack).substring(0, 3000) : undefined,
        source: source ? String(source).substring(0, 500) : undefined,
        status,
        url: urlStr,
        isNonCritical: priority !== 'critical',
      },
    };

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    await fetch(`${baseURL}/error-reports`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
  } catch {
    // Completely silent — never invoke console.error to avoid infinite recursion
  } finally {
    isReportingActive = false;
  }
}

// Error buffers — warnings are separated from real errors
const consoleErrors: any[] = [];
const consoleWarnings: any[] = [];
const networkErrors: any[] = [];
const unhandledErrors: any[] = [];

let initialized = false;

// ── Helpers ──

function now() {
  return new Date().toISOString();
}

function safeStringify(val: any) {
  if (val === null || val === undefined) return String(val);
  if (typeof val === 'string') return val;
  if (val instanceof Error) return val.message || val.toString();
  try {
    return JSON.stringify(val, null, 0)?.substring(0, 500) || String(val);
  } catch {
    return String(val);
  }
}

function pushWithLimit(arr: any[], item: any) {
  arr.push(item);
  if (arr.length > MAX_BUFFER_SIZE) arr.shift();
}

/**
 * Detect errors originating from browser extensions (MetaMask, etc.).
 * These are not application bugs and should be excluded from reports.
 */
function isBrowserExtensionNoise(messageOrStack: unknown) {
  const str = String(messageOrStack || '');
  const extProtocols = ['chrome-extension://', 'moz-extension://', 'safari-extension://'];
  if (extProtocols.some((p) => str.includes(p))) return true;
  if (/failed to connect to metamask/i.test(str)) return true;
  return false;
}

/**
 * Detect noisy console messages that are not actual application errors.
 * These include React dev-mode warnings, HMR/Vite messages, slow API
 * logs, service worker registration, and similar development noise.
 */
function isConsoleNoise(message: string): boolean {
  const noisePatterns = [
    // React dev-mode warnings
    /^Warning:/,
    /react-dom\.development/i,
    /ReactDOM\.render is no longer supported/i,
    /Each child in a list should have a unique/,
    /Cannot update a component/,
    /Can't perform a React state update on an unmounted component/i,
    // HMR / Vite / build tool messages
    /\[HMR\]/,
    /\[vite\]/i,
    /\[hmr\]/,
    /hot module replacement/i,
    // Service worker noise
    /\[SW\]/,
    /service.?worker/i,
    // Own API interceptor slow request warnings
    /\[API\] Slow request:/,
    /\[API\] Retrying request/,
    // Version control logs
    /\[Version\]/,
    // Web Vitals dev-mode console logs
    /^{name:"(CLS|FCP|LCP|TTFB|INP|FID)"/,
    // ResizeObserver benign warnings
    /ResizeObserver loop/i,
    // Browser deprecation notices
    /\[Deprecation\]/i,
    // Socket / WebSocket recoverable connection noise
    /\[Socket.*\] Connection error/i,
    /\[Socket.*\] Connection note/i,
    /\[Socket.*\] reconnect/i,
    /websocket error/i,
    /WebSocket connection to .* failed/i,
    /socket\.io/i,
    /xhr poll error/i,
    // Native notification push token cleanup on logout
    /\[NativeNotifications\].*push token/i,
    // Dynamic import / chunk loading errors being recovered
    /Failed to fetch dynamically imported module/i,
    /error loading dynamically imported module/i,
    /Importing a module script failed/i,
    /Loading chunk [\d]+ failed/i,
    /ChunkLoadError/i,
  ];
  return noisePatterns.some((pattern) => pattern.test(message));
}

// ── Console Interceptors ──

const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

function interceptConsole() {
  console.error = (...args) => {
    const message = args.map(safeStringify).join(' ');
    // Skip noise — don't pollute the error buffer with dev-mode or framework messages
    if (!isConsoleNoise(message) && !isBrowserExtensionNoise(message)) {
      const errorEntry = {
        type: 'error',
        message,
        timestamp: now(),
        stack: args.find((a) => a instanceof Error)?.stack || '',
      };
      pushWithLimit(consoleErrors, errorEntry);
      // Automatically persist captured non-critical console error to DB silently
      silentlySaveCapturedErrorToDb({
        type: 'console_error',
        message,
        stack: errorEntry.stack,
        priority: 'low',
      });
    }
    originalConsoleError.apply(console, args);
  };

  console.warn = (...args) => {
    const message = args.map(safeStringify).join(' ');
    // Warnings go into a separate buffer and are NOT counted as errors
    if (!isConsoleNoise(message) && !isBrowserExtensionNoise(message)) {
      pushWithLimit(consoleWarnings, {
        type: 'warn',
        message,
        timestamp: now(),
      });
    }
    originalConsoleWarn.apply(console, args);
  };
}

// ── Global Error Handlers ──

function interceptGlobalErrors() {
  // Uncaught exceptions
  window.addEventListener('error', (event) => {
    // Skip errors from browser extensions or recoverable chunk loading mismatches
    if (
      isBrowserExtensionNoise(event.message) ||
      isBrowserExtensionNoise(event.filename) ||
      isBrowserExtensionNoise(event.error?.stack) ||
      isChunkLoadError(event.error || event.message)
    ) {
      return;
    }
    const entry = {
      type: 'uncaught_exception',
      message: event.message || 'Unknown error',
      timestamp: now(),
      stack: event.error?.stack || '',
      source: event.filename
        ? `${event.filename}:${event.lineno}:${event.colno}`
        : '',
    };
    pushWithLimit(unhandledErrors, entry);
    // Automatically persist captured non-critical window error to DB silently
    silentlySaveCapturedErrorToDb({
      type: 'window_error',
      message: entry.message,
      stack: entry.stack,
      source: entry.source,
      priority: 'medium',
    });
  });

  // Unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const reason = event.reason;
    const msg = reason instanceof Error ? reason.message : safeStringify(reason);
    const stack = reason instanceof Error ? reason.stack || '' : '';
    // Skip rejections from browser extensions or recoverable chunk loading mismatches
    if (
      isBrowserExtensionNoise(msg) ||
      isBrowserExtensionNoise(stack) ||
      isChunkLoadError(reason)
    ) {
      return;
    }
    const entry = {
      type: 'unhandled_rejection',
      message: msg,
      timestamp: now(),
      stack,
    };
    pushWithLimit(unhandledErrors, entry);
    // Automatically persist captured non-critical promise rejection to DB silently
    silentlySaveCapturedErrorToDb({
      type: 'unhandled_rejection',
      message: entry.message,
      stack: entry.stack,
      priority: 'medium',
    });
  });
}

// ── Public API ──

export type ErrorCategory =
  | 'EXPECTED_AUTH'
  | 'RECOVERABLE_AUTH'
  | 'USER_ACTION_ERROR'
  | 'REAL_APPLICATION_ERROR'
  | 'NETWORK_TRANSIENT'
  | 'WEBSOCKET_TRANSIENT'
  | 'EXTERNAL_BROWSER_NOISE';

export interface CapturedNetworkError {
  method: string;
  url: string;
  status: number;
  message: string;
  category: ErrorCategory;
  timestamp: string;
}

/**
 * Explicit classification for network responses to avoid false alerts
 */
export function classifyNetworkError({
  method,
  url,
  status,
  message,
}: {
  method?: string;
  url?: string;
  status?: number;
  message?: string;
}): ErrorCategory {
  const cleanUrl = url || '';
  const msg = message || '';

  // 1. Expected auth checks: /auth/me when unauthenticated or session check
  if (status === 401 && cleanUrl.includes('/auth/me')) {
    return 'EXPECTED_AUTH';
  }

  // 2. Expected expired refresh token or logout push-token unregistration
  if ((status === 401 || status === 403) && (cleanUrl.includes('/auth/refresh-token') || cleanUrl.includes('/notifications/push-token'))) {
    return 'EXPECTED_AUTH';
  }

  // 3. Recoverable auth: 401 on regular endpoints (refreshed by Axios interceptor)
  if (status === 401) {
    return 'RECOVERABLE_AUTH';
  }

  // 4. User action errors: validation, duplicate entry, client input
  if (status === 400 || status === 409 || status === 422) {
    return 'USER_ACTION_ERROR';
  }

  // 5. Expected 404s (e.g., username availability checks)
  if (status === 404 && (cleanUrl.includes('/availability') || cleanUrl.includes('/check-username'))) {
    return 'USER_ACTION_ERROR';
  }

  // 6. WebSocket transient connection/upgrade probe noise
  if (cleanUrl.includes('/socket.io/') || msg.includes('websocket') || msg.includes('Socket.IO')) {
    return 'WEBSOCKET_TRANSIENT';
  }

  // 7. Network transients: timeout, aborts, offline
  if (
    status === 0 ||
    status === 408 ||
    status === 504 ||
    msg.includes('timeout') ||
    msg.includes('Network Error') ||
    msg.includes('ERR_NETWORK') ||
    msg.includes('ECONNABORTED')
  ) {
    return 'NETWORK_TRANSIENT';
  }

  // 8. Real application failure: 5xx, or unexpected server responses
  return 'REAL_APPLICATION_ERROR';
}

/**
 * Initialize global error capture. Call once at app startup.
 */
export function initErrorCapture() {
  if (initialized) return;
  initialized = true;
  interceptConsole();
  interceptGlobalErrors();
}

/**
 * Push a network error (called from api.ts interceptor).
 */
export function captureNetworkError({
  method,
  url,
  status,
  message,
  category,
}: {
  method?: string;
  url?: string;
  status?: number;
  message?: string;
  category?: ErrorCategory;
}) {
  const resolvedCategory =
    category ||
    classifyNetworkError({
      method,
      url,
      status,
      message,
    });

  pushWithLimit(networkErrors, {
    method: method || 'UNKNOWN',
    url: url || '',
    status: status || 0,
    message: message || 'Network error',
    category: resolvedCategory,
    timestamp: now(),
  });

  // Automatically persist non-critical network application errors to DB silently
  if (
    resolvedCategory === 'REAL_APPLICATION_ERROR' ||
    (status && status >= 500)
  ) {
    silentlySaveCapturedErrorToDb({
      type: 'network_error',
      message: `${method || 'GET'} ${url || ''} -> ${status || 0}: ${message || 'Network error'}`,
      status,
      url,
      priority: 'medium',
    });
  }
}

/**
 * Get all captured errors and warnings (snapshot).
 * Warnings are included for completeness in reports but stored separately.
 */
export function getErrorBuffer() {
  return {
    consoleErrors: [...consoleErrors],
    consoleWarnings: [...consoleWarnings],
    networkErrors: [...networkErrors],
    unhandledErrors: [...unhandledErrors],
  };
}

/**
 * Get total error count across all buffers (includes warnings for report data).
 */
export function getErrorCount() {
  return consoleErrors.length + consoleWarnings.length + networkErrors.length + unhandledErrors.length;
}

/**
 * Get count of significant errors only.
 * Excludes console warnings, routine expected auth events, recovered 401s,
 * user validation errors, and transient websocket probes.
 * Use this to determine whether to show the troubleshoot badge.
 */
export function getSignificantErrorCount() {
  const significantNetworkErrors = networkErrors.filter(
    (e) => !e.category || e.category === 'REAL_APPLICATION_ERROR'
  );
  return consoleErrors.length + significantNetworkErrors.length + unhandledErrors.length;
}

/**
 * Check if there are any significant errors captured (excludes warnings and benign auth).
 */
export function hasErrors() {
  return getSignificantErrorCount() > 0;
}

/**
 * Clear all error buffers (after successful submission).
 */
export function clearErrorBuffer() {
  consoleErrors.length = 0;
  consoleWarnings.length = 0;
  networkErrors.length = 0;
  unhandledErrors.length = 0;
}

/**
 * Get browser info for the report.
 */
export function getBrowserInfo() {
  const ua = navigator.userAgent;
  let browser = 'Unknown';
  let os = 'Unknown';

  // Detect browser
  if (ua.includes('Firefox/')) browser = 'Firefox';
  else if (ua.includes('Edg/')) browser = 'Edge';
  else if (ua.includes('Chrome/')) browser = 'Chrome';
  else if (ua.includes('Safari/') && !ua.includes('Chrome')) browser = 'Safari';
  else if (ua.includes('Opera') || ua.includes('OPR/')) browser = 'Opera';

  // Detect OS
  if (ua.includes('Windows')) os = 'Windows';
  else if (ua.includes('Mac OS')) os = 'macOS';
  else if (ua.includes('Linux')) os = 'Linux';
  else if (ua.includes('Android')) os = 'Android';
  else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';

  return {
    browser,
    os,
    screenSize: `${window.screen.width}x${window.screen.height}`,
    userAgent: ua.substring(0, 300),
  };
}

/**
 * Determine if an error is critical (e.g. fatal React unmounting crash).
 * Non-critical error captures (console errors, non-fatal rejections, network errors)
 * are NOT critical and must not show UI to users; they only save in DB.
 */
export function isCriticalError(error: any): boolean {
  if (!error) return false;
  return error.priority === 'critical' || error.isFatal === true;
}

/**
 * Returns count of critical errors that require user attention.
 * Routine background captured errors are non-critical and return 0.
 */
export function getCriticalErrorCount(): number {
  return 0;
}
